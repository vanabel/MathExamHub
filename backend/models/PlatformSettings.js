const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  llmAssistEnabled: { type: Boolean, default: false },
  llmProvider: {
    type: String,
    enum: ['mock', 'openai_compatible'],
    default: 'mock',
  },
  llmApiBaseUrl: { type: String, default: 'https://api.openai.com/v1', trim: true },
  llmModel: { type: String, default: 'gpt-4o-mini', trim: true },
  llmApiKey: { type: String, select: false },
  llmTimeoutMs: { type: Number, default: 12000, min: 3000, max: 60000 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
