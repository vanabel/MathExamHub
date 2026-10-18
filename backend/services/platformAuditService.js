const PlatformAuditLog = require('../models/PlatformAuditLog');

async function logPlatformAudit({
  action,
  actorUserId,
  actorUsername,
  targetType,
  targetId,
  bankId,
  detail,
}) {
  return PlatformAuditLog.create({
    action,
    actorUserId: actorUserId || undefined,
    actorUsername: actorUsername || '',
    targetType: targetType || '',
    targetId: targetId ? String(targetId) : '',
    bankId: bankId || undefined,
    detail: detail || {},
  });
}

module.exports = {
  logPlatformAudit,
};
