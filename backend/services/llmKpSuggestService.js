const { chatCompletionJson } = require('./llmChatClient');
const {
  buildKpCatalog,
  buildLlmUserPayload,
} = require('./llmAssistService');
const { DEFAULT_LLM_MODEL, DEFAULT_LLM_TIMEOUT_MS } = require('./llmProviderResolve');

function validateKpTagSuggestions(raw, kpCatalog) {
  if (!raw || typeof raw !== 'object') return null;
  const allowed = new Set(kpCatalog.map((k) => k.id));
  const pathById = new Map(kpCatalog.map((k) => [k.id, k.path]));

  let items = [];
  if (Array.isArray(raw.suggestions)) {
    items = raw.suggestions;
  } else if (Array.isArray(raw.knowledgePointIds)) {
    items = raw.knowledgePointIds.map((id) => ({
      knowledgePointId: id,
      confidence: 0.5,
      reason: typeof raw.rationale === 'string' ? raw.rationale : '',
    }));
  }

  const suggestions = items
    .map((item) => {
      const knowledgePointId = String(item.knowledgePointId || item.id || '');
      if (!allowed.has(knowledgePointId)) return null;
      let confidence = Number(item.confidence);
      if (Number.isNaN(confidence)) confidence = 0.5;
      confidence = Math.min(1, Math.max(0, confidence));
      return {
        knowledgePointId,
        path: pathById.get(knowledgePointId) || '',
        confidence,
        reason: String(item.reason || item.rationale || '').slice(0, 500),
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  if (!suggestions.length) return null;

  return {
    suggestions,
    suggestedKnowledgePointIds: suggestions.map((s) => s.knowledgePointId),
    source: 'llm',
    rationale: typeof raw.rationale === 'string' ? raw.rationale.slice(0, 500) : undefined,
  };
}

async function suggestKnowledgePointsForQuestion(input, settings) {
  const provider = settings?.llmProvider || 'mock';
  if (provider === 'mock') {
    return suggestKnowledgePointsHeuristic(input);
  }
  if (provider === 'openai_compatible') {
    try {
      const fromApi = await suggestKnowledgePointsWithChatApi(input, settings);
      if (fromApi) return fromApi;
      return {
        ...suggestKnowledgePointsHeuristic(input),
        source: 'heuristic',
        llmError: 'LLM returned invalid or empty response',
      };
    } catch (err) {
      return {
        ...suggestKnowledgePointsHeuristic(input),
        source: 'heuristic',
        llmError: err.message,
      };
    }
  }
  return suggestKnowledgePointsHeuristic(input);
}

async function suggestKnowledgePointsWithChatApi(input, settings) {
  const apiKey = settings.llmApiKey;
  const baseUrl = settings.llmApiBaseUrl || 'https://api.openai.com/v1';
  const model = settings.llmModel || process.env.LLM_MODEL || process.env.SILICONFLOW_MODEL || DEFAULT_LLM_MODEL;
  if (!apiKey) throw new Error('LLM API key not configured');

  const kpCatalog = buildKpCatalog(input.knowledgePoints);
  const system = [
    '你是数学题库助教。根据题目内容，从给定知识点目录（含 path、教学目标 objective、说明 description、标签 tags、认知维度与分类）中选择 1–3 个最相关节点。',
    '优先依据 objective/description 与题干、解答的语义匹配，path 仅作层级参考。',
    '只输出 JSON：{"suggestions":[{"knowledgePointId":"目录中的id","confidence":0.0-1.0,"reason":"简短理由"},...],"rationale":"可选整体说明"}',
    'knowledgePointId 必须来自目录；confidence 表示匹配把握；若无合适节点则 suggestions 为空数组。',
  ].join('\n');
  const user = JSON.stringify({
    ...buildLlmUserPayload(input),
    knowledgePointTree: kpCatalog,
  });

  const raw = await chatCompletionJson({
    baseUrl,
    apiKey,
    model,
    system,
    user,
    timeoutMs: settings.llmTimeoutMs || DEFAULT_LLM_TIMEOUT_MS,
  });
  return validateKpTagSuggestions(raw, kpCatalog);
}

function suggestKnowledgePointsHeuristic(input) {
  const kps = input.knowledgePoints || [];
  const text = [
    String(input.questionText || ''),
    String(input.subject || ''),
  ].join('\n');
  let match = kps.find((k) => {
    const path = String(k.path || k.name || '');
    return path && text.includes(path.split('/').pop());
  });
  if (!match && input.subject) {
    match = kps.find((k) => String(k.path || '').includes(input.subject)) || kps[0];
  } else if (!match) {
    match = kps[0];
  }
  if (!match?._id) {
    return { suggestions: [], suggestedKnowledgePointIds: [], source: 'heuristic' };
  }
  const id = String(match._id);
  return {
    suggestions: [{
      knowledgePointId: id,
      path: match.path || match.name || '',
      confidence: 0.3,
      reason: '启发式匹配（未配置 LLM 或调用失败）',
    }],
    suggestedKnowledgePointIds: [id],
    source: 'heuristic',
  };
}

module.exports = {
  suggestKnowledgePointsForQuestion,
  validateKpTagSuggestions,
};
