const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { suggestQuestionMetadata } = require('../services/llmAssistService');

describe('llmAssistService mock', () => {
  it('suggests difficulty and kp id', async () => {
    const out = await suggestQuestionMetadata(
      {
        questionText: '证明勾股定理',
        type: '证明题',
        subject: '几何',
        knowledgePoints: [{ _id: 'abc', path: '几何/勾股' }],
      },
      { llmProvider: 'mock' },
    );
    assert.equal(out.difficulty, '难');
    assert.deepEqual(out.knowledgePointIds, ['abc']);
    assert.equal(out.source, 'mock');
  });
});
