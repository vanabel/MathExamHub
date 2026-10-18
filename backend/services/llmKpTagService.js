const KnowledgePoint = require('../models/KnowledgePoint');
const Question = require('../models/Question');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const {
  buildQuestionMetadataInput,
  buildKpCatalog,
  filterLeafKnowledgePoints,
} = require('./llmAssistService');
const { suggestKnowledgePointsForQuestion } = require('./llmKpSuggestService');
const { settingsForLlmAssist } = require('./llmProviderResolve');
const { mapWithConcurrency } = require('./latexImportLlmHelper');
const {
  mergeKnowledgePointIds,
  linksFromLlmSuggestions,
  reconcileLinksFromIds,
} = require('../utils/knowledgePointApply');
const { applyKpTagSelectionPolicy } = require('../utils/kpTagSelectionPolicy');
const {
  resolveRelabelConcurrency,
  isTimeoutLlmError,
} = require('./llmRelabelService');

const KP_TAG_TIMEOUT_BACKOFF_MS = [2000, 5000];
const KP_TAG_TIMEOUT_RETRIES = 2;

function parseTaggingOptions(body = {}) {
  const maxRaw = Number(body.maxKpsPerQuestion ?? body.maxKps ?? 1);
  const maxKpsPerQuestion = Math.min(3, Math.max(1, Number.isNaN(maxRaw) ? 1 : maxRaw));
  const extraRaw = Number(body.extraMinConfidence ?? body.minConfidenceForExtra ?? 0.85);
  const extraMinConfidence = Number.isNaN(extraRaw) ? 0.85 : extraRaw;
  const untaggedOnly = body.includeTagged !== true && body.untaggedOnly !== false;
  return { maxKpsPerQuestion, extraMinConfidence, untaggedOnly };
}

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

async function loadQuestionsForKpTag(bankId, body, query) {
  if (Array.isArray(body?.questionIds) && body.questionIds.length) {
    return Question.find(activeQuestionFilter({
      bankId,
      _id: { $in: body.questionIds },
    }))
      .select('_id questionText type subject difficulty totalScore correctAnswer solution options knowledgePointIds knowledgePointLinks')
      .lean();
  }
  const filters = { ...(body?.filters || {}), ...(query || {}) };
  if (body?.subject) filters.subject = body.subject;
  const { untaggedOnly } = parseTaggingOptions(body);
  if (untaggedOnly) filters.untaggedOnly = 'true';
  const { buildQuestionListFilter } = require('../utils/questionListQuery');
  const mongoQuery = buildQuestionListFilter({ bankId, query: filters });
  return Question.find(mongoQuery)
    .select('_id questionText type subject difficulty totalScore correctAnswer solution options knowledgePointIds knowledgePointLinks')
    .lean();
}

async function buildKpTagSuggestionsForQuestions(questions, bankId, platformSettings, opts = {}) {
  const kpQuery = { bankId };
  if (opts.subject) kpQuery.subject = String(opts.subject).trim();
  const kps = await KnowledgePoint.find(kpQuery).sort({ path: 1 }).lean();
  const kpCatalog = buildKpCatalog(kps);
  const settings = settingsForLlmAssist(platformSettings);
  const concurrency = resolveRelabelConcurrency(platformSettings, opts.concurrency);
  const policyOpts = {
    maxKpsPerQuestion: opts.maxKpsPerQuestion ?? 1,
    extraMinConfidence: opts.extraMinConfidence ?? 0.85,
  };

  return mapWithConcurrency(
    questions,
    concurrency,
    async (q) => {
      let scopedKps = opts.subject
        ? kps.filter((k) => k.subject === opts.subject)
        : kps;
      if (opts.leafOnlyCatalog) {
        scopedKps = filterLeafKnowledgePoints(scopedKps);
      }
      const result = await suggestKpWithTimeoutRetries(
        buildQuestionMetadataInput(q, scopedKps),
        settings,
      );
      const current = (q.knowledgePointIds || []).map(String);
      const rawSuggestions = result.suggestions || [];
      const suggestions = applyKpTagSelectionPolicy(
        rawSuggestions,
        buildKpCatalog(scopedKps),
        policyOpts,
      );
      const suggestedKnowledgePointIds = suggestions.map((s) => s.knowledgePointId);
      const toAdd = suggestedKnowledgePointIds.filter((id) => !current.includes(id));
      return {
        questionId: String(q._id),
        type: q.type,
        subject: q.subject,
        questionPreview: String(q.questionText || '').slice(0, 120),
        currentKnowledgePointIds: current,
        currentKnowledgePointLinks: q.knowledgePointLinks || [],
        suggestions,
        rawSuggestions,
        suggestedKnowledgePointIds,
        wouldAddKnowledgePointIds: toAdd,
        source: result.source,
        llmError: result.llmError,
        rationale: result.rationale,
        policy: policyOpts,
      };
    },
  );
}

