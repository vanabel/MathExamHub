const mongoose = require('mongoose');

const platformAuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorUsername: { type: String, default: '' },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank' },
  detail: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

platformAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PlatformAuditLog', platformAuditLogSchema);
