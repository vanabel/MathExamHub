import { QUESTION_TYPE_ORDER } from '../constants/questionTypes.js';
import {
  getDifficultyCoefficient,
  getDifficultyScore,
  getAverageDifficultyCoefficient,
} from './difficultyScore.js';

/** 与 backend examPoolFilter 一致：排除回收站与已归档 */
export function isExamPoolCandidate(question) {
  const status = question?.status || 'published';
  return status !== 'deleted' && status !== 'archived';
}

export function filterExamPoolCandidates(questions) {
  return (questions || []).filter(isExamPoolCandidate);
}

/**
 * @param {string | number | null | undefined} input
 * @returns {number} uint32
 */
export function parseSeed(input) {
  if (input === '' || input == null) {
    return (Math.floor(Math.random() * 0x100000000) >>> 0);
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    return (input >>> 0);
  }
  const str = String(input).trim();
  const asNum = Number(str);
  if (str !== '' && !Number.isNaN(asNum) && Number.isFinite(asNum)) {
    return (asNum >>> 0);
  }
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

/** @param {number} seed uint32 */
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @template T
 * @param {T[]} array
 * @param {number} seed
 * @returns {T[]}
 */
export function seededShuffle(array, seed) {
  const rng = createSeededRandom(seed);
  const out = [...array];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getTypeIndex(type, typeOrder = QUESTION_TYPE_ORDER) {
  const index = typeOrder.indexOf(type);
  return index >= 0 ? index : 999;
}

export function sortQuestionsByType(questions, typeOrder = QUESTION_TYPE_ORDER) {
  return [...questions].sort((a, b) => {
    const indexA = getTypeIndex(a.type, typeOrder);
    const indexB = getTypeIndex(b.type, typeOrder);
    if (indexA !== indexB) return indexA - indexB;
    return getDifficultyScore(a) - getDifficultyScore(b);
  });
}

function stableId(a) {
  return String(a._id ?? a.id ?? '');
}

function orderCandidates(candidates, sortOrder, seed, typeOrder) {
  const withScores = candidates.map((q) => ({
    ...q,
    difficultyScore: getDifficultyScore(q),
  }));

  if (sortOrder === 'asc') {
    return [...withScores].sort((a, b) => {
      const d = a.difficultyScore - b.difficultyScore;
      if (d !== 0) return d;
      return stableId(a).localeCompare(stableId(b));
    });
  }
  if (sortOrder === 'desc') {
    return [...withScores].sort((a, b) => {
      const d = b.difficultyScore - a.difficultyScore;
      if (d !== 0) return d;
      return stableId(a).localeCompare(stableId(b));
    });
  }
  if (sortOrder === 'type') {
    return sortQuestionsByType(withScores, typeOrder).map((q) => ({
      ...q,
      difficultyScore: getDifficultyScore(q),
    }));
  }
  return seededShuffle(withScores, seed);
}

function countTypeDistribution(typeDistribution) {
  return Object.values(typeDistribution || {}).reduce(
    (sum, n) => sum + (Number(n) > 0 ? Number(n) : 0),
    0,
  );
}

/**
 * @param {object} settings
 * @param {number} candidateCount
 */
export function validateSmartSelectSettings(settings, candidateCount) {
  const errors = [];
  const warnings = [];

  if (candidateCount === 0) {
    errors.push('当前没有可选的题目');
  }

  if (settings.mode === 'count') {
    const targetCount = Number(settings.targetCount);
    if (!Number.isFinite(targetCount) || targetCount <= 0) {
      errors.push('题目数量必须大于 0');
    } else if (targetCount > candidateCount) {
      warnings.push(`最多可选 ${candidateCount} 道题目`);
    }
  } else {
    const targetDifficulty = Number(settings.targetDifficulty);
    if (!Number.isFinite(targetDifficulty) || targetDifficulty < 0) {
      errors.push('目标难度分数无效');
    }
  }

  if (settings.enableTypeDistribution && settings.mode === 'count') {
    const targetCount = Number(settings.targetCount);
    const distSum = countTypeDistribution(settings.typeDistribution);
    if (distSum > targetCount) {
      errors.push(
        `题型分布合计 ${distSum} 道，超过题目数量 ${targetCount}，请调整`,
      );
    }
  }

  const targetTotal = Number(settings.targetTotalScore);
  if (settings.targetTotalScore !== '' && settings.targetTotalScore != null
    && Number.isFinite(targetTotal) && targetTotal <= 0) {
    errors.push('目标总分必须大于 0');
  }

  return { errors, warnings, valid: errors.length === 0 };
}

function buildTypeStats(questions) {
  /** @type {Record<string, number>} */
  const stats = {};
  questions.forEach((q) => {
    stats[q.type] = (stats[q.type] || 0) + 1;
  });
  return stats;
}

function summarizeSelection(selectedQuestions, messages = []) {
  const totalScore = selectedQuestions.reduce(
    (sum, q) => sum + (Number(q.totalScore) || 0),
    0,
  );
  const totalDifficultyScore = selectedQuestions.reduce(
    (sum, q) => sum + getDifficultyScore(q),
    0,
  );
  return {
    count: selectedQuestions.length,
    totalScore,
    totalDifficultyScore,
    averageDifficultyCoefficient: getAverageDifficultyCoefficient(selectedQuestions),
    averageDifficultyScore: selectedQuestions.length
      ? totalDifficultyScore / selectedQuestions.length
      : 0,
    typeDistribution: buildTypeStats(selectedQuestions),
    messages: [...messages],
  };
}

/**
 * 从 items 中恰好选 count 道，使总分最接近 targetSum（整数分）
 * @param {object[]} items
 * @param {number} count
 * @param {number|null} targetSum
 * @returns {{ ids: string[], sum: number, gap: number|null, impossible: boolean }}
 */
function selectExactCountByTotalScore(items, count, targetSum) {
  if (count <= 0) {
    return { ids: [], sum: 0, gap: targetSum == null ? null : targetSum, impossible: true };
  }
  if (count > items.length) {
    return { ids: [], sum: 0, gap: targetSum, impossible: true };
  }
  if (targetSum == null || !Number.isFinite(targetSum)) {
    const picked = items.slice(0, count);
    const sum = picked.reduce((s, q) => s + (Number(q.totalScore) || 0), 0);
    return { ids: picked.map((q) => stableId(q)), sum, gap: null, impossible: false };
  }

  const target = Math.round(targetSum);
  const maxItem = Math.max(0, ...items.map((q) => Number(q.totalScore) || 0));
  const maxSum = target + maxItem * count + 200;

  /** @type {Map<number, { sum: number, ids: string[] }>[]} */
  const dp = Array.from({ length: count + 1 }, () => new Map());
  dp[0].set(0, { sum: 0, ids: [] });

  items.forEach((q) => {
    const sc = Number(q.totalScore) || 0;
    const id = stableId(q);
    for (let c = count - 1; c >= 0; c -= 1) {
      dp[c].forEach((state, s) => {
        const ns = s + sc;
        if (ns > maxSum) return;
        const nextCount = c + 1;
        const candidate = { sum: ns, ids: [...state.ids, id] };
        const bucket = dp[nextCount];
        const existing = bucket.get(ns);
        if (!existing) {
          bucket.set(ns, candidate);
        }
      });
    }
  });

  let best = null;
  dp[count].forEach((state, s) => {
    const diff = Math.abs(s - target);
    if (!best || diff < best.diff) {
      best = { ...state, diff };
    }
  });

  if (!best) {
    const sorted = [...items].sort((a, b) => {
      const da = Math.abs((Number(a.totalScore) || 0) - target / count);
      const db = Math.abs((Number(b.totalScore) || 0) - target / count);
      return da - db;
    });
    const picked = sorted.slice(0, count);
    const sum = picked.reduce((s, q) => s + (Number(q.totalScore) || 0), 0);
    return {
      ids: picked.map((q) => stableId(q)),
      sum,
      gap: sum - target,
      impossible: true,
    };
  }

  return {
    ids: best.ids,
    sum: best.sum,
    gap: best.sum - target,
    impossible: false,
  };
}

function pickByTypeDistribution(orderedPool, typeDistribution, questionTypes, messages) {
  const selected = [];
  const selectedSet = new Set();

  questionTypes.forEach((type) => {
    const want = Number(typeDistribution[type]);
    if (!want || want <= 0) return;
    const typeItems = orderedPool.filter(
      (q) => q.type === type && !selectedSet.has(stableId(q)),
    );
    const take = Math.min(want, typeItems.length);
    if (take < want) {
      messages.push(`目标 ${want} 道${type}，仅找到 ${take} 道`);
    }
    typeItems.slice(0, take).forEach((q) => {
      selected.push(q);
      selectedSet.add(stableId(q));
    });
  });

  return { selected, selectedSet };
}

function selectByTargetDifficulty(orderedPool, targetDifficulty, targetTotalScore) {
  const scale = 10;
  const target = Math.round(targetDifficulty * scale);
  const tolerance = Math.max(Math.round(targetDifficulty * 0.15 * scale), 1);
  const maxScore = target + tolerance;

  let dp = new Array(maxScore + 1).fill(null).map(() => ({
    selected: /** @type {string[]} */ ([]),
    score: 0,
    totalScore: 0,
    diff: Infinity,
  }));
  dp[0] = { selected: [], score: 0, totalScore: 0, diff: target };

  for (const q of orderedPool) {
    const qScore = Math.round(getDifficultyScore(q) * scale);
    const qTotal = Number(q.totalScore) || 0;
    const newDp = dp.map((item) => ({
      selected: [...item.selected],
      score: item.score,
      totalScore: item.totalScore,
      diff: item.diff,
    }));

    for (let j = maxScore; j >= qScore; j -= 1) {
      const prev = dp[j - qScore];
      if (prev.selected.length === 0 && j !== qScore) continue;
      const newDiff = Math.abs(j - target);
      const cand = {
        selected: [...prev.selected, stableId(q)],
        score: j,
        totalScore: prev.totalScore + qTotal,
        diff: newDiff,
      };
      const cur = newDp[j];
      const better = !cur.selected.length
        || cand.diff < cur.diff
        || (cand.diff === cur.diff && cand.selected.length < cur.selected.length);
      if (better) newDp[j] = cand;
    }
    dp = newDp;
  }

  let best = null;
  for (let i = 0; i <= maxScore; i += 1) {
    const row = dp[i];
    if (!row.selected.length) continue;
    if (
      !best
      || row.diff < best.diff
      || (row.diff === best.diff && row.selected.length < best.selected.length)
    ) {
      best = row;
    }
  }

  const messages = [];
  if (!best || !best.selected.length) {
    messages.push(`无法接近目标难度分数 ${targetDifficulty}`);
    return { ids: [], messages, gapDifficulty: targetDifficulty, gapTotal: null };
  }

  let gapTotal = null;
  if (targetTotalScore != null && Number.isFinite(Number(targetTotalScore))) {
    const tt = Math.round(Number(targetTotalScore));
    gapTotal = best.totalScore - tt;
    if (gapTotal !== 0) {
      messages.push(
        gapTotal === 0
          ? `已达到目标总分 ${tt}`
          : `目标总分 ${tt}，最接近 ${best.totalScore}`,
      );
    }
  }

  const achieved = best.score / scale;
  const gapDifficulty = achieved - targetDifficulty;
  if (Math.abs(gapDifficulty) > 0.05) {
    messages.push(
      `目标难度分数 ${targetDifficulty}，最接近 ${achieved.toFixed(1)}`,
    );
  }

  return {
    ids: best.selected,
    messages,
    gapDifficulty,
    gapTotal,
  };
}

/**
 * @param {object[]} rawCandidates 当前列表（已加载）
 * @param {object} settings
 * @returns {{
 *   ok: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   selectedIds: string[],
 *   seedUsed: number,
 *   summary: ReturnType<typeof summarizeSelection> | null,
 * }}
 */
export function runSmartSelect(rawCandidates, settings) {
  const candidates = filterExamPoolCandidates(rawCandidates);
  const typeOrder = settings.typeOrder || QUESTION_TYPE_ORDER;
  const questionTypes = settings.questionTypes || QUESTION_TYPE_ORDER;

  const validation = validateSmartSelectSettings(settings, candidates.length);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: validation.warnings,
      selectedIds: [],
      seedUsed: parseSeed(settings.seed),
      summary: null,
    };
  }

  const seedUsed = settings.sortOrder === 'random'
    ? parseSeed(settings.seed)
    : parseSeed(settings.seed);

  const orderedPool = orderCandidates(
    candidates,
    settings.sortOrder || 'random',
    seedUsed,
    typeOrder,
  );

  const messages = [...validation.warnings];
  const targetTotalRaw = settings.targetTotalScore;
  const hasTargetTotal = targetTotalRaw !== '' && targetTotalRaw != null
    && Number.isFinite(Number(targetTotalRaw)) && Number(targetTotalRaw) > 0;
  const targetTotal = hasTargetTotal ? Number(targetTotalRaw) : null;

  let selectedQuestions = [];

  if (settings.mode === 'count') {
    const targetCount = Number(settings.targetCount);

    if (settings.enableTypeDistribution) {
      const { selected, selectedSet } = pickByTypeDistribution(
        orderedPool,
        settings.typeDistribution || {},
        questionTypes,
        messages,
      );
      selectedQuestions = [...selected];
      let remaining = targetCount - selectedQuestions.length;

      const freePool = orderedPool.filter((q) => !selectedSet.has(stableId(q)));

      if (remaining > 0 && hasTargetTotal) {
        const fixedSum = selectedQuestions.reduce(
          (s, q) => s + (Number(q.totalScore) || 0),
          0,
        );
        const needSum = targetTotal - fixedSum;
        const sub = selectExactCountByTotalScore(freePool, remaining, needSum);
        sub.ids.forEach((id) => {
          const q = freePool.find((x) => stableId(x) === id);
          if (q) selectedQuestions.push(q);
        });
        if (sub.gap != null && sub.gap !== 0) {
          messages.push(
            `目标总分 ${targetTotal}，最接近 ${fixedSum + sub.sum}`,
          );
        }
        if (sub.impossible && remaining > 0) {
          messages.push(`无法在剩余 ${remaining} 道中凑近目标总分`);
        }
      } else if (remaining > 0) {
        selectedQuestions.push(...freePool.slice(0, remaining));
      }

      selectedQuestions = selectedQuestions.slice(0, targetCount);

      if (hasTargetTotal && selectedQuestions.length === targetCount) {
        const sum = selectedQuestions.reduce(
          (s, q) => s + (Number(q.totalScore) || 0),
          0,
        );
        if (sum !== targetTotal) {
          const already = messages.some((m) => m.includes('目标总分'));
          if (!already) {
            messages.push(`目标总分 ${targetTotal}，最接近 ${sum}`);
          }
        }
      }
    } else if (hasTargetTotal) {
      const sub = selectExactCountByTotalScore(orderedPool, targetCount, targetTotal);
      selectedQuestions = sub.ids
        .map((id) => orderedPool.find((q) => stableId(q) === id))
        .filter(Boolean);
      if (sub.gap != null && sub.gap !== 0) {
        messages.push(`目标总分 ${targetTotal}，最接近 ${sub.sum}`);
      }
      if (sub.impossible) {
        messages.push(`无法同时满足 ${targetCount} 道与目标总分 ${targetTotal}`);
      }
    } else {
      selectedQuestions = orderedPool.slice(0, targetCount);
    }
  } else {
    const targetDifficulty = Number(settings.targetDifficulty) || 0;
    let pick;
    if (orderedPool.length <= 200) {
      pick = selectByTargetDifficulty(orderedPool, targetDifficulty, targetTotal);
    } else {
      pick = selectByTargetDifficulty(orderedPool.slice(0, 200), targetDifficulty, targetTotal);
    }
    messages.push(...pick.messages);
    selectedQuestions = pick.ids
      .map((id) => orderedPool.find((q) => stableId(q) === id))
      .filter(Boolean);
  }

  if (settings.sortOrder === 'type') {
    selectedQuestions = sortQuestionsByType(selectedQuestions, typeOrder);
  }

  const summary = summarizeSelection(selectedQuestions, messages);

  return {
    ok: true,
    errors: [],
    warnings: validation.warnings,
    selectedIds: selectedQuestions.map((q) => stableId(q)),
    seedUsed,
    summary,
  };
}

export {
  getDifficultyScore,
  getDifficultyCoefficient,
};
