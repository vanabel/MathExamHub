const { normalizeDifficulty, DIFFICULTY_VALUES } = require('../constants/difficulty');
const { chatCompletionJson } = require('./llmChatClient');
const { DEFAULT_LLM_MODEL } = require('./llmProviderResolve');

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
  return (knowledgePoints || []).map((k) => ({
    id: String(k._id),
    path: k.path || k.name || '',
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
    '你是数学题库助教。根据题干与题型，从给定知识点目录中选择 0–2 个最相关节点，并给出难度（易/中/难）。',
    '只输出 JSON 对象：{"difficulty":"易|中|难","knowledgePointIds":["id",...],"rationale":"简短理由"}',
    'knowledgePointIds 必须来自目录中的 id，若无合适节点则返回空数组。',
  ].join('\n');
  const user = JSON.stringify({
    questionText: String(input.questionText || '').slice(0, 4000),
    type: input.type,
    subject: input.subject,
    knowledgePointCatalog: kpCatalog,
  });
  const raw = await chatCompletionJson({
    baseUrl,
    apiKey,
    model,
    system,
    user,
    timeoutMs: settings.llmTimeoutMs || 12000,
  });
  return validateSuggestion(raw, kpCatalog);
}

function suggestWithHeuristic(input) {
  const text = String(input.questionText || '');
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
};
