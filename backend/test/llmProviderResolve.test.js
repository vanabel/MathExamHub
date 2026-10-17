const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveLlmChatConfig,
  settingsForLlmAssist,
  DEFAULT_LLM_MODEL,
  DEFAULT_SILICONFLOW_BASE,
  DEFAULT_LLM_TIMEOUT_MS,
  MAX_LLM_TIMEOUT_MS,
  resolveLlmTimeoutMs,
} = require('../services/llmProviderResolve');

describe('llmProviderResolve', () => {
  it('defaults openai_compatible model to DeepSeek V4.1 Flash on SiliconFlow id', () => {
    const cfg = resolveLlmChatConfig({
      llmProvider: 'openai_compatible',
      llmApiKey: 'k',
      llmApiBaseUrl: 'https://api.siliconflow.cn/v1',
    });
    assert.equal(cfg.model, DEFAULT_LLM_MODEL);
    assert.equal(cfg.model, 'deepseek-ai/DeepSeek-V4.1-Flash');
    assert.match(cfg.baseUrl, /siliconflow/);
  });

  it('respects LLM_MODEL and SILICONFLOW_MODEL env overrides', () => {
    const prev = process.env.SILICONFLOW_MODEL;
    process.env.SILICONFLOW_MODEL = 'custom/model';
    try {
      const cfg = resolveLlmChatConfig({ llmProvider: 'openai_compatible', llmApiKey: 'k' });
      assert.equal(cfg.model, 'custom/model');
    } finally {
      if (prev === undefined) delete process.env.SILICONFLOW_MODEL;
      else process.env.SILICONFLOW_MODEL = prev;
    }
  });

  it('maps platform settings for llm assist', () => {
    const s = settingsForLlmAssist({
      llmProvider: 'openai_compatible',
      llmApiKey: 'k',
      llmApiBaseUrl: 'https://api.siliconflow.cn/v1',
      llmModel: 'deepseek-ai/DeepSeek-V4.1-Flash',
    });
    assert.equal(s.llmProvider, 'openai_compatible');
    assert.equal(s.llmModel, 'deepseek-ai/DeepSeek-V4.1-Flash');
  });

  it('uses SiliconFlow defaults when only SILICONFLOW_API_KEY is set', () => {
    const keys = ['SILICONFLOW_API_KEY', 'LLM_PROVIDER', 'LLM_API_PROVIDER', 'LLM_API_BASE_URL'];
    const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    keys.forEach((k) => delete process.env[k]);
    process.env.SILICONFLOW_API_KEY = 'sk-sf';
    try {
      const cfg = resolveLlmChatConfig({});
      assert.equal(cfg.provider, 'openai_compatible');
      assert.equal(cfg.apiKey, 'sk-sf');
      assert.equal(cfg.baseUrl, DEFAULT_SILICONFLOW_BASE);
      assert.equal(cfg.model, DEFAULT_LLM_MODEL);
    } finally {
      keys.forEach((k) => {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      });
    }
  });

  it('defaults LLM timeout to 120s and caps at 300s', () => {
    assert.equal(DEFAULT_LLM_TIMEOUT_MS, 120000);
    assert.equal(MAX_LLM_TIMEOUT_MS, 300000);
    const cfg = resolveLlmChatConfig({ llmProvider: 'openai_compatible', llmApiKey: 'k' });
    assert.equal(cfg.timeoutMs, 120000);
  });

  it('honors LLM_TIMEOUT_MS env override', () => {
    const prev = process.env.LLM_TIMEOUT_MS;
    process.env.LLM_TIMEOUT_MS = '180000';
    try {
      assert.equal(resolveLlmTimeoutMs({}), 180000);
    } finally {
      if (prev === undefined) delete process.env.LLM_TIMEOUT_MS;
      else process.env.LLM_TIMEOUT_MS = prev;
    }
  });

  it('honors LLM_API_PROVIDER as alias for LLM_PROVIDER', () => {
    const prevProvider = process.env.LLM_PROVIDER;
    const prevAlias = process.env.LLM_API_PROVIDER;
    delete process.env.LLM_PROVIDER;
    process.env.LLM_API_PROVIDER = 'openai_compatible';
    try {
      const cfg = resolveLlmChatConfig({ llmApiKey: 'k' });
      assert.equal(cfg.provider, 'openai_compatible');
    } finally {
      if (prevProvider === undefined) delete process.env.LLM_PROVIDER;
      else process.env.LLM_PROVIDER = prevProvider;
      if (prevAlias === undefined) delete process.env.LLM_API_PROVIDER;
      else process.env.LLM_API_PROVIDER = prevAlias;
    }
  });
});
