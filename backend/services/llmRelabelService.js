const KnowledgePoint = require('../models/KnowledgePoint');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const { suggestQuestionMetadata } = require('./llmAssistService');
const { settingsForLlmAssist } = require('./llmProviderResolve');
const { mapWithConcurrency } = require('./mapWithConcurrency');

async function buildRelabelSuggestionsForQuestions(questions, bankId, platformSettings) {
  const kps = await KnowledgePoint.find({ bankId }).lean();
  const settings = settingsForLlmAssist(platformSettings);

  const suggestions = await mapWithConcurrency(
    questions,
    platformSettings.llmPreviewConcurrency ?? 3,
    async (q) => {
      const suggestion = await suggestQuestionMetadata(
        {
          questionText: q.questionText,
          type: q.type,
          subject: q.subject,
          knowledgePoints: kps,
        },
        settings,
      );
      return {
        questionId: String(q._id),
        type: q.type,
        subject: q.subject,
        currentDifficulty: q.difficulty,
        suggestedDifficulty: suggestion?.difficulty,
        suggestedKnowledgePointIds: suggestion?.knowledgePointIds || [],
        source: suggestion?.source,
        rationale: suggestion?.rationale,
      };
    },
  );
  return suggestions;
}

module.exports = {
  buildRelabelSuggestionsForQuestions,
};
