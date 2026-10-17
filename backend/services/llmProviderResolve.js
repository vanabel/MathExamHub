/**
 * Resolve platform LLM settings to OpenAI-compatible chat API parameters.
 */

const DEEPSEEK_DEFAULT_BASE = 'https://api.deepseek.com/v1';
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-flash';

function normalizeBaseUrl(url) {
  let base = String(url || '').trim().replace(/\/$/, '');
  if (!base) return DEEPSEEK_DEFAULT_BASE;
  if (!/\/v1$/i.test(base)) base += '/v1';
  return base;
}

function resolveLlmChatConfig(settings) {
  const provider = settings?.llmProvider || process.env.LLM_PROVIDER || 'mock';
  if (provider === 'mock') {
    return { provider: 'mock' };
  }

  if (provider === 'deepseek') {
    const apiKey = settings?.llmApiKey
      || process.env.DEEPSEEK_API_KEY
      || process.env.LLM_API_KEY
      || '';
    return {
      provider: 'openai_compatible',
      apiKey,
      baseUrl: normalizeBaseUrl(
        settings?.llmApiBaseUrl || process.env.LLM_API_BASE_URL || DEEPSEEK_DEFAULT_BASE,
      ),
      model: settings?.llmModel || process.env.LLM_MODEL || DEEPSEEK_DEFAULT_MODEL,
      timeoutMs: settings?.llmTimeoutMs ?? 12000,
    };
  }

  return {
    provider: 'openai_compatible',
    apiKey: settings?.llmApiKey
      || process.env.OPENAI_API_KEY
      || process.env.SILICONFLOW_API_KEY
      || process.env.LLM_API_KEY
      || '',
    baseUrl: normalizeBaseUrl(settings?.llmApiBaseUrl || process.env.LLM_API_BASE_URL || 'https://api.openai.com/v1'),
    model: settings?.llmModel || process.env.LLM_MODEL || 'gpt-4o-mini',
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
  DEEPSEEK_DEFAULT_BASE,
  DEEPSEEK_DEFAULT_MODEL,
};
