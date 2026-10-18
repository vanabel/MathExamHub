const { normalizeDifficulty } = require('../constants/difficulty');

function isActiveQuestion(q) {
  return q.status !== 'archived' && q.status !== 'deleted';
}

/**
 * Explain why a slot has zero candidates (same rules as examGenerator.questionMatches).
 */
function diagnoseEmptySlot({
  pool,
  blueprintSubject,
  section,
  slotDifficulty,
  usedIds,
  kpAllowSet,
}) {
  const used = usedIds || new Set();
  const stages = {
    bankTotal: 0,
    notAlreadyUsed: 0,
    subjectMatch: 0,
    typeMatch: 0,
    difficultyMatch: 0,
    knowledgePointMatch: 0,
    scoreWindowMatch: 0,
    finalCandidates: 0,
  };

  const all = pool.filter(isActiveQuestion);
  stages.bankTotal = all.length;

  let working = all.filter((q) => !used.has(String(q._id)));
  stages.notAlreadyUsed = working.length;
  stages.alreadyUsedExcluded = all.length - working.length;

  if (blueprintSubject) {
    const matched = working.filter((q) => !q.subject || q.subject === blueprintSubject);
    stages.subjectMatch = matched.length;
    stages.subjectMismatchExcluded = working.length - matched.length;
    working = matched;
  } else {
    stages.subjectMatch = working.length;
    stages.subjectMismatchExcluded = 0;
  }

  if (section.type) {
    const matched = working.filter((q) => q.type === section.type);
    stages.typeMatch = matched.length;
    stages.typeMismatchExcluded = working.length - matched.length;
    working = matched;
  } else {
    stages.typeMatch = working.length;
    stages.typeMismatchExcluded = 0;
  }

  if (section.excludeQuestionIds?.length) {
    const ex = new Set(section.excludeQuestionIds.map(String));
    working = working.filter((q) => !ex.has(String(q._id)));
  }

  if (slotDifficulty) {
    const matched = working.filter((q) => normalizeDifficulty(q.difficulty) === slotDifficulty);
    stages.difficultyMatch = matched.length;
    stages.difficultyMismatchExcluded = working.length - matched.length;
    working = matched;
  } else {
    stages.difficultyMatch = working.length;
    stages.difficultyMismatchExcluded = 0;
  }

  if (kpAllowSet && kpAllowSet.size > 0) {
    const matched = working.filter((q) => {
      const qKps = (q.knowledgePointIds || []).map(String);
      return qKps.some((id) => kpAllowSet.has(id));
    });
    stages.knowledgePointMatch = matched.length;
    stages.knowledgePointMismatchExcluded = working.length - matched.length;
    working = matched;
  } else {
    stages.knowledgePointMatch = working.length;
    stages.knowledgePointMismatchExcluded = 0;
  }

  const scoreTarget = section.scoreEach;
  const tol = section.scoreTolerancePct ?? 0.15;
  let suggestedScoreEach = null;
  const preScoreCandidates = working;
  if (scoreTarget != null && scoreTarget > 0) {
    const min = scoreTarget * (1 - tol);
    const max = scoreTarget * (1 + tol);
    const matched = working.filter((q) => {
      const score = Number(q.totalScore) || 0;
      return score >= min && score <= max;
    });
    stages.scoreWindowMatch = matched.length;
    stages.scoreWindowExcluded = working.length - matched.length;
    if (matched.length === 0 && preScoreCandidates.length > 0) {
      const { scoreMode } = require('./scoreMode');
      suggestedScoreEach = scoreMode(preScoreCandidates.map((q) => q.totalScore));
    }
    working = matched;
  } else {
    stages.scoreWindowMatch = working.length;
    stages.scoreWindowExcluded = 0;
  }

  stages.finalCandidates = working.length;

  let reasonCode = 'unknown';
  let message = '无符合全部约束的候选题';
  let suggestion = '放宽蓝图约束或补充题库题目';

  if (stages.bankTotal === 0) {
    reasonCode = 'empty_bank';
    message = '题库中没有可用题目';
    suggestion = '先导入或添加题目';
  } else if (stages.notAlreadyUsed === 0) {
    reasonCode = 'all_used';
    message = '本题库中符合条件的题目已在该卷其他槽位使用';
    suggestion = '增加题库题量或减少本大题题量';
  } else if (blueprintSubject && stages.subjectMatch === 0) {
    reasonCode = 'subject_mismatch';
    message = `科目「${blueprintSubject}」与题库不匹配（${stages.subjectMismatchExcluded || 0} 题科目不符）`;
    suggestion = `将蓝图科目改为题库实际科目，或导入「${blueprintSubject}」题目`;
  } else if (section.type && stages.typeMatch === 0) {
    reasonCode = 'type_mismatch';
    message = `没有题型为「${section.type}」的可用题（${stages.typeMismatchExcluded || 0} 题题型不符）`;
    suggestion = `补充「${section.type}」或修改蓝图题型`;
  } else if (slotDifficulty && stages.difficultyMatch === 0) {
    reasonCode = 'difficulty_mismatch';
    message = `没有难度为「${slotDifficulty}」的可用题（${stages.difficultyMismatchExcluded || 0} 题难度不符）`;
    suggestion = '调整难度配比或放宽难度约束';
  } else if (kpAllowSet?.size > 0 && stages.knowledgePointMatch === 0) {
    reasonCode = 'knowledge_point_mismatch';
    message = '没有落在指定知识点范围内的题';
    suggestion = '扩大知识点范围或取消知识点限制';
  } else if (scoreTarget > 0 && stages.scoreWindowMatch === 0) {
    reasonCode = 'score_window_mismatch';
    message = `没有分值在 ${scoreTarget} 分 ±${Math.round(tol * 100)}% 范围内的题（${stages.scoreWindowExcluded || 0} 题分值不符）`;
    suggestion = suggestedScoreEach
      ? `可将本大题「每题分值」改为 ${suggestedScoreEach} 分（题库该槽位常见分值）`
      : '调整每题分值或放宽容差';
  }

  return {
    reasonCode,
    message,
    suggestion,
    suggestedScoreEach,
    filterStages: stages,
  };
}

module.exports = {
  diagnoseEmptySlot,
};
