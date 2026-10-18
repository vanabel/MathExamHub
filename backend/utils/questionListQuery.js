const { activeQuestionFilter } = require('../constants/questionLifecycle');
const { DIFFICULTY_VALUES } = require('../constants/difficulty');

/**
 * @param {object} opts
 * @param {import('mongoose').Types.ObjectId} opts.bankId
 * @param {Record<string, string>} opts.query req.query
 * @param {string[]|null} [opts.kpSubtreeIds]
 */
const { mergeQualityMongoFilter } = require('./questionQuality');

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

function buildQuestionListFilter({ bankId, query, kpSubtreeIds }) {
  let filter = activeQuestionFilter({ bankId });
  filter = mergeQualityMongoFilter(filter, query.quality);

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

  const exactScore = query.score != null && query.score !== ''
    ? Number(query.score)
    : null;
  if (exactScore != null && !Number.isNaN(exactScore)) {
    filter.totalScore = exactScore;
  } else {
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

  if (query.untaggedOnly === 'true' || query.untaggedOnly === true || query.missingKp === 'true') {
    filter.$or = [
      { knowledgePointIds: { $exists: false } },
      { knowledgePointIds: { $size: 0 } },
    ];
  }

  return filter;
}

function parseListPagination(query) {
  const hasPageParams = query.page != null || query.pageSize != null;
  const hasLegacy = query.limit != null || query.offset != null;
  const explicit = hasPageParams || hasLegacy;

  let limit = null;
  let offset = 0;
  let page = 1;

  if (hasPageParams) {
    const rawSize = parseInt(query.pageSize, 10);
    limit = ALLOWED_PAGE_SIZES.includes(rawSize) ? rawSize : 20;
    page = Math.max(parseInt(query.page, 10) || 1, 1);
    offset = (page - 1) * limit;
  } else if (hasLegacy) {
    limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
    offset = Math.max(parseInt(query.offset, 10) || 0, 0);
    page = Math.floor(offset / limit) + 1;
  }

  return { explicit, limit, offset, page, pageSize: limit };
}

function parseListSort(query) {
  const sortBy = query.sortBy || 'createdAt';
  const order = query.sortOrder === 'asc' ? 1 : -1;
  const allowed = { createdAt: 'createdAt', difficulty: 'difficulty', totalScore: 'totalScore' };
  const field = allowed[sortBy] || 'createdAt';
  return { [field]: order };
}

function mapFacetRows(rows) {
  return rows
    .map((r) => ({ value: r._id == null ? '' : String(r._id), count: r.count }))
    .filter((r) => r.value !== '');
}

/**
 * Cheap facet counts for subject / type / difficulty under the current filter.
 * @param {import('mongoose').Model} Question
 * @param {object} filter
 */
async function computeQuestionListFacets(Question, filter) {
  const facet = (field) => Question.aggregate([
    { $match: filter },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const [subjectRows, typeRows, difficultyRows] = await Promise.all([
    facet('subject'),
    facet('type'),
    facet('difficulty'),
  ]);

  return {
    subject: mapFacetRows(subjectRows),
    type: mapFacetRows(typeRows),
    difficulty: mapFacetRows(difficultyRows),
  };
}

module.exports = {
  buildQuestionListFilter,
  parseListPagination,
  parseListSort,
  computeQuestionListFacets,
  ALLOWED_PAGE_SIZES,
};
