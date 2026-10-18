const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSectionsFromQuestions } = require('../services/blueprintFromBankService');
const { scoreMode } = require('../utils/scoreMode');

describe('blueprintFromBankService', () => {
  it('buildSectionsFromQuestions groups by part and uses score mode', () => {
    const questions = [
      { type: '判断题', totalScore: 2, subject: '解析几何', latexPartTitle: '判断题' },
      { type: '判断题', totalScore: 2, subject: '解析几何', latexPartTitle: '判断题' },
      { type: '单选题', totalScore: 2, subject: '解析几何', latexPartTitle: '单选题' },
    ];
    const { sections, totalScore, subject } = buildSectionsFromQuestions(questions);
    assert.equal(sections.length, 2);
    assert.equal(sections[0].type, '判断题');
    assert.equal(sections[0].count, 2);
    assert.equal(sections[0].scoreEach, 2);
    assert.equal(sections[1].type, '单选题');
    assert.equal(totalScore, 6);
    assert.equal(subject, '解析几何');
  });

  it('scoreMode picks most frequent score', () => {
    assert.equal(scoreMode([2, 2, 4, 2]), 2);
    assert.equal(scoreMode([4, 4, 2]), 4);
  });
});
