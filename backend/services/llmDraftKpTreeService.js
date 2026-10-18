const Question = require('../models/Question');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const { chatCompletionJson } = require('./llmChatClient');
const { DEFAULT_LLM_MODEL, DEFAULT_LLM_TIMEOUT_MS } = require('./llmProviderResolve');

const KP_IMPORT_FORMAT = 'mathexam-kp-import-v1';

function normalizeDraftNodes(rawNodes, subject) {
  if (!Array.isArray(rawNodes)) return [];
  const subj = String(subject || '数学').trim();
  return rawNodes
    .map((n, index) => {
      const name = String(n.name || '').trim();
      if (!name) return null;
      let path = String(n.path || '').trim();
      if (!path) {
        const parentPath = String(n.parentPath || '').trim();
        path = parentPath ? `${parentPath.replace(/\/$/, '')}/${name}` : `/${subj}/${name}`;
      }
      if (!path.startsWith('/')) path = `/${path}`;
      return {
        name,
        parentPath: String(n.parentPath || '').trim() || null,
        path,
        order: n.order != null ? Number(n.order) : index,
      };
    })
    .filter(Boolean);
}

function validateDraftTree(raw, fallbackSubject) {
  if (!raw || typeof raw !== 'object') return null;
  const subject = String(raw.subject || fallbackSubject || '数学').trim();
  const nodes = normalizeDraftNodes(raw.nodes, subject);
  return {
    format: KP_IMPORT_FORMAT,
    subject,
    nodes,
    rationale: typeof raw.rationale === 'string' ? raw.rationale.slice(0, 1000) : undefined,
    source: 'llm',
  };
}

async function buildQuestionCorpus(bankId, { subject, maxQuestions = 40 } = {}) {
  const filter = activeQuestionFilter({ bankId });
  if (subject) filter.subject = String(subject).trim();
  const rows = await Question.find(filter)
    .select('questionText type subject difficulty')
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(maxQuestions, 5), 120))
    .lean();
  return rows.map((q, i) => ({
    index: i + 1,
    type: q.type,
    subject: q.subject,
    difficulty: q.difficulty,
    stem: String(q.questionText || '').slice(0, 400),
  }));
}

async function draftKnowledgePointTree(bankId, settings, opts = {}) {
  const provider = settings?.llmProvider || 'mock';
  const subject = opts.subject || '';
  const corpus = await buildQuestionCorpus(bankId, { subject, maxQuestions: opts.maxQuestions });

  if (provider === 'mock') {
    const subj = subject || corpus[0]?.subject || '数学';
    return {
      format: KP_IMPORT_FORMAT,
      subject: subj,
      nodes: [
        { name: subj, parentPath: null, path: `/${subj}`, order: 0 },
        { name: '综合', parentPath: `/${subj}`, path: `/${subj}/综合`, order: 1 },
      ],
      source: 'heuristic',
      sampleQuestionCount: corpus.length,
    };
  }

  const apiKey = settings.llmApiKey;
  if (!apiKey) throw new Error('LLM API key not configured');

  const system = [
    '你是数学题库助教。根据样本题目，草稿化章节/知识点树供人工审核后再导入。',
    `输出 JSON：{"format":"${KP_IMPORT_FORMAT}","subject":"科目","nodes":[{"name":"节点名","parentPath":"/父路径或null","path":"/完整/path","order":0}],"rationale":"说明"}`,
    'path 以 / 开头；parentPath 为 null 表示根下直接子节点；不要编造题目中未暗示的过多细枝节点。',
  ].join('\n');
  const user = JSON.stringify({
    subjectHint: subject || null,
    sampleQuestions: corpus,
  });

  const raw = await chatCompletionJson({
    baseUrl: settings.llmApiBaseUrl,
    apiKey,
    model: settings.llmModel || DEFAULT_LLM_MODEL,
    system,
    user,
    timeoutMs: settings.llmTimeoutMs || DEFAULT_LLM_TIMEOUT_MS,
  });

  const validated = validateDraftTree(raw, subject || corpus[0]?.subject);
  if (!validated) {
    throw new Error('LLM returned invalid draft KP tree');
  }
  validated.sampleQuestionCount = corpus.length;
  return validated;
}

module.exports = {
  draftKnowledgePointTree,
  validateDraftTree,
  KP_IMPORT_FORMAT,
};
