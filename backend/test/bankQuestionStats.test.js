const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { LatexGenerator } = require('../utils/latexParser');

describe('LatexGenerator answer sheet', () => {
  it('embeds answertable for objective types', () => {
    const gen = new LatexGenerator();
    const questions = [
      { type: '判断题', questionText: 'a', totalScore: 2 },
      { type: '单选题', questionText: 'b', totalScore: 2 },
      { type: '解答题', questionText: 'c', totalScore: 10 },
    ];
    const tex = gen.generateDocument(questions, { includeAnswerSheet: true, answerSheetCols: 4 }, 'exam');
    assert.ok(tex.includes('\\answertable'));
    assert.ok(tex.includes('{2}{4}'));
  });

  it('countAnswerSheetSlots ignores subjective types', () => {
    const gen = new LatexGenerator();
    assert.equal(gen.countAnswerSheetSlots([{ type: '填空题' }, { type: '证明题' }]), 1);
  });
});
