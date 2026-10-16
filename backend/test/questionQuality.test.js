const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assessQuestionQuality, mergeQualityMongoFilter } = require('../utils/questionQuality');

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

  it('flags missing solution for 解答题', () => {
    const issues = assessQuestionQuality({
      type: '解答题',
      correctAnswer: 'x',
      difficulty: '中',
      knowledgePointIds: ['a'],
      originalLaTeX: '\\begin{problem}求值\\end{problem}',
    });
    assert.ok(issues.includes('missing_solution'));
  });

  it('mergeQualityMongoFilter supports missing_solution', () => {
    const f = mergeQualityMongoFilter({ bankId: 'x' }, 'missing_solution');
    assert.ok(f.$and);
    assert.equal(f.$and[1].type.$in.includes('证明题'), true);
  });
});
