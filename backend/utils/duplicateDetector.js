/**
 * 重复题目检测（按题库 bankId 隔离）
 */

const Question = require('../models/Question');
const { computeContentHash } = require('./contentHash');

function normalizeText(text) {
  if (!text) return '';

  let normalized = text.replace(/<[^>]+>/g, '');
  normalized = normalized.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  normalized = normalized.replace(/\\[a-zA-Z]+/g, '');
  normalized = normalized.replace(/\$\$?[^$]*\$\$?/g, '');
  normalized = normalized.replace(/\\\[[^\]]*\\\]/g, '');
  normalized = normalized.replace(/\\\([^\)]*\\\)/g, '');
  normalized = normalized.replace(/\s+/g, '').toLowerCase();
  normalized = normalized.replace(/[，。、；：！？,.;:!?]/g, '');

  return normalized;
}

function calculateSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (norm1.length === 0 && norm2.length === 0) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  if (norm1 === norm2) return 1;

  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;

  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  let matches = 0;
  const charCount1 = {};
  const charCount2 = {};

  for (const char of norm1) {
    charCount1[char] = (charCount1[char] || 0) + 1;
  }
  for (const char of norm2) {
    charCount2[char] = (charCount2[char] || 0) + 1;
  }

  for (const char in charCount1) {
    if (charCount2[char]) {
      matches += Math.min(charCount1[char], charCount2[char]);
    }
  }

  const totalChars = Math.max(norm1.length, norm2.length);
  return matches / totalChars;
}

/** @param {string} normalized */
function lengthBucket(normalized) {
  const len = normalized.length;
  if (len === 0) return 0;
  return Math.floor(Math.log2(len + 1));
}

/** @param {{ subject?: string, questionText?: string, originalLaTeX?: string }} q */
function bucketKey(q) {
  const subject = (q.subject || '').trim() || '_';
  const norm = normalizeText(q.originalLaTeX || q.questionText || '');
  const prefix = norm.slice(0, 32);
  return `${subject}|${lengthBucket(norm)}|${prefix}`;
}

function unionFind(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function unite(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }
  return { find, unite };
}

/**
 * @param {import('mongoose').Types.ObjectId} bankId
 */
