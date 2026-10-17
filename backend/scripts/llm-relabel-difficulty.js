#!/usr/bin/env node
/**
 * Batch LLM difficulty relabel suggestions for one bank (report file; optional apply).
 *
 * Usage:
 *   node scripts/llm-relabel-difficulty.js --bankId=<mongoId> [--out=report.json]
 *   node scripts/llm-relabel-difficulty.js --bankId=<mongoId> --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Question = require('../models/Question');
const platformSettingsService = require('../services/platformSettingsService');
const { buildRelabelSuggestionsForQuestions } = require('../services/llmRelabelService');
const { activeQuestionFilter } = require('../constants/questionLifecycle');

function parseArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main() {
  const bankId = parseArg('bankId');
  if (!bankId) {
    console.error('Missing --bankId=<mongoId>');
    process.exit(1);
  }
  const apply = process.argv.includes('--apply');
  const outPath = parseArg('out') || path.join(__dirname, `llm-relabel-${bankId}-${Date.now()}.json`);

  await connectDB();
  const platformSettings = await platformSettingsService.getPlatformSettings();
  const questions = await Question.find(activeQuestionFilter({ bankId }))
    .select('_id questionText type subject difficulty totalScore')
    .lean();
  const suggestions = await buildRelabelSuggestionsForQuestions(questions, bankId, platformSettings);
  const changed = suggestions.filter(
    (s) => s.suggestedDifficulty && s.suggestedDifficulty !== s.currentDifficulty,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    bankId,
    dryRun: !apply,
    total: suggestions.length,
    changed: changed.length,
    suggestions,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Report written: ${outPath}`);

  if (apply) {
    let modified = 0;
    for (const row of changed) {
      const res = await Question.updateOne(
        activeQuestionFilter({ _id: row.questionId, bankId }),
        { $set: { difficulty: row.suggestedDifficulty, updatedAt: new Date() } },
      );
      modified += res.modifiedCount || 0;
    }
    console.log(`Applied difficulty updates: ${modified}`);
  }

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
