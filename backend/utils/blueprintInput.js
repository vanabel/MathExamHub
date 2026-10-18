const mongoose = require('mongoose');

const SECTION_FIELD_ALIASES = {
  questionType: 'type',
  question_type: 'type',
  scorePerQuestion: 'scoreEach',
  score_per_question: 'scoreEach',
  perQuestionScore: 'scoreEach',
  knowledgePoints: 'knowledgePointIds',
  knowledgePointId: 'knowledgePointIds',
};

function normalizeSectionInput(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };
  for (const [from, to] of Object.entries(SECTION_FIELD_ALIASES)) {
    if (out[from] !== undefined && out[to] === undefined) {
      out[to] = out[from];
      delete out[from];
    }
  }
  if (out.type != null) out.type = String(out.type).trim();
  if (Array.isArray(out.knowledgePointIds)) {
    out.knowledgePointIds = out.knowledgePointIds.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
  }
  return out;
}

function normalizeBlueprintBody(body) {
  if (!body || typeof body !== 'object') return body;
  const next = { ...body };
  if (Array.isArray(next.sections)) {
    next.sections = next.sections.map(normalizeSectionInput);
  }
  return next;
}

function formatBlueprintValidationError(err) {
  if (!err || err.name !== 'ValidationError') {
    return null;
  }
  const fieldErrors = [];
  for (const [path, sub] of Object.entries(err.errors || {})) {
    fieldErrors.push({
      path,
      message: sub.message,
      kind: sub.kind,
    });
  }
  return {
    error: '蓝图字段校验失败',
    fieldErrors,
    expectedSectionFields: ['type', 'count', 'scoreEach', 'scoreTotal', 'difficultyMix', 'knowledgePointIds'],
    aliasesAccepted: SECTION_FIELD_ALIASES,
  };
}

module.exports = {
  normalizeBlueprintBody,
  normalizeSectionInput,
  formatBlueprintValidationError,
  SECTION_FIELD_ALIASES,
};
