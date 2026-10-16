const PlatformSettings = require('../models/PlatformSettings');

async function getPlatformSettings() {
  let doc = await PlatformSettings.findOne({ key: 'global' }).lean();
  if (!doc) {
    doc = (await PlatformSettings.create({ key: 'global' })).toObject();
  }
  return {
    llmAssistEnabled: !!doc.llmAssistEnabled,
    llmProvider: doc.llmProvider || 'mock',
    updatedAt: doc.updatedAt,
  };
}

async function updatePlatformSettings(patch) {
  const update = { updatedAt: new Date() };
  if (typeof patch.llmAssistEnabled === 'boolean') {
    update.llmAssistEnabled = patch.llmAssistEnabled;
  }
  if (patch.llmProvider === 'mock' || patch.llmProvider === 'openai') {
    update.llmProvider = patch.llmProvider;
  }
  const doc = await PlatformSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: update },
    { upsert: true, new: true },
  ).lean();
  return {
    llmAssistEnabled: !!doc.llmAssistEnabled,
    llmProvider: doc.llmProvider,
    updatedAt: doc.updatedAt,
  };
}

module.exports = {
  getPlatformSettings,
  updatePlatformSettings,
};
