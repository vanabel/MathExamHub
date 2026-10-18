const KnowledgePoint = require('../models/KnowledgePoint');
const Question = require('../models/Question');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const {
  suggestQuestionMetadata,
  buildQuestionMetadataInput,
} = require('./llmAssistService');
const { settingsForLlmAssist } = require('./llmProviderResolve');
const { mapWithConcurrency } = require('./latexImportLlmHelper');

const RELABEL_TIMEOUT_BACKOFF_MS = [2000, 5000];
const RELABEL_TIMEOUT_RETRIES = 2;

function isTimeoutLlmError(message) {
  return /abort|timeout|timed out|ETIMEDOUT|ECONNRESET/i.test(String(message || ''));
}

async function suggestWithTimeoutRetries(input, settings) {
  const maxRetries = settings.relabelTimeoutRetries ?? RELABEL_TIMEOUT_RETRIES;
  const backoffs = settings.relabelTimeoutBackoffMs ?? RELABEL_TIMEOUT_BACKOFF_MS;
  let last;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    last = await suggestQuestionMetadata(input, settings);
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

function resolveRelabelConcurrency(platformSettings, override) {
  if (override != null && String(override).trim() !== '') {
    const n = parseInt(String(override).trim(), 10);
    if (!Number.isNaN(n) && n >= 1) return Math.min(10, n);
  }
  const fromEnv = process.env.LLM_RELABEL_CONCURRENCY;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    const n = parseInt(String(fromEnv).trim(), 10);
    if (!Number.isNaN(n) && n >= 1) return Math.min(10, n);
  }
  return platformSettings?.llmPreviewConcurrency ?? 3;
}

async function buildRelabelSuggestionsForQuestions(questions, bankId, platformSettings, opts = {}) {
  const kps = await KnowledgePoint.find({ bankId }).lean();
  const settings = settingsForLlmAssist(platformSettings);
  const concurrency = resolveRelabelConcurrency(platformSettings, opts.concurrency);

  const suggestions = await mapWithConcurrency(
    questions,
    concurrency,
    async (q) => {
      const suggestion = await suggestWithTimeoutRetries(
        buildQuestionMetadataInput(q, kps),
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
        llmError: suggestion?.llmError,
        rationale: suggestion?.rationale,
      };
    },
  );
  return suggestions;
}

async function applyRelabelSuggestionsFromReport(bankId, suggestions) {
  const rows = (suggestions || []).filter(
    (s) => s.suggestedDifficulty && s.suggestedDifficulty !== s.currentDifficulty,
  );
  let modified = 0;
  for (const row of rows) {
    const res = await Question.updateOne(
      activeQuestionFilter({ _id: row.questionId, bankId }),
      { $set: { difficulty: row.suggestedDifficulty, updatedAt: new Date() } },
    );
    modified += res.modifiedCount || 0;
  }
  return { modified, changed: rows.length };
}

module.exports = {
  buildRelabelSuggestionsForQuestions,
  applyRelabelSuggestionsFromReport,
  resolveRelabelConcurrency,
  suggestWithTimeoutRetries,
  isTimeoutLlmError,
};
