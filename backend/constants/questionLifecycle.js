const QUESTION_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
};

/** 列表、去重分组、组卷抽题等「在库」题目 */
function activeQuestionFilter(extra = {}) {
  return { ...extra, status: { $ne: QUESTION_STATUS.DELETED } };
}

/** 组卷候选池（不含归档与回收站） */
function examPoolFilter(extra = {}) {
  return {
    ...extra,
    status: { $nin: [QUESTION_STATUS.DELETED, QUESTION_STATUS.ARCHIVED] },
  };
}

function isDeletedQuestion(doc) {
  return doc?.status === QUESTION_STATUS.DELETED;
}

module.exports = {
  QUESTION_STATUS,
  activeQuestionFilter,
  examPoolFilter,
  isDeletedQuestion,
};
