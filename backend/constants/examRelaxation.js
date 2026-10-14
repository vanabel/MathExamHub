/**
 * 组卷约束无法满足时的默认放宽顺序（Owner 已批准自动放宽；可在 ROADMAP §6.2 调整）。
 * 1. 各 section 难度配比 → 2. 知识点范围 → 3. 单题分值容差 → 4. section 题量 → 5. 总分目标
 */
const RELAXATION_ORDER = [
  'difficulty_mix',
  'knowledge_point_scope',
  'section_score_tolerance',
  'section_count',
  'total_score_target',
];

const RELAXATION_LABELS = {
  difficulty_mix: '难度分布（改为不限制单槽难度）',
  knowledge_point_scope: '知识点范围（先扩展子树，再取消知识点限制）',
  section_score_tolerance: '单题分值（放宽容差至 ±35%）',
  section_count: 'section 题量（减少 1 题）',
  total_score_target: '总分目标（标记为未达成并继续）',
};

module.exports = {
  RELAXATION_ORDER,
  RELAXATION_LABELS,
};
