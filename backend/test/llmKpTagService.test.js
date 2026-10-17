const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');

describe('llmKpTagService apply', () => {
  it('applyKpTagUpdates merges new ids by default', async () => {
    const Question = require('../models/Question');
    mock.method(Question, 'findOne', async () => ({
      knowledgePointIds: ['kp1'],
      knowledgePointLinks: [{ knowledgePointId: 'kp1', source: 'manual' }],
      updatedAt: new Date(),
      async save() { this.saved = true; },
    }));
    try {
      const { applyKpTagUpdates } = require('../services/llmKpTagService');
      const { modified } = await applyKpTagUpdates('bank1', [{
        questionId: 'q1',
        knowledgePointIds: ['kp2'],
      }]);
      assert.equal(modified, 1);
    } finally {
      mock.restoreAll();
    }
  });
});