async function findExactDuplicateGroups(bankId) {
  const rows = await Question.aggregate([
    { $match: { bankId, contentHash: { $nin: [null, ''] } } },
    {
      $group: {
        _id: '$contentHash',
        count: { $sum: 1 },
        questionIds: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  const groups = [];
  for (const row of rows) {
    const questions = await Question.find({ _id: { $in: row.questionIds } })
      .select('_id questionText type subject originalLaTeX contentHash createdAt bankId')
      .sort({ createdAt: 1 })
      .lean();
    groups.push({
      matchKind: 'exact_hash',
      contentHash: row._id,
      questions,
    });
  }
  return groups;
}

/**
 * 近似重复：按 subject + 长度桶 + 文本前缀分桶，桶内并查集合并，避免全库 O(n²)。
 * @param {import('mongoose').Types.ObjectId} bankId
 * @param {Set<string>} excludeIds 已归入 exact 组的题目 id
 */
async function findNearDuplicateGroups(bankId, threshold = 0.85, excludeIds = new Set()) {
  const allQuestions = await Question.find({ bankId })
    .select('_id questionText type subject originalLaTeX createdAt contentHash')
    .lean();

  const candidates = allQuestions.filter((q) => !excludeIds.has(String(q._id)));
  const buckets = new Map();

  for (const q of candidates) {
    const key = bucketKey(q);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(q);
  }

  const nearGroups = [];
  const assignedNear = new Set();

  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;

    const uf = unionFind(bucket.length);
    for (let i = 0; i < bucket.length; i++) {
      const normI = normalizeText(bucket[i].originalLaTeX || bucket[i].questionText || '');
      if (!normI) continue;
      for (let j = i + 1; j < bucket.length; j++) {
        const normJ = normalizeText(bucket[j].originalLaTeX || bucket[j].questionText || '');
        if (!normJ) continue;
        const lenRatio = Math.min(normI.length, normJ.length) / Math.max(normI.length, normJ.length);
        if (lenRatio < 0.5) continue;
        const sim = calculateSimilarity(
          bucket[i].questionText || '',
          bucket[j].questionText || '',
        );
        if (sim >= threshold) {
          uf.unite(i, j);
        }
      }
    }

    const clusters = new Map();
    for (let i = 0; i < bucket.length; i++) {
      const root = uf.find(i);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root).push(bucket[i]);
    }

    for (const cluster of clusters.values()) {
      if (cluster.length < 2) continue;
      const ids = cluster.map((q) => String(q._id));
      if (ids.some((id) => assignedNear.has(id))) continue;
      ids.forEach((id) => assignedNear.add(id));
      cluster.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      nearGroups.push({
        matchKind: 'similar',
        contentHash: null,
        questions: cluster,
      });
    }
  }

  return nearGroups;
}

/**
 * @param {import('mongoose').Types.ObjectId} bankId
 */
async function findAllDuplicatesInBank(bankId, threshold = 0.85) {
  const exactGroups = await findExactDuplicateGroups(bankId);
  const exactIds = new Set();
  exactGroups.forEach((g) => {
    g.questions.forEach((q) => exactIds.add(String(q._id)));
  });
  const nearGroups = await findNearDuplicateGroups(bankId, threshold, exactIds);
  return { exactGroups, nearGroups, duplicateGroups: [...exactGroups, ...nearGroups] };
}

async function findDuplicates(question, threshold = 0.85, bankId = null) {
  if (!question.questionText && !question.originalLaTeX) {
    return [];
  }
  if (!bankId) {
    return [];
  }

  const duplicates = [];
  const hash = computeContentHash(question);
  if (hash) {
    const exactQuery = {
      bankId,
      contentHash: hash,
    };
    if (question._id) {
      exactQuery._id = { $ne: question._id };
    }
    const exactMatches = await Question.find(exactQuery)
      .select('_id questionText type subject originalLaTeX bankId contentHash')
      .lean();
    for (const existingQuestion of exactMatches) {
      duplicates.push({
        question: existingQuestion,
        similarity: 1,
        matchType: 'exact_hash',
      });
    }
    if (duplicates.length > 0) {
      return duplicates;
    }
  }

  const subject = question.subject || null;
  const query = { bankId };
  if (subject) query.subject = subject;

  const candidates = await Question.find(query)
    .select('_id questionText type subject originalLaTeX bankId')
    .lean();

  const normQ = normalizeText(question.originalLaTeX || question.questionText || '');

  for (const existingQuestion of candidates) {
    if (question._id && existingQuestion._id.toString() === question._id.toString()) {
      continue;
    }
    const normE = normalizeText(existingQuestion.originalLaTeX || existingQuestion.questionText || '');
    if (!normQ || !normE) continue;
    const lenRatio = Math.min(normQ.length, normE.length) / Math.max(normQ.length, normE.length);
    if (lenRatio < 0.5) continue;

    const similarity = calculateSimilarity(
      question.questionText || '',
      existingQuestion.questionText || '',
    );

    if (similarity >= threshold) {
      duplicates.push({
        question: existingQuestion,
        similarity,
        matchType: similarity === 1 ? 'exact' : 'similar',
      });
    }
  }

  duplicates.sort((a, b) => b.similarity - a.similarity);
  return duplicates;
}

async function detectDuplicatesInBatch(questions, threshold = 0.85, bankId = null) {
  const results = {
    duplicates: [],
    unique: [],
  };

  for (const question of questions) {
    const duplicates = await findDuplicates(question, threshold, bankId);
    if (duplicates.length > 0) {
      results.duplicates.push({
        question,
        duplicates,
      });
    } else {
      results.unique.push(question);
    }
  }

  return results;
}

/** @deprecated 使用 findAllDuplicatesInBank */
async function findAllDuplicates(threshold = 0.85) {
  const allQuestions = await Question.find({}).select('_id questionText type subject originalLaTeX createdAt');
  const processed = new Set();
  const duplicateGroups = [];

  for (let i = 0; i < allQuestions.length; i++) {
    if (processed.has(i)) continue;

    const question1 = allQuestions[i];
    const group = [question1];

    for (let j = i + 1; j < allQuestions.length; j++) {
      if (processed.has(j)) continue;

      const question2 = allQuestions[j];
      const similarity = calculateSimilarity(
        question1.questionText || '',
        question2.questionText || '',
      );

      if (similarity >= threshold) {
        group.push(question2);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      duplicateGroups.push(group);
      processed.add(i);
    }
  }

  return duplicateGroups;
}

function formatGroupsForApi(duplicateGroups) {
  return duplicateGroups.map((group, index) => ({
    groupId: index,
    matchKind: group.matchKind || 'similar',
    contentHash: group.contentHash || null,
    questions: group.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      type: q.type,
      subject: q.subject,
      contentHash: q.contentHash,
      createdAt: q.createdAt,
    })),
  }));
}

module.exports = {
  normalizeText,
  calculateSimilarity,
  bucketKey,
  lengthBucket,
  findDuplicates,
  detectDuplicatesInBatch,
  findAllDuplicates,
  findExactDuplicateGroups,
  findNearDuplicateGroups,
  findAllDuplicatesInBank,
  formatGroupsForApi,
};
