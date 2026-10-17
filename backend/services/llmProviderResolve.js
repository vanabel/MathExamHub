/**
 * Resolve platform LLM settings to OpenAI-compatible chat API parameters (SiliconFlow, etc.).
 */

const DEFAULT_LLM_MODEL = 'deepseek-ai/DeepSeek-V4.1-Flash';
const DEFAULT_OPENAI_COMPAT_BASE = 'https://api.openai.com/v1';

function normalizeBaseUrl(url) {
  let base = String(url || '').trim().replace(/\/$/, '');
  if (!base) return DEFAULT_OPENAI_COMPAT_BASE;
  if (!/\/v1$/i.test(base)) base += '/v1';
  return base;
}

function resolveDefaultModel(settings) {
  return settings?.llmModel
    || process.env.LLM_MODEL
    || process.env.SILICONFLOW_MODEL
    || DEFAULT_LLM_MODEL;
}

function resolveLlmChatConfig(settings) {
  const provider = settings?.llmProvider || process.env.LLM_PROVIDER || 'mock';
  if (provider === 'mock') {
    return { provider: 'mock' };
  }

  return {
    provider: 'openai_compatible',
    apiKey: settings?.llmApiKey
      || process.env.SILICONFLOW_API_KEY
      || process.env.OPENAI_API_KEY
      || process.env.LLM_API_KEY
      || '',
    baseUrl: normalizeBaseUrl(
      settings?.llmApiBaseUrl || process.env.LLM_API_BASE_URL || DEFAULT_OPENAI_COMPAT_BASE,
    ),
    model: resolveDefaultModel(settings),
    timeoutMs: settings?.llmTimeoutMs ?? 12000,
  };
}

function settingsForLlmAssist(platformSettings) {
  const cfg = resolveLlmChatConfig(platformSettings);
  if (cfg.provider === 'mock') {
    return { llmProvider: 'mock' };
  }
  return {
    llmProvider: 'openai_compatible',
    llmApiKey: cfg.apiKey,
    llmApiBaseUrl: cfg.baseUrl,
    llmModel: cfg.model,
    llmTimeoutMs: cfg.timeoutMs,
    llmPreviewConcurrency: platformSettings?.llmPreviewConcurrency,
  };
}

module.exports = {
  resolveLlmChatConfig,
  settingsForLlmAssist,
  DEFAULT_LLM_MODEL,
  DEFAULT_OPENAI_COMPAT_BASE,
};
