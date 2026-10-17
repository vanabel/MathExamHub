#!/usr/bin/env node
/**
 * Regenerate backend/test/fixtures/onboarding-rich-bank.json
 * Run: node backend/scripts/buildOnboardingRichBankFixture.js
 */
const fs = require('fs');
const path = require('path');

const SUBJECT = '高等代数';
const TYPES = ['判断题', '单选题', '填空题', '解答题'];
const DIFFS = ['易', '中', '难'];
const SCORE_BY_TYPE = { 判断题: 2, 单选题: 3, 填空题: 4, 解答题: 10 };

const knowledgePoints = [
  { key: 'root', name: SUBJECT, parent: null },
  { key: 'linear', name: '线性方程组', parent: 'root' },
  { key: 'matrix', name: '矩阵运算', parent: 'root' },
  { key: 'det', name: '行列式', parent: 'root' },
  { key: 'vector', name: '向量空间', parent: 'root' },
];

const kpKeys = knowledgePoints.filter((k) => k.parent).map((k) => k.key);
const questions = [];
let n = 0;
for (const type of TYPES) {
  for (let i = 0; i < 11; i += 1) {
    n += 1;
    const diff = DIFFS[n % 3];
    const kpKey = kpKeys[n % kpKeys.length];
    const score = SCORE_BY_TYPE[type];
    const stem = `${SUBJECT}示例 ${type} 第${n}题（${diff}）`;
    const base = {
      type,
      difficulty: diff,
      subject: SUBJECT,
      totalScore: score,
      knowledgePointKeys: [kpKey],
      questionText: stem,
      correctAnswer: type === '判断题' ? '对' : `答案${n}`,
    };
    if (type === '单选题') {
      base.options = { A: '1', B: '2', C: '3', D: '4' };
      base.correctAnswer = 'C';
    }
    questions.push(base);
  }
}

const starterBlueprint = {
  title: '入门示例（开箱即用）',
  subject: SUBJECT,
  totalScore: 100,
  randomSeed: 20260101,
  allowRelaxation: true,
  maxVariantOverlapPct: 0.2,
  isTemplate: true,
  sharedWithBank: true,
  sections: [
    { type: '判断题', count: 6, scoreEach: 2, difficultyMix: { 易: 2, 中: 2, 难: 2 } },
    { type: '单选题', count: 8, scoreEach: 3, difficultyMix: { 易: 0, 中: 0, 难: 0 } },
    { type: '填空题', count: 10, scoreEach: 4, difficultyMix: { 易: 0, 中: 0, 难: 0 } },
    { type: '解答题', count: 4, scoreEach: 10, difficultyMix: { 易: 0, 中: 0, 难: 0 } },
  ],
};

const out = {
  subject: SUBJECT,
  sourceFileName: 'onboarding-rich-bank.json',
  knowledgePoints,
  questions,
  starterBlueprint,
};

const outPath = path.join(__dirname, '../test/fixtures/onboarding-rich-bank.json');
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${questions.length} questions to ${outPath}`);
