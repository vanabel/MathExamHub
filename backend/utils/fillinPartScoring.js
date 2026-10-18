/**
 * Infer 填空题 makepart heading (每题 vs 每空) and blank counts for LaTeX round-trip.
 */

function matchNestedBraces(text, startIndex) {
  if (text[startIndex] !== '{') return null;
  let depth = 0;
  const start = startIndex;
  let i = startIndex;
  while (i < text.length) {
    if (text[i] === '\\' && i + 1 < text.length) {
      i++;
      if (/[a-zA-Z]/.test(text[i])) {
        while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;
        continue;
      }
      i++;
      continue;
    }
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.substring(start + 1, i);
    }
    i++;
  }
  return null;
}

function countFillBlanksInText(content) {
  if (!content) return 0;
  let total = 0;
  for (const commandName of ['fillin', 'fillout']) {
    const prefix = `\\${commandName}`;
    let index = 0;
    while (index < content.length) {
      const start = content.indexOf(prefix, index);
      if (start === -1) break;
      let pos = start + prefix.length;
      while (pos < content.length && content[pos] === ' ') pos++;
      if (content[pos] === '[') {
        const bracketEnd = content.indexOf(']', pos);
        if (bracketEnd === -1) break;
        pos = bracketEnd + 1;
        while (pos < content.length && content[pos] === ' ') pos++;
      }
      if (content[pos] !== '{') {
        index = start + 1;
        continue;
      }
      const inner = matchNestedBraces(content, pos);
      if (inner === null) {
        index = start + 1;
        continue;
      }
      total++;
      index = pos + inner.length + 2;
    }
  }
  return total;
}

function countFillBlanksForQuestion(question) {
  const body = question.originalLaTeX || question.questionText || '';
  const n = countFillBlanksInText(body);
  if (n > 0) return n;
  const ans = question.correctAnswer;
  if (Array.isArray(ans) && ans.length > 0) return ans.length;
  if (ans != null && String(ans).trim() !== '') return 1;
  return 0;
}

/**
 * @returns {{
 *   mode: 'per_question' | 'per_blank' | 'mixed',
 *   unitScore: number,
 *   perBlankScore: number,
 *   perQuestionScore: number,
 * }}
 */
function inferFillInPartScoring(partType, questions) {
  if (!questions.length) {
    return { mode: 'mixed', unitScore: 0, perBlankScore: 0, perQuestionScore: 0 };
  }

  const scores = questions.map((q) => q.totalScore || 0);
  if (scores.some((s) => s <= 0)) {
    return { mode: 'mixed', unitScore: 0, perBlankScore: 0, perQuestionScore: 0 };
  }

  const isFillIn = partType === '填空题';

  if (new Set(scores).size === 1) {
    return {
      mode: 'per_question',
      unitScore: scores[0],
      perBlankScore: 0,
      perQuestionScore: scores[0],
    };
  }

  if (!isFillIn) {
    return { mode: 'mixed', unitScore: 0, perBlankScore: 0, perQuestionScore: 0 };
  }

  const blankCounts = questions.map((q) => countFillBlanksForQuestion(q));
  if (blankCounts.some((b) => b <= 0)) {
    return { mode: 'mixed', unitScore: 0, perBlankScore: 0, perQuestionScore: 0 };
  }

  const perBlankValues = scores.map((s, i) => s / blankCounts[i]);
  const first = perBlankValues[0];
  const uniformPerBlank =
    perBlankValues.every((v) => v === first) && Number.isInteger(first) && first > 0;

  if (uniformPerBlank) {
    return {
      mode: 'per_blank',
      unitScore: first,
      perBlankScore: first,
      perQuestionScore: 0,
    };
  }

  return { mode: 'mixed', unitScore: 0, perBlankScore: 0, perQuestionScore: 0 };
}

/** @returns {{ perBlank: boolean, perQuestion: boolean, perBlankScore: number, perQuestionScore: number }} */
function parseMakepartInfoScoring(partInfo, partType) {
  const info = partInfo || '';
  const perBlankM = info.match(/每空(\d+)\s*分/);
  const perQuestionM = info.match(/每题(\d+)\s*分/);
  const perBlank = Boolean(perBlankM) && partType === '填空题';
  const perQuestion = Boolean(perQuestionM) && !perBlank;
  return {
    perBlank,
    perQuestion,
    perBlankScore: perBlankM ? parseInt(perBlankM[1], 10) : 0,
    perQuestionScore: perQuestionM ? parseInt(perQuestionM[1], 10) : 0,
  };
}

function isPerBlankMakepart(partType, partInfo) {
  return parseMakepartInfoScoring(partInfo, partType).perBlank;
}

function resolveMakepartUnitScore(partInfo, partType, partScoreSuffix) {
  const parsed = parseMakepartInfoScoring(partInfo, partType);
  if (partScoreSuffix != null && String(partScoreSuffix).trim() !== '') {
    const n = parseInt(String(partScoreSuffix).trim(), 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  if (parsed.perBlank && parsed.perBlankScore > 0) return parsed.perBlankScore;
  if (parsed.perQuestion && parsed.perQuestionScore > 0) return parsed.perQuestionScore;
  const m = (partInfo || '').match(/(?:每题|每空)(\d+)\s*分/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

module.exports = {
  countFillBlanksInText,
  countFillBlanksForQuestion,
  inferFillInPartScoring,
  parseMakepartInfoScoring,
  isPerBlankMakepart,
  resolveMakepartUnitScore,
};
