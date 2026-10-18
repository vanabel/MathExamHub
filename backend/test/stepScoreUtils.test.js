const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  sumStepScoresFromText,
  stepScoreMismatch,
} = require('../utils/stepScoreUtils');

describe('stepScoreUtils', () => {
  it('sums per-step \\score marks', () => {
    const { sum, scores } = sumStepScoresFromText('a\\score{2}b\\score{3}');
    assert.equal(sum, 5);
    assert.deepEqual(scores, [2, 3]);
  });

  it('flags mismatch against totalScore', () => {
    const issue = stepScoreMismatch({
      totalScore: 10,
      correctAnswer: '\\score{4}\\score{3}',
      solution: '',
    });
    assert.ok(issue);
    assert.equal(issue.sum, 7);
  });

  it('returns null when no step scores', () => {
    assert.equal(stepScoreMismatch({ totalScore: 5, correctAnswer: 'x' }), null);
  });

  it('does not double-count identical answer and solution step scores', () => {
    const body = 'a\\score{5}b\\score{5}';
    const issue = stepScoreMismatch({
      totalScore: 10,
      correctAnswer: body,
      solution: body,
    });
    assert.equal(issue, null);
  });
});
