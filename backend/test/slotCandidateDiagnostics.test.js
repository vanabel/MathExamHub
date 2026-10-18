const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { diagnoseEmptySlot } = require('../utils/slotCandidateDiagnostics');

describe('slotCandidateDiagnostics', () => {
  it('classifies subject mismatch with filter stage counts', () => {
    const pool = [
      {
        _id: '1',
        type: '判断题',
        difficulty: '中',
        totalScore: 2,
        subject: '解析几何',
        status: 'published',
        knowledgePointIds: [],
      },
    ];
    const out = diagnoseEmptySlot({
      pool,
      blueprintSubject: '高等代数',
      section: { type: '判断题', scoreEach: 2 },
      slotDifficulty: null,
      usedIds: new Set(),
      kpAllowSet: null,
    });
    assert.equal(out.reasonCode, 'subject_mismatch');
    assert.ok(out.message.includes('高等代数'));
    assert.equal(out.filterStages.bankTotal, 1);
    assert.equal(out.filterStages.subjectMatch, 0);
    assert.ok(out.suggestion);
  });

  it('classifies type mismatch after subject filter', () => {
    const pool = [
      {
        _id: '1',
        type: '填空题',
        difficulty: '中',
        totalScore: 4,
        subject: '解析几何',
        status: 'published',
        knowledgePointIds: [],
      },
    ];
    const out = diagnoseEmptySlot({
      pool,
      blueprintSubject: '解析几何',
      section: { type: '判断题', scoreEach: 2 },
      slotDifficulty: null,
      usedIds: new Set(),
      kpAllowSet: null,
    });
    assert.equal(out.reasonCode, 'type_mismatch');
    assert.equal(out.filterStages.subjectMatch, 1);
    assert.equal(out.filterStages.typeMatch, 0);
  });
});
