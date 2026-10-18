const { normalizeDifficulty, DIFFICULTY_VALUES } = require('../constants/difficulty');
const { chatCompletionJson } = require('./llmChatClient');
const { DEFAULT_LLM_MODEL, DEFAULT_LLM_TIMEOUT_MS } = require('./llmProviderResolve');
const { sumStepScoresForQuestion } = require('../utils/stepScoreUtils');

const ANSWER_SOLUTION_MAX_CHARS = 3000;
const STEM_MAX_CHARS = 4000;

function truncateText(value, max) {
  const s = String(value ?? '');
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function formatAnswerAndSolution(input) {
  const parts = [];
  if (input.correctAnswer != null && input.correctAnswer !== '') {
    const ca = Array.isArray(input.correctAnswer)
      ? input.correctAnswer.join('\n')
      : String(input.correctAnswer);
    parts.push(`参考答案：\n${ca}`);
  }
  if (input.solution) {
    parts.push(`解答过程：\n${String(input.solution)}`);
  }
  return truncateText(parts.join('\n\n'), ANSWER_SOLUTION_MAX_CHARS);
}

function buildQuestionMetadataInput(question, knowledgePoints) {
  const q = question || {};
  const stepInfo = sumStepScoresForQuestion(q);
  return {
    questionText: q.questionText,
    type: q.type,
    subject: q.subject,
    options: q.options,
    totalScore: q.totalScore,
    stepScoreSum: stepInfo.sum,
    stepScores: stepInfo.scores,
    correctAnswer: q.correctAnswer,
    solution: q.solution,
    knowledgePoints,
  };
}

function buildLlmUserPayload(input) {
  const kpCatalog = buildKpCatalog(input.knowledgePoints);
  return {
    questionText: truncateText(input.questionText, STEM_MAX_CHARS),
    type: input.type,
    subject: input.subject,
    options: input.options ?? null,
    totalScore: input.totalScore ?? null,
    stepScoreSum: input.stepScoreSum ?? null,
    stepScores: input.stepScores?.length ? input.stepScores : null,
    answerAndSolution: formatAnswerAndSolution(input),
    knowledgePointCatalog: kpCatalog,
  };
}

async function suggestQuestionMetadata(input, settings) {
  const provider = settings?.llmProvider || 'mock';
  if (provider === 'mock') {
    return suggestWithHeuristic(input);
  }
  if (provider === 'openai_compatible') {
    try {
      const fromApi = await suggestWithChatApi(input, settings);
      if (fromApi) return fromApi;
      return {
        ...suggestWithHeuristic(input),
        source: 'heuristic',
        llmError: 'LLM returned invalid or empty response',
      };
    } catch (err) {
      return {
        ...suggestWithHeuristic(input),
        source: 'heuristic',
        llmError: err.message,
      };
    }
  }
  return suggestWithHeuristic(input);
}

function buildKpCatalog(knowledgePoints) {
  const rows = (knowledgePoints || []).map((k) => {
    const path = k.path || k.name || '';
    const depth = path.replace(/^\//, '').split('/').filter(Boolean).length;
    return {
      id: String(k._id),
      path,
      depth,
      objective: k.objective ? truncateText(k.objective, 300) : undefined,
      description: k.description ? truncateText(k.description, 300) : undefined,
      tags: (k.tags && k.tags.length) ? k.tags : undefined,
      cognitiveLevel: k.cognitiveLevel || undefined,
      category: k.category || undefined,
    };
  });
  for (const r of rows) {
    const prefix = r.path.endsWith('/') ? r.path : `${r.path}/`;
    r.isLeaf = !rows.some((o) => o.path !== r.path && o.path.startsWith(prefix));
  }
  return rows;
}

function filterLeafKnowledgePoints(knowledgePoints) {
  const catalog = buildKpCatalog(knowledgePoints);
  const leafIds = new Set(catalog.filter((c) => c.isLeaf).map((c) => c.id));
  return (knowledgePoints || []).filter((k) => leafIds.has(String(k._id)));
}

function buildCompactLeafKpCatalog(knowledgePoints) {
  return buildKpCatalog(knowledgePoints)
    .filter((c) => c.isLeaf)
    .map((c) => ({
      id: c.id,
      path: c.path,
      objective: c.objective,
      description: c.description,
    }));
}

function validateSuggestion(raw, kpCatalog) {
  if (!raw || typeof raw !== 'object') return null;
  const difficulty = normalizeDifficulty(raw.difficulty, '');
  if (!DIFFICULTY_VALUES.includes(difficulty)) return null;
  const allowed = new Set(kpCatalog.map((k) => k.id));
  let knowledgePointIds = [];
  if (Array.isArray(raw.knowledgePointIds)) {
    knowledgePointIds = raw.knowledgePointIds.map(String).filter((id) => allowed.has(id));
  } else if (raw.knowledgePointId && allowed.has(String(raw.knowledgePointId))) {
    knowledgePointIds = [String(raw.knowledgePointId)];
  }
  return {
    difficulty,
    knowledgePointIds,
    source: 'llm',
    rationale: typeof raw.rationale === 'string' ? raw.rationale.slice(0, 500) : undefined,
  };
}

async function suggestWithChatApi(input, settings) {
  const apiKey = settings.llmApiKey;
  const baseUrl = settings.llmApiBaseUrl || 'https://api.openai.com/v1';
  const model = settings.llmModel || process.env.LLM_MODEL || process.env.SILICONFLOW_MODEL || DEFAULT_LLM_MODEL;
  if (!apiKey) {
    throw new Error('LLM API key not configured');
  }
  const kpCatalog = buildKpCatalog(input.knowledgePoints);
  const system = [
    '你是数学题库助教。请综合题干、参考答案/解答过程、分值（含分步 \\score 小分）、题型与选项，',
    '从给定知识点目录中选择 0–2 个最相关节点，并评估难度（易/中/难），给出简短理由。',
    '只输出 JSON 对象：{"difficulty":"易|中|难","knowledgePointIds":["id",...],"rationale":"简短理由"}',
    'knowledgePointIds 必须来自目录中的 id，若无合适节点则返回空数组。',
  ].join('\n');
  const user = JSON.stringify(buildLlmUserPayload(input));
  const raw = await chatCompletionJson({
    baseUrl,
    apiKey,
    model,
    system,
    user,
    timeoutMs: settings.llmTimeoutMs || DEFAULT_LLM_TIMEOUT_MS,
  });
  return validateSuggestion(raw, kpCatalog);
}

function suggestWithHeuristic(input) {
  const text = [
    String(input.questionText || ''),
    formatAnswerAndSolution(input),
  ].join('\n');
  let difficulty = '中';
  if (/证明|推导/.test(text)) difficulty = '难';
  if (/判断|是否/.test(text)) difficulty = '易';

  const kps = input.knowledgePoints || [];
  let knowledgePointIds = [];
  if (kps.length) {
    const subject = input.subject || '';
    const match = kps.find((k) => !subject || String(k.path || k.name || '').includes(subject)) || kps[0];
    if (match?._id) knowledgePointIds = [String(match._id)];
  }

  return {
    difficulty: normalizeDifficulty(difficulty, '中'),
    knowledgePointIds,
    source: 'heuristic',
  };
}

module.exports = {
  suggestQuestionMetadata,
  validateSuggestion,
  buildKpCatalog,
  buildCompactLeafKpCatalog,
  filterLeafKnowledgePoints,
  buildQuestionMetadataInput,
  buildLlmUserPayload,
  formatAnswerAndSolution,
};
