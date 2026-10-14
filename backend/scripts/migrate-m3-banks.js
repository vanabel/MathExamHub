#!/usr/bin/env node
/**
 * 为已有用户创建个人题库，并为无 bankId 的题目/知识点绑定到对应用户的默认库。
 * 无 createdBy 的遗留题目需人工指定 --fallback-user-id=...
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Question = require('../models/Question');
const KnowledgePoint = require('../models/KnowledgePoint');
const bankService = require('../services/bankService');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const fallbackArg = process.argv.find((a) => a.startsWith('--fallback-user-id='));
  const fallbackUserId = fallbackArg ? fallbackArg.split('=')[1] : null;

  await connectDB();
  const users = await User.find({});
  for (const user of users) {
    if (dryRun) continue;
    await bankService.createPersonalBank(user);
  }

  const orphanQuestions = await Question.find({ bankId: { $exists: false } });
  for (const q of orphanQuestions) {
    let user = null;
    if (q.createdBy) {
      user = await User.findOne({ username: q.createdBy });
    }
    if (!user && fallbackUserId) {
      user = await User.findById(fallbackUserId);
    }
    if (!user) {
      console.warn('跳过无归属题目', q._id);
      continue;
    }
    const bankId = await bankService.getDefaultBankId(user._id);
    if (!bankId) continue;
    if (!dryRun) {
      await Question.updateOne({ _id: q._id }, { $set: { bankId } });
    }
  }

  const orphanKp = await KnowledgePoint.find({ bankId: { $exists: false } });
  if (orphanKp.length && fallbackUserId) {
    const bankId = await bankService.getDefaultBankId(fallbackUserId);
    if (bankId && !dryRun) {
      await KnowledgePoint.updateMany(
        { bankId: { $exists: false } },
        { $set: { bankId } },
      );
    }
  }

  if (!dryRun) {
    await Question.syncIndexes();
    await KnowledgePoint.syncIndexes();
  }

  console.log('migrate-m3-banks complete', { dryRun, users: users.length, orphanQuestions: orphanQuestions.length });
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
