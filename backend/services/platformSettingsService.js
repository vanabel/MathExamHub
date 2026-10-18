const PlatformSettings = require('../models/PlatformSettings');
const { DEFAULT_LLM_MODEL, DEFAULT_LLM_TIMEOUT_MS, MAX_LLM_TIMEOUT_MS } = require('./llmProviderResolve');

function toPublicSettings(doc) {
  return {
    llmAssistEnabled: !!doc.llmAssistEnabled,
    llmProvider: doc.llmProvider || 'mock',
    llmApiBaseUrl: doc.llmApiBaseUrl || 'https://api.openai.com/v1',
    llmModel: doc.llmModel || DEFAULT_LLM_MODEL,
    llmTimeoutMs: doc.llmTimeoutMs ?? DEFAULT_LLM_TIMEOUT_MS,
    llmPreviewMaxQuestions: doc.llmPreviewMaxQuestions ?? 20,
    llmPreviewConcurrency: doc.llmPreviewConcurrency ?? 3,
    hasApiKey: Boolean(doc.llmApiKey),
    updatedAt: doc.updatedAt,
  };
}

async function getPlatformSettings() {
  let doc = await PlatformSettings.findOne({ key: 'global' }).select('+llmApiKey').lean();
  if (!doc) {
    doc = (await PlatformSettings.create({ key: 'global' })).toObject();
    doc.llmApiKey = undefined;
  }
  const llmApiKey = doc.llmApiKey
    || process.env.SILICONFLOW_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.LLM_API_KEY
    || '';
  return {
    ...toPublicSettings(doc),
    llmApiKey,
  };
}

async function getPlatformSettingsPublic() {
  const full = await getPlatformSettings();
  const { llmApiKey, ...rest } = full;
  return { ...rest, hasApiKey: Boolean(llmApiKey) };
}

async function updatePlatformSettings(patch) {
  const update = { updatedAt: new Date() };
  if (typeof patch.llmAssistEnabled === 'boolean') {
    update.llmAssistEnabled = patch.llmAssistEnabled;
  }
  if (
    patch.llmProvider === 'mock'
    || patch.llmProvider === 'openai_compatible'
    || patch.llmProvider === 'openai'
  ) {
    update.llmProvider = patch.llmProvider === 'openai' ? 'openai_compatible' : patch.llmProvider;
  }
  if (typeof patch.llmApiBaseUrl === 'string' && patch.llmApiBaseUrl.trim()) {
    update.llmApiBaseUrl = patch.llmApiBaseUrl.trim().replace(/\/$/, '');
  }
  if (typeof patch.llmModel === 'string' && patch.llmModel.trim()) {
    update.llmModel = patch.llmModel.trim();
  }
  if (typeof patch.llmTimeoutMs === 'number' && patch.llmTimeoutMs >= 3000) {
    update.llmTimeoutMs = Math.min(patch.llmTimeoutMs, MAX_LLM_TIMEOUT_MS);
  }
  if (typeof patch.llmPreviewMaxQuestions === 'number') {
    update.llmPreviewMaxQuestions = Math.min(Math.max(patch.llmPreviewMaxQuestions, 1), 200);
  }
  if (typeof patch.llmPreviewConcurrency === 'number') {
    update.llmPreviewConcurrency = Math.min(Math.max(patch.llmPreviewConcurrency, 1), 10);
  }
  if (typeof patch.llmApiKey === 'string' && patch.llmApiKey.trim()) {
    update.llmApiKey = patch.llmApiKey.trim();
  }

  const doc = await PlatformSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: update },
    { upsert: true, new: true },
  ).select('+llmApiKey').lean();

  return toPublicSettings(doc);
}

module.exports = {
  getPlatformSettings,
  getPlatformSettingsPublic,
  updatePlatformSettings,
  toPublicSettings,
};
