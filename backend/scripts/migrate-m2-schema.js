#!/usr/bin/env node
/**
 * M2  schema 迁移：难度枚举、contentHash 回填、索引同步。
 *
 * 用法：
 *   node scripts/migrate-m2-schema.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Question = require('../models/Question');
const KnowledgePoint = require('../models/KnowledgePoint');
const { mapDifficultyForMigration } = require('../constants/difficulty');
const { resolveContentHash } = require('../utils/contentHash');

async function migrateQuestions({ dryRun }) {
  const usedHashes = new Set();
  const cursor = Question.find({}).cursor();
  let updated = 0;

  for await (const doc of cursor) {
    const nextDifficulty = mapDifficultyForMigration(doc.difficulty);
    const nextHash = resolveContentHash(doc, usedHashes);
    const patch = {
      difficulty: nextDifficulty,
      usageCount: doc.usageCount ?? 0,
      status: doc.status || 'published',
    };
    if (nextHash) patch.contentHash = nextHash;
    if (!doc.knowledgePointIds) patch.knowledgePointIds = [];

    if (dryRun) {
      updated += 1;
      continue;
    }
    await Question.updateOne({ _id: doc._id }, { $set: patch });
    updated += 1;
  }

  return updated;
}

async function syncIndexes({ dryRun }) {
  if (dryRun) {
    return { questions: 'skipped (dry-run)', knowledgePoints: 'skipped (dry-run)' };
  }
  await Question.syncIndexes();
  await KnowledgePoint.syncIndexes();
  return { questions: 'synced', knowledgePoints: 'synced' };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();

  console.log(`M2 migration${dryRun ? ' (dry-run)' : ''}...`);
  const count = await migrateQuestions({ dryRun });
  console.log(`Questions processed: ${count}`);
  const indexes = await syncIndexes({ dryRun });
  console.log('Indexes:', indexes);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  migrateQuestions,
  syncIndexes,
};
