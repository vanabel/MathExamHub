import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDifficultyScore, getDifficultyCoefficient } from '../src/utils/difficultyScore.js';
import {
  runSmartSelect,
  seededShuffle,
  parseSeed,
  filterExamPoolCandidates,
} from '../src/utils/smartSelect.js';
import { QUESTION_TYPES } from '../src/constants/questionTypes.js';

test('difficulty mapping accepts 易/中/难 and legacy labels', () => {
  assert.equal(getDifficultyScore({ difficulty: '易', totalScore: 10 }), 4);
  assert.equal(getDifficultyScore({ difficulty: '中', totalScore: 10 }), 6);
  assert.equal(getDifficultyScore({ difficulty: '难', totalScore: 10 }), 10);
  assert.equal(getDifficultyScore({ difficulty: '简单', totalScore: 10 }), 4);
  assert.equal(getDifficultyScore({ difficulty: '中等', totalScore: 10 }), 6);
  assert.equal(getDifficultyCoefficient('较难'), 1);
});

test('excludes archived from smart select pool', () => {
  const bank = [
    { _id: '1', type: '单选题', totalScore: 3, difficulty: '易', status: 'published' },
    { _id: '2', type: '单选题', totalScore: 3, difficulty: '易', status: 'archived' },
  ];
  assert.equal(filterExamPoolCandidates(bank).length, 1);
  const result = runSmartSelect(bank, {
    mode: 'count',
    targetCount: 2,
    sortOrder: 'asc',
    seed: '1',
    enableTypeDistribution: false,
    typeDistribution: {},
    questionTypes: QUESTION_TYPES,
  });
  assert.equal(result.ok, true);
  assert.equal(result.selectedIds.length, 1);
  assert.equal(result.selectedIds[0], '1');
});

test('targetCount 0 is invalid', () => {
  const result = runSmartSelect(
    [{ _id: 'a', type: '单选题', totalScore: 5, difficulty: '中' }],
    {
      mode: 'count',
      targetCount: 0,
      sortOrder: 'random',
      seed: 42,
      enableTypeDistribution: false,
      typeDistribution: {},
      questionTypes: QUESTION_TYPES,
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /大于 0/);
});

test('type distribution exceeding count fails validation', () => {
  const bank = [];
  for (let i = 0; i < 10; i += 1) {
    bank.push({
      _id: `q${i}`,
      type: '单选题',
      totalScore: 5,
      difficulty: '中',
    });
  }
  const result = runSmartSelect(bank, {
    mode: 'count',
    targetCount: 5,
    sortOrder: 'random',
    seed: 1,
    enableTypeDistribution: true,
    typeDistribution: { 单选题: 4, 解答题: 3 },
    questionTypes: QUESTION_TYPES,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /超过题目数量/);
});

test('seed reproducibility for random sort', () => {
  const bank = [];
  for (let i = 0; i < 20; i += 1) {
    bank.push({
      _id: `q${i}`,
      type: '解答题',
      totalScore: 10,
      difficulty: ['易', '中', '难'][i % 3],
    });
  }
  const settings = {
    mode: 'count',
    targetCount: 5,
    sortOrder: 'random',
    seed: 12345,
    enableTypeDistribution: false,
    typeDistribution: {},
    questionTypes: QUESTION_TYPES,
  };
  const a = runSmartSelect(bank, settings);
  const b = runSmartSelect(bank, settings);
  assert.deepEqual(a.selectedIds, b.selectedIds);
  assert.equal(a.seedUsed, b.seedUsed);
});

test('target total score in count mode', () => {
  const bank = [
    { _id: 'a', type: '单选题', totalScore: 10, difficulty: '中' },
    { _id: 'b', type: '单选题', totalScore: 15, difficulty: '中' },
    { _id: 'c', type: '单选题', totalScore: 25, difficulty: '难' },
    { _id: 'd', type: '单选题', totalScore: 20, difficulty: '中' },
  ];
  const result = runSmartSelect(bank, {
    mode: 'count',
    targetCount: 2,
    targetTotalScore: 35,
    sortOrder: 'asc',
    seed: 1,
    enableTypeDistribution: false,
    typeDistribution: {},
    questionTypes: QUESTION_TYPES,
  });
  assert.equal(result.ok, true);
  assert.equal(result.summary.totalScore, 35);
});

test('type distribution shortfall message', () => {
  const bank = [
    { _id: 'a', type: '解答题', totalScore: 12, difficulty: '中' },
  ];
  const result = runSmartSelect(bank, {
    mode: 'count',
    targetCount: 5,
    sortOrder: 'random',
    seed: 99,
    enableTypeDistribution: true,
    typeDistribution: { 解答题: 5 },
    questionTypes: QUESTION_TYPES,
  });
  assert.equal(result.ok, true);
  assert.ok(
    result.summary.messages.some((m) => m.includes('目标 5 道解答题') && m.includes('仅找到 1 道')),
  );
});

test('seededShuffle is deterministic', () => {
  const arr = [1, 2, 3, 4, 5];
  const s1 = seededShuffle(arr, parseSeed('hello'));
  const s2 = seededShuffle(arr, parseSeed('hello'));
  assert.deepEqual(s1, s2);
  assert.notDeepEqual(s1, arr);
});
