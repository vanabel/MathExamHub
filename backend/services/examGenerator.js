const { normalizeDifficulty, DIFFICULTY_VALUES } = require('../constants/difficulty');
const { RELAXATION_ORDER, RELAXATION_LABELS } = require('../constants/examRelaxation');
const { createSeededRandom, shuffleInPlace } = require('../utils/seededRandom');

/**
 * @typedef {Object} WorkingSection
 * @property {string} type
 * @property {number} count
 * @property {number} [scoreEach]
 * @property {number} [scoreTotal]
 * @property {Record<string, number>} difficultyMix
 * @property {boolean} difficultyFlexible
 * @property {string[]} knowledgePointIds
 * @property {boolean} knowledgeExpanded
 * @property {boolean} knowledgeDisabled
 * @property {string[]} excludeQuestionIds
 * @property {number} scoreTolerancePct
 */

function cloneBlueprintForWork(blueprint) {
  return {
    title: blueprint.title,
    subject: blueprint.subject,
    totalScore: blueprint.totalScore,
    randomSeed: blueprint.randomSeed,
    allowRelaxation: blueprint.allowRelaxation !== false,
    sections: blueprint.sections.map((s) => ({
      type: s.type,
      count: s.count,
      scoreEach: s.scoreEach ?? (s.scoreTotal && s.count ? s.scoreTotal / s.count : undefined),
      scoreTotal: s.scoreTotal,
      difficultyMix: normalizeDifficultyMix(s.difficultyMix),
      difficultyFlexible: !hasDifficultyMix(s.difficultyMix),
      knowledgePointIds: (s.knowledgePointIds || []).map(String),
      knowledgeExpanded: false,
      knowledgeDisabled: !(s.knowledgePointIds && s.knowledgePointIds.length),
      excludeQuestionIds: (s.excludeQuestionIds || []).map(String),
      scoreTolerancePct: 0.15,
    })),
    totalScoreRelaxed: false,
  };
}

function hasDifficultyMix(mix) {
  if (!mix) return false;
  return DIFFICULTY_VALUES.some((d) => (mix[d] || 0) > 0);
}

function normalizeDifficultyMix(mix) {
  const out = { 易: 0, 中: 0, 难: 0 };
  if (!mix) return out;
  for (const key of Object.keys(mix)) {
    const norm = normalizeDifficulty(key);
    out[norm] = (out[norm] || 0) + (mix[key] || 0);
  }
  return out;
}

function buildDifficultySlots(section) {
  if (section.difficultyFlexible) return Array(section.count).fill(null);
  const slots = [];
  for (const d of DIFFICULTY_VALUES) {
    for (let i = 0; i < (section.difficultyMix[d] || 0); i += 1) {
      slots.push(d);
    }
  }
  while (slots.length < section.count) slots.push(null);
  while (slots.length > section.count) slots.pop();
  return slots;
}

function questionMatches(q, section, slotDifficulty, kpAllowSet, scoreTarget, scoreTolerancePct) {
  if (section.type && q.type !== section.type) return false;
  if (section.excludeQuestionIds.includes(String(q._id))) return false;

  if (slotDifficulty) {
    if (normalizeDifficulty(q.difficulty) !== slotDifficulty) return false;
  }

  if (kpAllowSet && kpAllowSet.size > 0) {
    const qKps = (q.knowledgePointIds || []).map(String);
    if (!qKps.some((id) => kpAllowSet.has(id))) return false;
  }

  if (scoreTarget != null && scoreTarget > 0) {
    const tol = scoreTolerancePct;
    const min = scoreTarget * (1 - tol);
    const max = scoreTarget * (1 + tol);
    const score = Number(q.totalScore) || 0;
    if (score < min || score > max) return false;
  }

  return true;
}

function resolveKpSet(section, kpExpansionMap) {
  if (section.knowledgeDisabled || !section.knowledgePointIds.length) {
    return null;
  }
  const set = new Set();
  for (const id of section.knowledgePointIds) {
    const expanded = kpExpansionMap.get(id) || [id];
    expanded.forEach((x) => set.add(String(x)));
  }
  return set;
}

