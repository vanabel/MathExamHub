function requirePlatformAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === 'admin' || role === 'Admin') {
    return next();
  }
  return res.status(403).json({ error: '需要平台管理员权限' });
}

module.exports = requirePlatformAdmin;
