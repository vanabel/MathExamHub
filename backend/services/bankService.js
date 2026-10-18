const QuestionBank = require('../models/QuestionBank');
const BankMember = require('../models/BankMember');
const { hasMinRole } = require('../constants/bankRoles');

async function createPersonalBank(user) {
  const existing = await QuestionBank.findOne({
    ownerId: user._id,
    isPersonalDefault: true,
  });
  if (existing) {
    return existing;
  }

  const bank = await QuestionBank.create({
    name: `${user.username} 的个人题库`,
    ownerId: user._id,
    kind: 'personal',
    isPersonalDefault: true,
  });

  await BankMember.create({
    bankId: bank._id,
    userId: user._id,
    role: 'owner',
  });

  return bank;
}

async function listBanksForUser(userId) {
  const memberships = await BankMember.find({ userId }).lean();
  const bankIds = memberships.map((m) => m.bankId);
  const banks = await QuestionBank.find({
    _id: { $in: bankIds },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();
  const roleByBank = Object.fromEntries(
    memberships.map((m) => [String(m.bankId), m.role]),
  );
  return banks.map((b) => ({
    ...b,
    role: roleByBank[String(b._id)],
  }));
}

async function getDefaultBankId(userId) {
  const bank = await QuestionBank.findOne({
    ownerId: userId,
    isPersonalDefault: true,
  });
  if (!bank) return null;
  return bank._id;
}

async function getMemberRole(userId, bankId) {
  const member = await BankMember.findOne({ userId, bankId });
  return member ? member.role : null;
}

async function assertBankAccess(userId, bankId, minRole = 'viewer', opts = {}) {
  const allowDeleted = opts.allowDeleted === true;
  const role = await getMemberRole(userId, bankId);
  if (!role || !hasMinRole(role, minRole)) {
    const err = new Error('无权访问该题库');
    err.status = 403;
    throw err;
  }
  const bank = await QuestionBank.findById(bankId).select('deletedAt isPersonalDefault').lean();
  if (bank?.deletedAt && !allowDeleted) {
    const err = new Error('题库已移入回收站，请先恢复');
    err.status = 403;
    throw err;
  }
  return role;
}

function isPlatformAdminUser(user) {
  const role = user?.role;
  return role === 'admin' || role === 'Admin';
}

async function softDeleteBank(userId, bankId, deletedByUsername, opts = {}) {
  const asAdmin = opts.asPlatformAdmin === true;
  if (!asAdmin) {
    await assertBankAccess(userId, bankId, 'owner');
  }
  const bank = await QuestionBank.findById(bankId);
  if (!bank) {
    const err = new Error('题库不存在');
    err.status = 404;
    throw err;
  }
  if (bank.isPersonalDefault) {
    const err = new Error('个人默认题库不能删除');
    err.status = 400;
    throw err;
  }
  if (bank.deletedAt) {
    const err = new Error('题库已在回收站');
    err.status = 409;
    throw err;
  }
  bank.deletedAt = new Date();
  bank.deletedBy = deletedByUsername || String(userId);
  await bank.save();
  return bank;
}

async function restoreBank(userId, bankId, opts = {}) {
  const asAdmin = opts.asPlatformAdmin === true;
  if (!asAdmin) {
    await assertBankAccess(userId, bankId, 'owner', { allowDeleted: true });
  }
  const bank = await QuestionBank.findById(bankId);
  if (!bank || !bank.deletedAt) {
    const err = new Error('回收站中未找到该题库');
    err.status = 404;
    throw err;
  }
  bank.deletedAt = null;
  bank.deletedBy = undefined;
  await bank.save();
  return bank;
}

async function listArchivedBanksForUser(userId) {
  const Question = require('../models/Question');
  const memberships = await BankMember.find({ userId, role: 'owner' }).lean();
  const bankIds = memberships.map((m) => m.bankId);
  const banks = await QuestionBank.find({
    _id: { $in: bankIds },
    deletedAt: { $ne: null },
  })
    .sort({ deletedAt: -1 })
    .lean();
  if (!banks.length) return [];
  const counts = await Question.aggregate([
    { $match: { bankId: { $in: bankIds }, status: { $ne: 'deleted' } } },
    { $group: { _id: '$bankId', questionCount: { $sum: 1 } } },
  ]);
  const countByBank = new Map(counts.map((c) => [String(c._id), c.questionCount]));
  return banks.map((b) => ({
    ...b,
    questionCount: countByBank.get(String(b._id)) || 0,
  }));
}

async function createSharedBank(user, name) {
  const bank = await QuestionBank.create({
    name: name.trim(),
    ownerId: user._id,
    kind: 'shared',
    isPersonalDefault: false,
  });
  await BankMember.create({
    bankId: bank._id,
    userId: user._id,
    role: 'owner',
  });
  return bank;
}

async function addMember(bankId, ownerUserId, { username, role }) {
  await assertBankAccess(ownerUserId, bankId, 'owner');
  const User = require('../models/User');
  const invitee = await User.findOne({ username });
  if (!invitee) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }
  await BankMember.findOneAndUpdate(
    { bankId, userId: invitee._id },
    { role },
    { upsert: true, new: true },
  );
  return invitee;
}

module.exports = {
  createPersonalBank,
  listBanksForUser,
  getDefaultBankId,
  getMemberRole,
  assertBankAccess,
  createSharedBank,
  addMember,
  softDeleteBank,
  restoreBank,
  listArchivedBanksForUser,
  isPlatformAdminUser,
};
