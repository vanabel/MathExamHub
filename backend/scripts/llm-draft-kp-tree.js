#!/usr/bin/env node
/**
 * Draft a knowledge-point tree from bank questions (review-only JSON).
 *
 * Usage:
 *   node scripts/llm-draft-kp-tree.js --bankId=<id> [--subject=解析几何] [--out=draft-kp.json]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const platformSettingsService = require('../services/platformSettingsService');
const { draftKnowledgePointTree } = require('../services/llmDraftKpTreeService');
const { settingsForLlmAssist } = require('../services/llmProviderResolve');

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
  const subject = parseArg('subject') || '';
  const outPath = parseArg('out') || path.join(__dirname, `llm-draft-kp-${bankId}-${Date.now()}.json`);

  await connectDB();
  const platformSettings = await platformSettingsService.getPlatformSettings();
  const settings = settingsForLlmAssist(platformSettings);
  const draft = await draftKnowledgePointTree(bankId, settings, {
    subject: subject || undefined,
    maxQuestions: parseInt(parseArg('maxQuestions') || '50', 10),
  });

  const report = {
    generatedAt: new Date().toISOString(),
    bankId,
    dryRun: true,
    draft,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Draft written: ${outPath}`);

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
