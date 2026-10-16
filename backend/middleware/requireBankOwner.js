const { hasMinRole } = require('../constants/bankRoles');

function requireBankOwner(req, res, next) {
  if (req.bankRole && hasMinRole(req.bankRole, 'owner')) {
    return next();
  }
  return res.status(403).json({ error: '需要题库所有者权限' });
}

module.exports = requireBankOwner;
