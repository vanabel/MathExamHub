const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveLlmChatConfig,
  settingsForLlmAssist,
  DEEPSEEK_DEFAULT_MODEL,
} = require('../services/llmProviderResolve');

describe('llmProviderResolve', () => {
  it('defaults DeepSeek to deepseek-flash', () => {
    const cfg = resolveLlmChatConfig({ llmProvider: 'deepseek', llmApiKey: 'k' });
    assert.equal(cfg.model, DEEPSEEK_DEFAULT_MODEL);
    assert.match(cfg.baseUrl, /api\.deepseek\.com/);
  });

  it('maps platform deepseek settings for llm assist', () => {
    const s = settingsForLlmAssist({
      llmProvider: 'deepseek',
      llmApiKey: 'k',
      llmModel: 'deepseek-flash',
    });
    assert.equal(s.llmProvider, 'openai_compatible');
    assert.equal(s.llmModel, 'deepseek-flash');
  });
});
