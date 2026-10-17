#!/usr/bin/env node
/**
 * Batch LLM difficulty relabel suggestions for one bank (report file; optional apply).
 *
 * Usage:
 *   node scripts/llm-relabel-difficulty.js --bankId=<mongoId> [--out=report.json] [--concurrency=3]
 *   node scripts/llm-relabel-difficulty.js --bankId=<mongoId> --apply
 *   node scripts/llm-relabel-difficulty.js --from=report.json --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Question = require('../models/Question');
const platformSettingsService = require('../services/platformSettingsService');
const {
  buildRelabelSuggestionsForQuestions,
  applyRelabelSuggestionsFromReport,
} = require('../services/llmRelabelService');
const { activeQuestionFilter } = require('../constants/questionLifecycle');

function parseArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function loadReport(fromPath) {
  const abs = path.isAbsolute(fromPath) ? fromPath : path.join(process.cwd(), fromPath);
  const raw = fs.readFileSync(abs, 'utf8');
  const report = JSON.parse(raw);
  if (!Array.isArray(report.suggestions)) {
    throw new Error('Report missing suggestions array');
  }
  return report;
}

async function main() {
  const fromReportPath = parseArg('from');
  const apply = process.argv.includes('--apply');
  const concurrency = parseArg('concurrency');

  if (fromReportPath && apply) {
    const report = loadReport(fromReportPath);
    const bankId = parseArg('bankId') || report.bankId;
    if (!bankId) {
      console.error('Missing bankId (use --bankId= or ensure report.bankId)');
      process.exit(1);
    }
    await connectDB();
    const { modified, changed } = await applyRelabelSuggestionsFromReport(
      bankId,
      report.suggestions,
    );
    console.log(JSON.stringify({
      mode: 'apply-from-report',
      bankId,
      reportPath: fromReportPath,
      changed,
      modified,
    }, null, 2));
    await mongoose.disconnect();
    return;
  }

  const bankId = parseArg('bankId');
  if (!bankId) {
    console.error('Missing --bankId=<mongoId>');
    process.exit(1);
  }
  const outPath = parseArg('out') || path.join(__dirname, `llm-relabel-${bankId}-${Date.now()}.json`);

  await connectDB();
  const platformSettings = await platformSettingsService.getPlatformSettings();
  const questions = await Question.find(activeQuestionFilter({ bankId }))
    .select('_id questionText type subject difficulty totalScore correctAnswer solution options')
    .lean();
  const suggestions = await buildRelabelSuggestionsForQuestions(
    questions,
    bankId,
    platformSettings,
    { concurrency },
  );
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
    const { modified } = await applyRelabelSuggestionsFromReport(bankId, suggestions);
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
