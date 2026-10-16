const { getPlatformSettings } = require('./platformSettingsService');
const { suggestQuestionMetadata } = require('./llmAssistService');

async function attachLlmSuggestions(questions, bankId) {
  const settings = await getPlatformSettings();
  if (!settings.llmAssistEnabled || !questions?.length) {
    return { llmSuggestions: [], settings, knowledgePoints: [] };
  }
  const KnowledgePoint = require('../models/KnowledgePoint');
  const kpNodes = await KnowledgePoint.find({ bankId }).select('_id path name subject').lean();
  const llmSuggestions = [];
  for (const q of questions) {
    const suggestion = await suggestQuestionMetadata(
      {
        questionText: q.questionText,
        type: q.type,
        subject: q.subject || '解析几何',
        knowledgePoints: kpNodes,
      },
      settings,
    );
    llmSuggestions.push(suggestion);
  }
  return { llmSuggestions, settings, knowledgePoints: kpNodes };
}

function parseMetadataOverrides(body) {
  if (!body.metadataOverrides) return null;
  try {
    const raw = typeof body.metadataOverrides === 'string'
      ? JSON.parse(body.metadataOverrides)
      : body.metadataOverrides;
    return Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

module.exports = {
  attachLlmSuggestions,
  parseMetadataOverrides,
};
