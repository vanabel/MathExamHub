/**
 * Resolve platform LLM settings to OpenAI-compatible chat API parameters (SiliconFlow, etc.).
 */

const DEFAULT_LLM_MODEL = 'deepseek-ai/DeepSeek-V4.1-Flash';
const DEFAULT_OPENAI_COMPAT_BASE = 'https://api.openai.com/v1';
const DEFAULT_SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1';

function normalizeBaseUrl(url) {
  let base = String(url || '').trim().replace(/\/$/, '');
  if (!base) return DEFAULT_OPENAI_COMPAT_BASE;
  if (!/\/v1$/i.test(base)) base += '/v1';
  return base;
}

function isUnsetProvider(provider) {
  return !provider || provider === 'mock';
}

function resolveEnvProvider() {
  const raw = process.env.LLM_PROVIDER || process.env.LLM_API_PROVIDER;
  if (!raw || !String(raw).trim()) return null;
  const p = String(raw).trim();
  if (p === 'openai') return 'openai_compatible';
  return p;
}

function resolveDefaultModel(settings) {
  return settings?.llmModel
    || process.env.LLM_MODEL
    || process.env.SILICONFLOW_MODEL
    || DEFAULT_LLM_MODEL;
}

function resolveDefaultBaseUrl(settings) {
  if (settings?.llmApiBaseUrl && String(settings.llmApiBaseUrl).trim()) {
    return settings.llmApiBaseUrl;
  }
  if (process.env.LLM_API_BASE_URL && String(process.env.LLM_API_BASE_URL).trim()) {
    return process.env.LLM_API_BASE_URL;
  }
  const hasSiliconKey = Boolean(process.env.SILICONFLOW_API_KEY);
  const hasOtherKey = Boolean(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
  const hasSettingsKey = Boolean(settings?.llmApiKey);
  if (hasSiliconKey && !hasOtherKey && !hasSettingsKey) {
    return DEFAULT_SILICONFLOW_BASE;
  }
  if (hasSiliconKey && !hasOtherKey && !process.env.LLM_API_BASE_URL) {
    return DEFAULT_SILICONFLOW_BASE;
  }
  return DEFAULT_OPENAI_COMPAT_BASE;
}

function resolveLlmChatConfig(settings = {}) {
  let provider = !isUnsetProvider(settings.llmProvider)
    ? settings.llmProvider
    : resolveEnvProvider();

  const apiKey = settings.llmApiKey
    || process.env.SILICONFLOW_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.LLM_API_KEY
    || '';

  if (isUnsetProvider(provider)) {
    if (apiKey) {
      provider = 'openai_compatible';
    } else {
      provider = 'mock';
    }
  }

  if (provider === 'mock') {
    return { provider: 'mock' };
  }

  return {
    provider: 'openai_compatible',
    apiKey,
    baseUrl: normalizeBaseUrl(resolveDefaultBaseUrl(settings)),
    model: resolveDefaultModel(settings),
    timeoutMs: settings.llmTimeoutMs ?? 12000,
  };
}

function settingsForLlmAssist(platformSettings) {
  const cfg = resolveLlmChatConfig(platformSettings || {});
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
  DEFAULT_SILICONFLOW_BASE,
};
