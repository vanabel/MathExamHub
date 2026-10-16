const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  llmAssistEnabled: { type: Boolean, default: false },
  llmProvider: {
    type: String,
    enum: ['mock', 'openai'],
    default: 'mock',
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
