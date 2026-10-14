const mongoose = require('mongoose');
const bankService = require('../services/bankService');

/**
 * 解析当前题库上下文：Header `X-Bank-Id` 或 query `bankId`，否则个人默认库。
 */
async function bankContext(req, res, next) {
  try {
    let bankId = req.get('X-Bank-Id') || req.query.bankId;
    if (bankId) {
      if (!mongoose.Types.ObjectId.isValid(String(bankId))) {
        return res.status(400).json({ error: '无效的 bankId' });
      }
      bankId = new mongoose.Types.ObjectId(String(bankId));
    } else {
      bankId = await bankService.getDefaultBankId(req.user._id);
      if (!bankId) {
        const bank = await bankService.createPersonalBank(req.user);
        bankId = bank._id;
      }
    }

    const role = await bankService.assertBankAccess(req.user._id, bankId, 'viewer');
    req.bankId = bankId;
    req.bankRole = role;
    next();
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || '题库上下文错误' });
  }
}

function requireBankWrite(req, res, next) {
  const { hasMinRole } = require('../constants/bankRoles');
  if (req.bankRole && hasMinRole(req.bankRole, 'editor')) {
    return next();
  }
  return res.status(403).json({ error: '需要编辑权限' });
}

module.exports = {
  bankContext,
  requireBankWrite,
};