/**
 * @param {Object} workBlueprint
 * @param {Array} pool
 * @param {Map<string, string[]>} kpExpansionMap
 * @param {Function} random
 */
function tryGenerateOnce(workBlueprint, pool, kpExpansionMap, random) {
  const used = new Set();
  const sectionResults = [];
  const allIds = [];
  const shortfalls = [];

  let candidatePool = pool.filter((q) => {
    if (workBlueprint.subject && q.subject && q.subject !== workBlueprint.subject) return false;
    if (q.status === 'archived' || q.status === 'deleted') return false;
    return true;
  });

  for (let sectionIndex = 0; sectionIndex < workBlueprint.sections.length; sectionIndex += 1) {
    const section = workBlueprint.sections[sectionIndex];
    const kpSet = resolveKpSet(section, kpExpansionMap);
    const slots = buildDifficultySlots(section);
    shuffleInPlace(slots, random);

    const picked = [];
    for (let slot = 0; slot < section.count; slot += 1) {
      const slotDifficulty = slots[slot] || null;
      const candidates = candidatePool.filter(
        (q) => !used.has(String(q._id))
          && questionMatches(
            q,
            section,
            slotDifficulty,
            kpSet,
            section.scoreEach,
            section.scoreTolerancePct,
          ),
      );
      shuffleInPlace(candidates, random);
      if (candidates.length === 0) {
        shortfalls.push({
          sectionIndex,
          sectionType: section.type,
          slot,
          neededDifficulty: slotDifficulty,
          message: `section ${sectionIndex} (${section.type}) 第 ${slot + 1} 槽无可用题`,
        });
        continue;
      }
      const choice = candidates[0];
      used.add(String(choice._id));
      picked.push(choice);
      allIds.push(String(choice._id));
    }

    sectionResults.push({
      type: section.type,
      questionIds: picked.map((q) => q._id),
      requestedCount: section.count,
      actualCount: picked.length,
    });

    if (picked.length < section.count) {
      return { ok: false, shortfalls, sectionResults, questionIds: allIds };
    }
  }

  const selectedQuestions = allIds.map((id) => pool.find((q) => String(q._id) === id)).filter(Boolean);
  const stats = computeStats(selectedQuestions, workBlueprint.totalScore);

  return {
    ok: true,
    shortfalls: [],
    sectionResults,
    questionIds: allIds,
    stats,
  };
}

function computeStats(questions, requestedTotalScore) {
  const byType = {};
  const byDifficulty = { 易: 0, 中: 0, 难: 0 };
  let totalScore = 0;
  for (const q of questions) {
    byType[q.type] = (byType[q.type] || 0) + 1;
    const d = normalizeDifficulty(q.difficulty);
    byDifficulty[d] = (byDifficulty[d] || 0) + 1;
    totalScore += Number(q.totalScore) || 0;
  }
  return {
    totalScore,
    requestedTotalScore: requestedTotalScore ?? null,
    byType,
    byDifficulty,
  };
}

