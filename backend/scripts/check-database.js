#!/usr/bin/env node
/**
 * Read-only database health summary for ops (uses backend/.env MONGODB_URI).
 *
 *   node backend/scripts/check-database.js
 *   node backend/scripts/check-database.js --json
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Question = require('../models/Question');
const QuestionBank = require('../models/QuestionBank');
const KnowledgePoint = require('../models/KnowledgePoint');
const { buildDatabaseHealthReport } = require('./lib/databaseHealthReport');

function printHuman(report) {
  const { counts, questionsByType, questionsByDifficulty, migrations } = report;
  console.log('MathExamHub database summary\n');
  console.log(`Users:     ${counts.users}`);
  console.log(`Banks:     ${counts.banks}`);
  console.log(`Questions: ${counts.questions}\n`);

  console.log('Questions by type:');
  for (const [type, n] of Object.entries(questionsByType)) {
    console.log(`  ${type}: ${n}`);
  }
  console.log('\nQuestions by difficulty:');
  for (const [d, n] of Object.entries(questionsByDifficulty)) {
    console.log(`  ${d}: ${n}`);
  }

  console.log('\nMigration status:');
  console.log(`  Stem images migrated:  ${migrations.stemImagesMigrated ? 'yes' : 'no'} (pending ${migrations.stemImagesPendingCount})`);
  console.log(`  Difficulty v2 (易/中/难): ${migrations.difficultyV2Complete ? 'yes' : 'no'} (legacy/non-v2 ${migrations.difficultyLegacyCount})`);
  console.log(`  contentHash present:   ${migrations.contentHashPresent ? 'yes' : 'no'} (missing ${migrations.contentHashMissingCount})`);
  console.log(`  Banks bound:           ${migrations.banksBound ? 'yes' : 'no'} (orphan Q ${migrations.orphanQuestions}, orphan KP ${migrations.orphanKnowledgePoints})`);
}

async function main() {
  const asJson = process.argv.includes('--json');
  await connectDB();
  const report = await buildDatabaseHealthReport({
    Question,
    User,
    QuestionBank,
    KnowledgePoint,
  });
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { printHuman };
