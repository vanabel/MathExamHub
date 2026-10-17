/** Choice option letters (mathexam abcd convention). */
export const CHOICE_OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Exact UI label: "(A)", "(B)", … — never "A." from list markers. */
export function formatChoiceOptionLabel(letter) {
  const ch = String(letter ?? '').trim().toUpperCase();
  return ch ? `(${ch})` : '';
}

/**
 * @param {Record<string, string>|string[]|null|undefined} options
 * @returns {{ label: string, displayLabel: string, text: string }[]}
 */
export function listChoiceOptionEntries(options) {
  if (options == null) return [];

  if (Array.isArray(options)) {
    return options.map((text, index) => {
      const label = CHOICE_OPTION_LABELS[index] || String.fromCharCode(65 + index);
      return {
        label,
        displayLabel: formatChoiceOptionLabel(label),
        text: text == null ? '' : String(text),
      };
    });
  }

  if (typeof options === 'object') {
    const keys = Object.keys(options);
    const sorted = [...keys].sort((a, b) => {
      const ia = CHOICE_OPTION_LABELS.indexOf(a);
      const ib = CHOICE_OPTION_LABELS.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b, 'zh-CN');
    });
    return sorted.map((key, index) => {
      const label = CHOICE_OPTION_LABELS.includes(key)
        ? key
        : CHOICE_OPTION_LABELS[index] || String.fromCharCode(65 + index);
      return {
        label,
        displayLabel: formatChoiceOptionLabel(label),
        text: options[key] == null ? '' : String(options[key]),
      };
    });
  }

  return [];
}

export function isChoiceQuestionType(type) {
  return type === '单选题' || type === '多选题';
}

/**
 * Use (A)–(D) labels when choice semantics are detectable even if type is not 单选/多选.
 */
export function shouldUseChoiceOptionLabels({
  questionType = '',
  hasOptions = false,
  questionText = '',
  originalLaTeX = '',
  choiceOptionLabels = false,
} = {}) {
  if (choiceOptionLabels || isChoiceQuestionType(questionType)) return true;
  if (hasOptions) return true;
  if (originalLaTeX && /\\begin\{abcd\}/.test(originalLaTeX)) return true;
  const combined = `${questionText}${originalLaTeX}`;
  if (/\\pickout/.test(combined)) return true;
  return false;
}
