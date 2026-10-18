const EXACT_PART_TYPE_MAP = {
  填空题: '填空题',
  选择题: '单选题',
  单项选择题: '单选题',
  多项选择题: '多选题',
  判断题: '判断题',
  计算题: '计算题',
  解答题: '解答题',
  证明题: '证明题',
  作图题: '作图题',
  简答题: '简答题',
};

/**
 * Map mathexam makepart title → canonical question type (or null if unrecognized).
 */
function resolveQuestionTypeFromPartTitle(partTitle) {
  const normalized = String(partTitle || '').trim();
  if (!normalized) return null;
  if (EXACT_PART_TYPE_MAP[normalized]) {
    return EXACT_PART_TYPE_MAP[normalized];
  }
  const compact = normalized.replace(/\s+/g, '');
  if (/判断|是非/.test(compact)) return '判断题';
  if (/填空/.test(compact)) return '填空题';
  if (/多选/.test(compact)) return '多选题';
  if (/单选|选择/.test(compact) && !/多选/.test(compact)) return '单选题';
  if (/计算|证明|解答|综合|应用/.test(compact)) return '解答题';
  return null;
}

function isRecognizedPartTitle(partTitle) {
  return resolveQuestionTypeFromPartTitle(partTitle) != null;
}

/**
 * @param {object[]} questions parsed questions (mutated)
 * @param {Record<string, string>} overridesByPartTitle e.g. { "自定义块": "解答题" }
 */
function applyPartTypeOverrides(questions, overridesByPartTitle = {}) {
  if (!overridesByPartTitle || typeof overridesByPartTitle !== 'object') return;
  for (const q of questions) {
    const title = q.latexPartTitle || q.partType;
    if (title && overridesByPartTitle[title]) {
      q.type = overridesByPartTitle[title];
    }
  }
}

function summarizePartSections(questions, validationErrors = []) {
  const invalidIndices = new Set(
    validationErrors.filter((e) => e.code === 'INVALID_TYPE').map((e) => e.index),
  );
  const map = new Map();
  questions.forEach((q, index) => {
    const partTitle = q.latexPartTitle || q.partType || '未命名部分';
    if (!map.has(partTitle)) {
      map.set(partTitle, {
        partTitle,
        mappedType: resolveQuestionTypeFromPartTitle(partTitle),
        recognized: isRecognizedPartTitle(partTitle),
        questionIndices: [],
        invalidCount: 0,
      });
    }
    const sec = map.get(partTitle);
    sec.questionIndices.push(index);
    if (invalidIndices.has(index)) sec.invalidCount += 1;
  });
  return [...map.values()];
}

module.exports = {
  EXACT_PART_TYPE_MAP,
  resolveQuestionTypeFromPartTitle,
  isRecognizedPartTitle,
  applyPartTypeOverrides,
  summarizePartSections,
};
