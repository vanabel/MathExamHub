const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveLlmChatConfig,
  settingsForLlmAssist,
  DEFAULT_LLM_MODEL,
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
});
