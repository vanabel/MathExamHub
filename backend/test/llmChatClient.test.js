const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { chatCompletionJson } = require('../services/llmChatClient');

describe('llmChatClient', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('parses JSON content from chat completions', async () => {
    global.fetch = async () => ({
      ok: true,
      async json() {
        return {
          choices: [{ message: { content: '{"difficulty":"中","knowledgePointIds":[]}' } }],
        };
      },
    });
    const out = await chatCompletionJson({
      baseUrl: 'https://example.com/v1',
      apiKey: 'sk-test',
      model: 'm',
      system: 's',
      user: 'u',
      timeoutMs: 5000,
    });
    assert.equal(out.difficulty, '中');
  });
});
