const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assessQuestionQuality } = require('../utils/questionQuality');

describe('questionQuality', () => {
  it('flags missing answer and kp', () => {
    const issues = assessQuestionQuality({
      type: '填空题',
      correctAnswer: '',
      difficulty: '中',
      knowledgePointIds: [],
    });
    assert.ok(issues.includes('missing_answer'));
    assert.ok(issues.includes('missing_kp'));
  });
});
