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
  const banks = await QuestionBank.find({ _id: { $in: bankIds } }).lean();
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

async function assertBankAccess(userId, bankId, minRole = 'viewer') {
  const role = await getMemberRole(userId, bankId);
  if (!role || !hasMinRole(role, minRole)) {
    const err = new Error('无权访问该题库');
    err.status = 403;
    throw err;
  }
  return role;
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
};
