const { DIFFICULTY_VALUES, LEGACY_DIFFICULTY_MAP } = require('../../constants/difficulty');
const { extractImagesFromStem, imagesEqualIgnoringIds } = require('../../utils/questionImages');

const LEGACY_DIFFICULTY_LABELS = Object.keys(LEGACY_DIFFICULTY_MAP).filter(
  (k) => !DIFFICULTY_VALUES.includes(k),
);

/**
 * @param {import('mongoose').Document | Record<string, unknown>} doc
 */
function questionNeedsStemImageMigration(doc) {
  const beforeStem = doc.questionText || '';
  const extracted = extractImagesFromStem(beforeStem, doc.images || []);
  const stemChanged = extracted.stem !== beforeStem.trim();
  const imagesChanged = !imagesEqualIgnoringIds(extracted.images, doc.images || []);
  return stemChanged || imagesChanged;
}

/**
 * @param {string | null | undefined} difficulty
 */
function difficultyNeedsM2Migration(difficulty) {
  if (difficulty == null || String(difficulty).trim() === '') return true;
  const trimmed = String(difficulty).trim();
  if (DIFFICULTY_VALUES.includes(trimmed)) return false;
  if (LEGACY_DIFFICULTY_LABELS.includes(trimmed)) return true;
  return true;
}

/**
 * @param {import('mongoose').Model} Question
 * @param {import('mongoose').Model} User
 * @param {import('mongoose').Model} QuestionBank
 * @param {import('mongoose').Model} [KnowledgePoint]
 */
async function buildDatabaseHealthReport({ Question, User, QuestionBank, KnowledgePoint }) {
  const [userCount, bankCount, questionCount] = await Promise.all([
    User.countDocuments(),
    QuestionBank.countDocuments(),
    Question.countDocuments(),
  ]);

  const typeAgg = await Question.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const difficultyAgg = await Question.aggregate([
    { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const orphanBankFilter = { $or: [{ bankId: { $exists: false } }, { bankId: null }] };
  const missingContentHashFilter = {
    $or: [
      { contentHash: { $exists: false } },
      { contentHash: null },
      { contentHash: '' },
    ],
  };

  const [orphanQuestions, missingContentHash] = await Promise.all([
    Question.countDocuments(orphanBankFilter),
    Question.countDocuments(missingContentHashFilter),
  ]);

  let legacyDifficultyCount = 0;
  let stemImageMigrationPending = 0;
  const cursor = Question.find({}).select('questionText images difficulty contentHash bankId type').lean().cursor();
  for await (const doc of cursor) {
    if (difficultyNeedsM2Migration(doc.difficulty)) legacyDifficultyCount += 1;
    if (questionNeedsStemImageMigration(doc)) stemImageMigrationPending += 1;
  }

  let orphanKnowledgePoints = 0;
  if (KnowledgePoint) {
    orphanKnowledgePoints = await KnowledgePoint.countDocuments(orphanBankFilter);
  }

  const migrations = {
    stemImagesMigrated: stemImageMigrationPending === 0,
    stemImagesPendingCount: stemImageMigrationPending,
    difficultyV2Complete: legacyDifficultyCount === 0,
    difficultyLegacyCount: legacyDifficultyCount,
    contentHashPresent: missingContentHash === 0,
    contentHashMissingCount: missingContentHash,
    banksBound: orphanQuestions === 0 && orphanKnowledgePoints === 0,
    orphanQuestions,
    orphanKnowledgePoints,
  };

  return {
    ok: true,
    counts: {
      users: userCount,
      banks: bankCount,
      questions: questionCount,
    },
    questionsByType: Object.fromEntries(typeAgg.map((r) => [r._id || '(null)', r.count])),
    questionsByDifficulty: Object.fromEntries(
      difficultyAgg.map((r) => [r._id || '(null)', r.count]),
    ),
    migrations,
  };
}

module.exports = {
  buildDatabaseHealthReport,
  difficultyNeedsM2Migration,
  questionNeedsStemImageMigration,
};