function applyNextRelaxation(work, sectionIndexHint) {
  for (const step of RELAXATION_ORDER) {
    if (step === 'difficulty_mix') {
      for (let i = 0; i < work.sections.length; i += 1) {
        const s = work.sections[i];
        if (!s.difficultyFlexible && hasDifficultyMix(s.difficultyMix)) {
          const before = { ...s.difficultyMix };
          s.difficultyFlexible = true;
          return {
            step,
            sectionIndex: i,
            message: RELAXATION_LABELS[step],
            before,
            after: { difficultyFlexible: true },
          };
        }
      }
    }

    if (step === 'knowledge_point_scope') {
      for (let i = 0; i < work.sections.length; i += 1) {
        const s = work.sections[i];
        if (s.knowledgeDisabled || !s.knowledgePointIds.length) continue;
        if (!s.knowledgeExpanded) {
          s.knowledgeExpanded = true;
          return {
            step,
            sectionIndex: i,
            message: RELAXATION_LABELS[step] + '（扩展至子树）',
            before: { knowledgePointIds: [...s.knowledgePointIds], knowledgeExpanded: false },
            after: { knowledgeExpanded: true },
          };
        }
        if (!s.knowledgeDisabled) {
          s.knowledgeDisabled = true;
          return {
            step,
            sectionIndex: i,
            message: RELAXATION_LABELS[step] + '（已取消限制）',
            before: { knowledgePointIds: [...s.knowledgePointIds] },
            after: { knowledgeDisabled: true },
          };
        }
      }
    }

    if (step === 'section_score_tolerance') {
      for (let i = 0; i < work.sections.length; i += 1) {
        const s = work.sections[i];
        if (s.scoreEach != null && s.scoreTolerancePct < 0.35) {
          const before = s.scoreTolerancePct;
          s.scoreTolerancePct = 0.35;
          return {
            step,
            sectionIndex: i,
            message: RELAXATION_LABELS[step],
            before: { scoreTolerancePct: before },
            after: { scoreTolerancePct: 0.35 },
          };
        }
      }
    }

    if (step === 'section_count') {
      for (let i = 0; i < work.sections.length; i += 1) {
        const s = work.sections[i];
        if (s.count > 1) {
          const before = s.count;
          s.count -= 1;
          return {
            step,
            sectionIndex: i,
            message: RELAXATION_LABELS[step],
            before: { count: before },
            after: { count: s.count },
          };
        }
      }
    }

    if (step === 'total_score_target') {
      if (work.totalScore != null && !work.totalScoreRelaxed) {
        work.totalScoreRelaxed = true;
        return {
          step,
          sectionIndex: null,
          message: RELAXATION_LABELS[step],
          before: { totalScore: work.totalScore },
          after: { totalScoreRelaxed: true },
        };
      }
    }
  }
  return null;
}

/**
 * @param {Object} blueprint plain object
 * @param {Array} pool Question lean docs
 * @param {Map<string, string[]>} kpExpansionMap rootId -> [ids in subtree]
 */
function generateExamPaper(blueprint, pool, kpExpansionMap) {
  const work = cloneBlueprintForWork(blueprint);
  const random = createSeededRandom(Number(work.randomSeed) || 1);
  const relaxations = [];
  const warnings = [];
  let attempt = tryGenerateOnce(work, pool, kpExpansionMap, random);

  while (!attempt.ok && work.allowRelaxation) {
    const relax = applyNextRelaxation(work);
    if (!relax) break;
    relaxations.push(relax);
    attempt = tryGenerateOnce(work, pool, kpExpansionMap, random);
  }

  if (!attempt.ok) {
    warnings.push('题库不足以满足蓝图（即使已放宽约束）');
    return {
      success: false,
      questionIds: attempt.questionIds,
      sections: attempt.sectionResults,
      stats: computeStats(
        attempt.questionIds.map((id) => pool.find((q) => String(q._id) === id)).filter(Boolean),
        work.totalScore,
      ),
      relaxations,
      warnings,
      shortfalls: attempt.shortfalls,
    };
  }

  if (work.totalScore != null && !work.totalScoreRelaxed) {
    const delta = Math.abs(attempt.stats.totalScore - work.totalScore);
    if (delta > 0.01) {
      warnings.push(`实际总分 ${attempt.stats.totalScore} 与目标 ${work.totalScore} 相差 ${delta.toFixed(2)}`);
    }
  }

  return {
    success: true,
    questionIds: attempt.questionIds,
    sections: attempt.sectionResults,
    stats: attempt.stats,
    relaxations,
    warnings,
    shortfalls: [],
  };
}

module.exports = {
  cloneBlueprintForWork,
  generateExamPaper,
  tryGenerateOnce,
  normalizeDifficultyMix,
};
