const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const { LatexGenerator } = require('../utils/latexParser');

describe('Question.solution field', () => {
  it('allows optional solution on schema', () => {
    const q = new Question({
      bankId: new mongoose.Types.ObjectId(),
      questionText: 'stem',
      type: '单选题',
      totalScore: 3,
      correctAnswer: 'C',
      solution: '因为 $\\det A\\neq 0$。',
    });
    const err = q.validateSync();
    assert.equal(err, undefined);
    assert.equal(q.correctAnswer, 'C');
    assert.match(q.solution, /det A/);
  });
});

describe('LatexGenerator solution export', () => {
  it('keeps \\pickout letter separate from \\begin{solution} body in answer mode', () => {
    const gen = new LatexGenerator();
    const latex = gen.generateProblem(
      {
        type: '单选题',
        totalScore: 3,
        questionText: 'Which?',
        options: { A: '$1$', B: '$2$', C: '$3$', D: '$4$' },
        correctAnswer: 'C',
        solution: '由逆矩阵性质可得结论。',
      },
      'answer',
    );
    assert.match(latex, /\\pickout\{C\}/);
    assert.match(latex, /\\begin\{solution\}/);
    assert.match(latex, /逆矩阵性质/);
    assert.doesNotMatch(latex, /\\pickout\{由逆矩阵/);
  });

  it('omits solution block in exam mode when only solution field is set', () => {
    const gen = new LatexGenerator();
    const latex = gen.generateProblem(
      {
        type: '证明题',
        totalScore: 10,
        questionText: 'Prove.',
        correctAnswer: 'C',
        solution: '详细证明过程。',
      },
      'exam',
    );
    assert.doesNotMatch(latex, /\\begin\{solution\}/);
  });
});
