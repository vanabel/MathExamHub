const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  llmAssistEnabled: { type: Boolean, default: false },
  llmProvider: {
    type: String,
    enum: ['mock', 'openai_compatible'],
    default: 'mock',
  },
  llmApiBaseUrl: { type: String, default: '', trim: true },
  llmModel: { type: String, default: 'deepseek-ai/DeepSeek-V4.1-Flash', trim: true },
  llmApiKey: { type: String, select: false },
  llmTimeoutMs: { type: Number, default: 120000, min: 3000, max: 300000 },
  llmPreviewMaxQuestions: { type: Number, default: 20, min: 1, max: 200 },
  llmPreviewConcurrency: { type: Number, default: 3, min: 1, max: 10 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
