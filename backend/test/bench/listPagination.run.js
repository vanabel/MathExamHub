/**
 * CI-friendly list pagination benchmark: seeds up to 10k questions in one bank, measures p95 latency.
 * Exit 0 if p95 <= BENCH_P95_MS (default 2500).
 */
const mongoose = require('mongoose');
const Question = require('../../models/Question');
const User = require('../../models/User');
const bankService = require('../../services/bankService');
const { activeQuestionFilter } = require('../../constants/questionLifecycle');

const TARGET = Number(process.env.BENCH_TARGET_COUNT || 10000);
const BATCH = 500;
const P95_LIMIT_MS = Number(process.env.BENCH_P95_MS || 2500);
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mathexam_bench';

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function ensureSeed(bankId) {
  const existing = await Question.countDocuments(activeQuestionFilter({ bankId }));
  if (existing >= TARGET) {
    console.log(`bench: pool already ${existing} >= ${TARGET}`);
    return existing;
  }
  const need = TARGET - existing;
  console.log(`bench: inserting ${need} questions (batch ${BATCH})…`);
  const base = Date.now();
  for (let off = 0; off < need; off += BATCH) {
    const chunk = [];
    const n = Math.min(BATCH, need - off);
    for (let i = 0; i < n; i += 1) {
      const idx = existing + off + i;
      chunk.push({
        bankId,
        questionText: `bench-fill-${base}-${idx}`,
        type: '填空题',
        totalScore: 4,
        difficulty: '中',
        subject: 'bench',
        correctAnswer: '略',
        createdBy: 'bench',
      });
    }
    await Question.insertMany(chunk, { ordered: false });
  }
  return Question.countDocuments(activeQuestionFilter({ bankId }));
}

async function timeListPage(bankId, limit, offset) {
  const t0 = process.hrtime.bigint();
  const query = activeQuestionFilter({ bankId });
  await Promise.all([
    Question.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Question.countDocuments(query),
  ]);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return ms;
}

async function run() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  await mongoose.connection.db.dropDatabase();

  const user = await User.create({
    username: `bench_${Date.now()}`,
    password: 'x',
    email: `bench_${Date.now()}@example.com`,
    role: 'Basic',
  });
  const bank = await bankService.createPersonalBank(user);
  const bankId = bank._id;

  const total = await ensureSeed(bankId);
  console.log(`bench: total questions ${total}`);

  const samples = [];
  for (let i = 0; i < 8; i += 1) {
    samples.push(await timeListPage(bankId, 50, i * 50));
  }
  samples.sort((a, b) => a - b);
  const p95 = percentile(samples, 95);
  console.log(`bench: list page samples ms=${samples.map((x) => x.toFixed(1)).join(', ')}`);
  console.log(`bench: p95=${p95.toFixed(1)}ms limit=${P95_LIMIT_MS}ms`);

  await mongoose.disconnect();

  if (p95 > P95_LIMIT_MS) {
    console.error('bench: FAILED p95 exceeds limit');
    process.exit(1);
  }
  console.log('bench: OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
