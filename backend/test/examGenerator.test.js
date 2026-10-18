const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateExamPaper, pickSwapReplacement } = require('../services/examGenerator');
const { createSeededRandom } = require('../utils/seededRandom');

function q(id, overrides = {}) {
  return {
    _id: String(id),
    type: '填空题',
    difficulty: '中',
    totalScore: 4,
    subject: '解析几何',
    status: 'published',
    knowledgePointIds: [],
    ...overrides,
  };
}

describe('examGenerator', () => {
  it('fixed randomSeed yields identical question id order', () => {
    const pool = [
      q('a', { difficulty: '易' }),
      q('b', { difficulty: '中' }),
      q('c', { difficulty: '难' }),
      q('d', { difficulty: '易' }),
      q('e', { difficulty: '中' }),
    ];
    const blueprint = {
      title: 'test',
      subject: '解析几何',
      totalScore: 12,
      randomSeed: 42,
      allowRelaxation: false,
      sections: [{ type: '填空题', count: 3, scoreEach: 4 }],
    };
    const kp = new Map();
    const r1 = generateExamPaper(blueprint, pool, kp);
    const r2 = generateExamPaper(blueprint, pool, kp);
    assert.equal(r1.success, true);
    assert.deepEqual(r1.questionIds, r2.questionIds);
  });

  it('applies difficulty_mix relaxation when mix cannot be satisfied', () => {
    const pool = [
      q('1', { difficulty: '中' }),
      q('2', { difficulty: '中' }),
      q('3', { difficulty: '中' }),
    ];
    const blueprint = {
      title: 'hard mix',
      randomSeed: 7,
      allowRelaxation: true,
      sections: [{
        type: '填空题',
        count: 2,
        scoreEach: 4,
        difficultyMix: { 易: 1, 难: 1 },
      }],
    };
    const result = generateExamPaper(blueprint, pool, new Map());
    assert.equal(result.success, true);
    assert.ok(result.relaxations.some((r) => r.step === 'difficulty_mix'));
  });

  it('returns subject_mismatch shortfall with filterStages', () => {
    const pool = [
      q('1', { type: '判断题', totalScore: 2, subject: '解析几何' }),
    ];
    const result = generateExamPaper(
      {
        title: 'wrong subject',
        subject: '高等代数',
        randomSeed: 1,
        allowRelaxation: false,
        sections: [{ type: '判断题', count: 1, scoreEach: 2 }],
      },
      pool,
      new Map(),
    );
    assert.equal(result.success, false);
    assert.equal(result.shortfalls[0].reasonCode, 'subject_mismatch');
    assert.ok(result.shortfalls[0].filterStages);
  });

  it('requires allowScoreGap when total score differs from blueprint target', () => {
    const pool = [
      q('1', { totalScore: 4 }),
      q('2', { totalScore: 4 }),
      q('3', { totalScore: 4 }),
    ];
    const blueprint = {
      title: 'gap',
      totalScore: 100,
      randomSeed: 3,
      allowRelaxation: false,
      sections: [{ type: '填空题', count: 3, scoreEach: 4 }],
    };
    const strict = generateExamPaper(blueprint, pool, new Map(), { allowScoreGap: false });
    assert.equal(strict.success, false);
    assert.equal(strict.scoreGapRequiresConfirm, true);
    assert.ok(strict.scoreGap);
    assert.equal(strict.scoreGap.actual, 12);

    const allowed = generateExamPaper(blueprint, pool, new Map(), { allowScoreGap: true });
    assert.equal(allowed.success, true);
    assert.ok(allowed.scoreGap);
  });

  it('returns shortfall when pool is empty', () => {
    const result = generateExamPaper(
      {
        title: 'empty',
        randomSeed: 1,
        allowRelaxation: false,
        sections: [{ type: '填空题', count: 1 }],
      },
      [],
      new Map(),
    );
    assert.equal(result.success, false);
    assert.ok(result.shortfalls.length > 0);
  });
  it('pickSwapReplacement finds another question with same type', () => {
    const pool = [
      q('1', { difficulty: '易' }),
      q('2', { difficulty: '易' }),
      q('3', { difficulty: '难' }),
    ];
    const blueprint = {
      title: 'swap',
      sections: [{ type: '填空题', count: 2, scoreEach: 4 }],
    };
    const swap = pickSwapReplacement({
      blueprint,
      pool,
      kpExpansionMap: new Map(),
      sectionIndex: 0,
      replaceQuestionId: '1',
      occupiedQuestionIds: ['1', '3'],
      randomSeed: 1,
    });
    assert.ok(swap.replacement);
    assert.equal(String(swap.replacement._id), '2');
  });
});

describe('seededRandom', () => {
  it('is deterministic', () => {
    const a = createSeededRandom(99);
    const b = createSeededRandom(99);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    assert.deepEqual(seqA, seqB);
  });
});
