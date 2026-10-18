/** Human-readable filter funnel for exam slot / coverage gaps. */
export function formatFilterStageSummary(stages) {
  if (!stages || typeof stages !== 'object') return '';
  const parts = [];
  if (stages.bankTotal != null) parts.push(`题库 ${stages.bankTotal}`);
  if (stages.notAlreadyUsed != null) parts.push(`未占用 ${stages.notAlreadyUsed}`);
  if (stages.subjectMatch != null) parts.push(`科目 ${stages.subjectMatch}`);
  if (stages.typeMatch != null) parts.push(`题型 ${stages.typeMatch}`);
  if (stages.difficultyMatch != null) parts.push(`难度 ${stages.difficultyMatch}`);
  if (stages.knowledgePointMatch != null) parts.push(`知识点 ${stages.knowledgePointMatch}`);
  if (stages.scoreWindowMatch != null) parts.push(`分值窗 ${stages.scoreWindowMatch}`);
  if (stages.finalCandidates != null) parts.push(`候选 ${stages.finalCandidates}`);
  return parts.join(' → ');
}

export const REASON_CODE_LABELS = {
  subject_mismatch: '科目不符',
  type_mismatch: '题型不符',
  difficulty_mismatch: '难度不符',
  knowledge_point_mismatch: '知识点不符',
  score_window_mismatch: '分值不符',
  section_count_shortfall: '题量不足',
  all_used: '题目已占用',
  empty_bank: '题库为空',
  unknown: '未知',
};

export function reasonCodeLabel(code) {
  return REASON_CODE_LABELS[code] || code || '未知';
}
