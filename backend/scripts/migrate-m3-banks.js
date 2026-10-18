#!/usr/bin/env node
/**
 * 为已有用户创建个人题库，并为无 bankId 的题目/知识点绑定到对应用户的默认库。
 * 无 createdBy 的遗留题目可指定 --fallback-user-id= 或 --fallback-username=（如 vanabel）。
 *
 * 默认 dry-run；写入请加 --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Question = require('../models/Question');
const KnowledgePoint = require('../models/KnowledgePoint');
const bankService = require('../services/bankService');
const { parseMigrateM3Args, planOrphanQuestionBindings } = require('./lib/migrateM3Plan');

const orphanFilter = { $or: [{ bankId: { $exists: false } }, { bankId: null }] };

/**
 * @param {{ dryRun: boolean, fallbackUserId: string | null, fallbackUsername: string | null }}
 */
async function runMigrateM3({ dryRun, fallbackUserId, fallbackUsername }) {
  const users = await User.find({});
  let personalBanksCreated = 0;
  for (const user of users) {
    const existing = await bankService.getDefaultBankId(user._id);
    if (existing) continue;
    personalBanksCreated += 1;
    if (!dryRun) {
      await bankService.createPersonalBank(user);
    }
  }

  let fallbackUser = null;
  if (fallbackUserId) {
    fallbackUser = await User.findById(fallbackUserId);
  }
  if (!fallbackUser && fallbackUsername) {
    fallbackUser = await User.findOne({ username: fallbackUsername });
  }
  if ((fallbackUserId || fallbackUsername) && !fallbackUser) {
    throw new Error(
      `Fallback user not found (user-id=${fallbackUserId || ''}, username=${fallbackUsername || ''})`,
    );
  }

  const orphanQuestions = await Question.find(orphanFilter).lean();
  const userByUsername = new Map(users.map((u) => [u.username, u]));
  const questionPlan = planOrphanQuestionBindings(orphanQuestions, userByUsername, fallbackUser);

  if (!dryRun) {
    for (const q of orphanQuestions) {
      let user = null;
      if (q.createdBy && userByUsername.has(q.createdBy)) {
        user = userByUsername.get(q.createdBy);
      } else if (fallbackUser) {
        user = fallbackUser;
      }
      if (!user) {
        console.warn('跳过无归属题目', q._id);
        continue;
      }
      await bankService.createPersonalBank(user);
      const bankId = await bankService.getDefaultBankId(user._id);
      if (!bankId) continue;
      await Question.updateOne({ _id: q._id }, { $set: { bankId } });
    }
  }

  const orphanKp = await KnowledgePoint.find(orphanFilter);
  let knowledgePointsBoundToFallback = 0;
  if (orphanKp.length && fallbackUser) {
    if (!dryRun) {
      await bankService.createPersonalBank(fallbackUser);
    }
    const bankId = await bankService.getDefaultBankId(fallbackUser._id);
    if (bankId) {
      knowledgePointsBoundToFallback = orphanKp.length;
      if (!dryRun) {
        await KnowledgePoint.updateMany(orphanFilter, { $set: { bankId } });
      }
    }
  }

  if (!dryRun) {
    await Question.syncIndexes();
    await KnowledgePoint.syncIndexes();
  }

  return {
    dryRun,
    users: users.length,
    personalBanksCreated,
    orphanQuestions: orphanQuestions.length,
    questionPlan,
    orphanKnowledgePoints: orphanKp.length,
    knowledgePointsBoundToFallback,
    fallbackUser: fallbackUser ? { id: String(fallbackUser._id), username: fallbackUser.username } : null,
  };
}

async function main() {
  const { dryRun, fallbackUserId, fallbackUsername } = parseMigrateM3Args(process.argv.slice(2));
  await connectDB();
  const summary = await runMigrateM3({ dryRun, fallbackUserId, fallbackUsername });
  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runMigrateM3, orphanFilter };