async function applyKpTagUpdates(bankId, updates, { replace = false } = {}) {
  let modified = 0;
  for (const row of updates || []) {
    const questionId = row.questionId || row.id;
    if (!questionId) continue;

    const q = await Question.findOne(activeQuestionFilter({ _id: questionId, bankId }));
    if (!q) continue;

    const beforeIds = (q.knowledgePointIds || []).map(String).sort().join(',');
    const beforeLinks = JSON.stringify(q.knowledgePointLinks || []);

    let nextLinks;
    if (Array.isArray(row.knowledgePointLinks) && row.knowledgePointLinks.length) {
      nextLinks = row.knowledgePointLinks.map((l) => ({
        knowledgePointId: l.knowledgePointId,
        source: l.source === 'llm' ? 'llm' : 'manual',
        confidence: l.confidence,
        reviewedBy: l.reviewedBy || row.reviewedBy || '',
      }));
    } else {
      const ids = row.knowledgePointIds
        ?? row.applyKnowledgePointIds
        ?? row.suggestedKnowledgePointIds;
      if (!Array.isArray(ids)) continue;
      const suggestionMeta = row.suggestionMeta || row.suggestions;
      const emptyBefore = !(q.knowledgePointIds?.length);
      if (Array.isArray(suggestionMeta) && suggestionMeta.length) {
        nextLinks = linksFromLlmSuggestions(suggestionMeta, {
          replace: replace || emptyBefore,
          existingLinks: replace || emptyBefore ? [] : q.knowledgePointLinks,
        });
        const idSet = new Set(ids.map(String));
        nextLinks = nextLinks.filter((l) => idSet.has(String(l.knowledgePointId)));
      } else if (replace || emptyBefore) {
        nextLinks = ids.map((id) => ({ knowledgePointId: id, source: 'llm' }));
      } else {
        const mergedIds = mergeKnowledgePointIds(q.knowledgePointIds, ids, false);
        nextLinks = reconcileLinksFromIds(q.knowledgePointLinks, mergedIds);
        for (const id of ids) {
          const link = nextLinks.find((l) => String(l.knowledgePointId) === String(id));
          if (link && row.source === 'llm') link.source = 'llm';
        }
      }
    }

    q.knowledgePointLinks = nextLinks;
    const afterIds = nextLinks.map((l) => String(l.knowledgePointId)).sort().join(',');
    const afterLinks = JSON.stringify(nextLinks);
    if (beforeIds !== afterIds || beforeLinks !== afterLinks) {
      q.updatedAt = new Date();
      await q.save();
      modified += 1;
    }
  }
  return { modified };
}

async function applyKpTagSuggestionsFromReport(bankId, suggestions, { replace = false } = {}) {
  const updates = (suggestions || [])
    .filter((s) => s.rejected !== true)
    .filter((s) => (s.acceptedKnowledgePointIds?.length
      || s.wouldAddKnowledgePointIds?.length
      || s.suggestedKnowledgePointIds?.length))
    .map((s) => ({
      questionId: s.questionId,
      knowledgePointIds: s.acceptedKnowledgePointIds
        ?? s.applyKnowledgePointIds
        ?? s.wouldAddKnowledgePointIds
        ?? s.suggestedKnowledgePointIds,
      suggestionMeta: s.acceptedSuggestions ?? s.suggestions,
    }));
  return applyKpTagUpdates(bankId, updates, { replace });
}

module.exports = {
  buildKpTagSuggestionsForQuestions,
  applyKpTagUpdates,
  applyKpTagSuggestionsFromReport,
  suggestKpWithTimeoutRetries,
  parseTaggingOptions,
  loadQuestionsForKpTag,
};
