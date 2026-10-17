const { getPlatformSettings } = require('./platformSettingsService');
const { suggestQuestionMetadata, buildQuestionMetadataInput } = require('./llmAssistService');
const { settingsForLlmAssist } = require('./llmProviderResolve');

const LLM_PREVIEW_MAX_QUESTIONS = Number(process.env.LLM_PREVIEW_MAX_QUESTIONS) || 20;
const LLM_PREVIEW_CONCURRENCY = Number(process.env.LLM_PREVIEW_CONCURRENCY) || 3;

async function mapWithConcurrency(items, limit, fn) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Math.min(limit, items.length);
  async function worker() {
    for (;;) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function attachLlmSuggestions(questions, bankId, opts = {}) {
  const suggestFn = opts.suggestQuestionMetadata || suggestQuestionMetadata;

  const platformSettings = opts.settings ?? await getPlatformSettings();
  const settings = settingsForLlmAssist(platformSettings);
  const maxFromSettings = settings.llmPreviewMaxQuestions ?? LLM_PREVIEW_MAX_QUESTIONS;
  const concurrencyFromSettings = settings.llmPreviewConcurrency ?? LLM_PREVIEW_CONCURRENCY;
  const effectiveMax = opts.maxQuestions ?? maxFromSettings;
  const effectiveConcurrency = opts.concurrency ?? concurrencyFromSettings;
  const total = questions?.length || 0;
  if (!platformSettings.llmAssistEnabled || !total) {
    return {
      llmSuggestions: [],
      settings: platformSettings,
      knowledgePoints: [],
      llmPreviewCap: effectiveMax,
      llmPreviewProcessed: 0,
      llmPreviewTruncated: false,
    };
  }
  let kpNodes = opts.knowledgePoints;
  if (!kpNodes) {
    const KnowledgePoint = require('../models/KnowledgePoint');
    kpNodes = await KnowledgePoint.find({ bankId }).select('_id path name subject').lean();
  }
  const slice = questions.slice(0, effectiveMax);
  const llmSuggestionsPartial = await mapWithConcurrency(slice, effectiveConcurrency, async (q) => suggestFn(
    buildQuestionMetadataInput(
      {
        ...q,
        subject: q.subject || '解析几何',
      },
      kpNodes,
    ),
    settings,
  ));
  const llmSuggestions = [...llmSuggestionsPartial];
  while (llmSuggestions.length < total) {
    llmSuggestions.push(null);
  }
  return {
    llmSuggestions,
    settings,
    knowledgePoints: kpNodes,
    llmPreviewCap: effectiveMax,
    llmPreviewProcessed: slice.length,
    llmPreviewTruncated: total > effectiveMax,
  };
}

function parseMetadataOverrides(body) {
  if (!body.metadataOverrides) return null;
  try {
    const raw = typeof body.metadataOverrides === 'string'
      ? JSON.parse(body.metadataOverrides)
      : body.metadataOverrides;
    return Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

module.exports = {
  attachLlmSuggestions,
  parseMetadataOverrides,
  mapWithConcurrency,
  LLM_PREVIEW_MAX_QUESTIONS,
  LLM_PREVIEW_CONCURRENCY,
};
