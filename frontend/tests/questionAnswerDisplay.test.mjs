import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  showAnswerBlock,
  showSolutionBlock,
  answerForDisplay,
} from '../src/utils/questionAnswerDisplay.js';

describe('questionAnswerDisplay', () => {
  it('shows 解答 only once when subjective has solution but no short answer', () => {
    const q = {
      type: '解答题',
      correctAnswer: '',
      solution: '步骤 \\score{5}',
    };
    assert.equal(answerForDisplay(q), '');
    assert.equal(showAnswerBlock(q), false);
    assert.equal(showSolutionBlock(q), true);
  });

  it('shows both blocks when short answer and solution differ', () => {
    const q = {
      type: '解答题',
      correctAnswer: 'B',
      solution: '详细推导',
    };
    assert.equal(showAnswerBlock(q), true);
    assert.equal(showSolutionBlock(q), true);
  });
});
