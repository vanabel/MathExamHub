const { activeQuestionFilter } = require('../constants/questionLifecycle');
const { DIFFICULTY_VALUES } = require('../constants/difficulty');

/**
 * @param {object} opts
 * @param {import('mongoose').Types.ObjectId} opts.bankId
 * @param {Record<string, string>} opts.query req.query
 * @param {string[]|null} [opts.kpSubtreeIds]
 */
function buildQuestionListFilter({ bankId, query, kpSubtreeIds }) {
  const filter = activeQuestionFilter({ bankId });

  const subject = query.subject;
  const questionType = query.questionType || query.type;
  const difficulty = query.difficulty;

  if (subject) filter.subject = subject;
  if (questionType) filter.type = questionType;
  if (difficulty && DIFFICULTY_VALUES.includes(difficulty)) {
    filter.difficulty = difficulty;
  }

  const knowledgePointId = query.knowledgePointId;
  if (knowledgePointId) {
    if (kpSubtreeIds && kpSubtreeIds.length) {
      filter.knowledgePointIds = { $in: kpSubtreeIds };
    } else {
      filter.knowledgePointIds = knowledgePointId;
    }
  }

  const minScore = query.minScore != null ? Number(query.minScore) : null;
  const maxScore = query.maxScore != null ? Number(query.maxScore) : null;
  if (minScore != null && !Number.isNaN(minScore)) {
    filter.totalScore = filter.totalScore || {};
    filter.totalScore.$gte = minScore;
  }
  if (maxScore != null && !Number.isNaN(maxScore)) {
    filter.totalScore = filter.totalScore || {};
    filter.totalScore.$lte = maxScore;
  }

  const textQ = query.q || query.questionText;
  if (textQ && String(textQ).trim()) {
    const keywordsArray = String(textQ)
      .split(/[,、;\s]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    if (keywordsArray.length > 0) {
      filter.questionText = {
        $all: keywordsArray.map((keyword) => new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')),
      };
    }
  }

  if (query.status) {
    filter.status = query.status;
  }

  return filter;
}

function parseListPagination(query) {
  const explicit = query.limit != null || query.offset != null;
  const limit = explicit
    ? Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200)
    : null;
  const offset = explicit ? Math.max(parseInt(query.offset, 10) || 0, 0) : 0;
  return { explicit, limit, offset };
}

function parseListSort(query) {
  const sortBy = query.sortBy || 'createdAt';
  const order = query.sortOrder === 'asc' ? 1 : -1;
  const allowed = { createdAt: 'createdAt', difficulty: 'difficulty', totalScore: 'totalScore' };
  const field = allowed[sortBy] || 'createdAt';
  return { [field]: order };
}

module.exports = {
  buildQuestionListFilter,
  parseListPagination,
  parseListSort,
};
