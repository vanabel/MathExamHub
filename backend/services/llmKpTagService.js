const KnowledgePoint = require('../models/KnowledgePoint');
const Question = require('../models/Question');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const { buildQuestionMetadataInput } = require('./llmAssistService');
const { suggestKnowledgePointsForQuestion } = require('./llmKpSuggestService');
const { settingsForLlmAssist } = require('./llmProviderResolve');
const { mapWithConcurrency } = require('./latexImportLlmHelper');
const { mergeKnowledgePointIds } = require('../utils/knowledgePointApply');
const {
  resolveRelabelConcurrency,
  isTimeoutLlmError,
} = require('./llmRelabelService');

const KP_TAG_TIMEOUT_BACKOFF_MS = [2000, 5000];
const KP_TAG_TIMEOUT_RETRIES = 2;

async function suggestKpWithTimeoutRetries(input, settings) {
  const maxRetries = settings.relabelTimeoutRetries ?? KP_TAG_TIMEOUT_RETRIES;
  const backoffs = settings.relabelTimeoutBackoffMs ?? KP_TAG_TIMEOUT_BACKOFF_MS;
  let last;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    last = await suggestKnowledgePointsForQuestion(input, settings);
    if (last.source === 'llm') return last;
    if (last.llmError && isTimeoutLlmError(last.llmError) && attempt < maxRetries) {
      const delayMs = backoffs[attempt] ?? 5000;
      await new Promise((resolve) => { setTimeout(resolve, delayMs); });
      continue;
    }
    return last;
  }
  return last;
}

async function buildKpTagSuggestionsForQuestions(questions, bankId, platformSettings, opts = {}) {
  const kps = await KnowledgePoint.find({ bankId }).sort({ path: 1 }).lean();
  const settings = settingsForLlmAssist(platformSettings);
  const concurrency = resolveRelabelConcurrency(platformSettings, opts.concurrency);

  return mapWithConcurrency(
    questions,
    concurrency,
    async (q) => {
      const result = await suggestKpWithTimeoutRetries(
        buildQuestionMetadataInput(q, kps),
        settings,
      );
      const current = (q.knowledgePointIds || []).map(String);
      const suggested = result.suggestedKnowledgePointIds || [];
      const toAdd = suggested.filter((id) => !current.includes(id));
      return {
        questionId: String(q._id),
        type: q.type,
        subject: q.subject,
        currentKnowledgePointIds: current,
        suggestions: result.suggestions || [],
        suggestedKnowledgePointIds: suggested,
        wouldAddKnowledgePointIds: toAdd,
        source: result.source,
        llmError: result.llmError,
        rationale: result.rationale,
      };
    },
  );
}

async function applyKpTagUpdates(bankId, updates, { replace = false } = {}) {
  let modified = 0;
  for (const row of updates || []) {
    const questionId = row.questionId || row.id;
    const ids = row.knowledgePointIds
      ?? row.applyKnowledgePointIds
      ?? row.suggestedKnowledgePointIds;
    if (!questionId || !Array.isArray(ids)) continue;

    const q = await Question.findOne(activeQuestionFilter({ _id: questionId, bankId }));
    if (!q) continue;
    const merged = mergeKnowledgePointIds(q.knowledgePointIds, ids, replace);
    const before = (q.knowledgePointIds || []).map(String).sort().join(',');
    const after = merged.sort().join(',');
    if (before === after) continue;
    q.knowledgePointIds = merged;
    q.updatedAt = new Date();
    await q.save();
    modified += 1;
  }
  return { modified };
}

async function applyKpTagSuggestionsFromReport(bankId, suggestions, { replace = false } = {}) {
  const updates = (suggestions || [])
    .filter((s) => (s.wouldAddKnowledgePointIds?.length || s.suggestedKnowledgePointIds?.length))
    .map((s) => ({
      questionId: s.questionId,
      knowledgePointIds: s.applyKnowledgePointIds
        ?? s.wouldAddKnowledgePointIds
        ?? s.suggestedKnowledgePointIds,
    }));
  return applyKpTagUpdates(bankId, updates, { replace });
}

module.exports = {
  buildKpTagSuggestionsForQuestions,
  applyKpTagUpdates,
  applyKpTagSuggestionsFromReport,
  suggestKpWithTimeoutRetries,
};
