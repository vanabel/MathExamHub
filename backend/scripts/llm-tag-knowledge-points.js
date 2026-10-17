#!/usr/bin/env node
/**
 * Batch LLM knowledge-point tagging for one bank.
 *
 * Usage:
 *   node scripts/llm-tag-knowledge-points.js --bankId=<id> [--out=report.json] [--concurrency=3]
 *   node scripts/llm-tag-knowledge-points.js --bankId=<id> --apply
 *   node scripts/llm-tag-knowledge-points.js --from=report.json --apply [--replace]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Question = require('../models/Question');
const platformSettingsService = require('../services/platformSettingsService');
const {
  buildKpTagSuggestionsForQuestions,
  applyKpTagSuggestionsFromReport,
} = require('../services/llmKpTagService');
const { activeQuestionFilter } = require('../constants/questionLifecycle');

function parseArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function loadReport(fromPath) {
  const abs = path.isAbsolute(fromPath) ? fromPath : path.join(process.cwd(), fromPath);
  const report = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!Array.isArray(report.suggestions)) throw new Error('Report missing suggestions array');
  return report;
}

async function main() {
  const fromReportPath = parseArg('from');
  const apply = process.argv.includes('--apply');
  const replace = process.argv.includes('--replace');
  const concurrency = parseArg('concurrency');

  if (fromReportPath && apply) {
    const report = loadReport(fromReportPath);
    const bankId = parseArg('bankId') || report.bankId;
    if (!bankId) {
      console.error('Missing bankId (use --bankId= or ensure report.bankId)');
      process.exit(1);
    }
    await connectDB();
    const { modified } = await applyKpTagSuggestionsFromReport(bankId, report.suggestions, { replace });
    console.log(JSON.stringify({
      mode: 'apply-from-report',
      bankId,
      reportPath: fromReportPath,
      replace,
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
  const outPath = parseArg('out') || path.join(__dirname, `llm-kp-tag-${bankId}-${Date.now()}.json`);

  await connectDB();
  const platformSettings = await platformSettingsService.getPlatformSettings();
  const questions = await Question.find(activeQuestionFilter({ bankId }))
    .select('_id questionText type subject difficulty totalScore correctAnswer solution options knowledgePointIds')
    .lean();
  const suggestions = await buildKpTagSuggestionsForQuestions(
    questions,
    bankId,
    platformSettings,
    { concurrency },
  );
  const withAdds = suggestions.filter((s) => s.wouldAddKnowledgePointIds?.length);

  const report = {
    generatedAt: new Date().toISOString(),
    bankId,
    dryRun: !apply,
    replace,
    total: suggestions.length,
    wouldAdd: withAdds.length,
    suggestions,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Report written: ${outPath}`);

  if (apply) {
    const { modified } = await applyKpTagSuggestionsFromReport(bankId, suggestions, { replace });
    console.log(`Applied KP tags (merge add): ${modified}`);
  }

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
