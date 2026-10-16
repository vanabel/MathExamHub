const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildBankStatsCsvLines } = require('../utils/bankStatsCsv');

describe('bankStatsCsv', () => {
  it('includes listQuery filter columns on blueprintGap rows', () => {
    const lines = buildBankStatsCsvLines({
      totalQuestions: 1,
      byType: [],
      byDifficulty: {},
      byKnowledgePoint: [],
      blueprintCoverageGaps: [{
        blueprintTitle: '期中',
        sectionIndex: 0,
        slot: 1,
        type: '填空题',
        neededDifficulty: '难',
        message: '缺口',
        listQuery: {
          type: '填空题',
          difficulty: '难',
          knowledgePointId: 'abc',
          subtree: 'true',
          minScore: 8.5,
          maxScore: 11.5,
        },
      }],
    });
    assert.ok(lines[0].includes('filterMinScore'));
    const gapLine = lines.find((l) => l.startsWith('blueprintGap,'));
    assert.ok(gapLine.includes('填空题'));
    assert.ok(gapLine.includes('难'));
    assert.ok(gapLine.includes('abc'));
    assert.ok(gapLine.includes('8.5'));
  });
});
