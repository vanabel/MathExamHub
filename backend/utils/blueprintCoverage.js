const { createSeededRandom } = require('../utils/seededRandom');
const {
  cloneBlueprintForWork,
  tryGenerateOnce,
} = require('../services/examGenerator');

function buildGapListQuery(section, slotDifficulty) {
  if (!section) return {};
  const query = { type: section.type };
  if (slotDifficulty) query.difficulty = slotDifficulty;
  if (section.knowledgePointIds?.length) {
    query.knowledgePointId = String(section.knowledgePointIds[0]);
    query.subtree = 'true';
  }
  if (section.scoreEach != null && section.scoreEach > 0) {
    const tol = section.scoreTolerancePct ?? 0.15;
    query.minScore = Math.round(section.scoreEach * (1 - tol) * 100) / 100;
    query.maxScore = Math.round(section.scoreEach * (1 + tol) * 100) / 100;
  }
  return query;
}

/**
 * Pre-generation coverage using the same matching rules as examGenerator (single attempt, fixed seed).
 * @param {object} blueprint
 * @param {Array} pool
 * @param {Map<string, string[]>} kpExpansionMap
 * @param {{ randomSeed?: number, allowRelaxation?: boolean }} [opts]
 */
function analyzeBlueprintCoverage(blueprint, pool, kpExpansionMap, opts = {}) {
  const work = cloneBlueprintForWork(blueprint);
  work.allowRelaxation = opts.allowRelaxation === true;
  const seed = Number(opts.randomSeed ?? work.randomSeed) || 1;
  const random = createSeededRandom(seed);
  const attempt = tryGenerateOnce(work, pool, kpExpansionMap, random);

  const gaps = (attempt.shortfalls || []).map((sf) => {
    const section = work.sections[sf.sectionIndex];
    return {
      ...sf,
      sectionType: sf.sectionType || section?.type,
      scoreEach: section?.scoreEach,
      scoreTolerancePct: section?.scoreTolerancePct ?? 0.15,
      knowledgePointIds: section?.knowledgePointIds || [],
      listQuery: buildGapListQuery(section, sf.neededDifficulty),
    };
  });

  const sectionSummaries = (work.sections || []).map((section, sectionIndex) => {
    const sr = attempt.sectionResults?.[sectionIndex];
    return {
      sectionIndex,
      type: section.type,
      requestedCount: section.count,
      actualCount: sr?.actualCount ?? 0,
      scoreEach: section.scoreEach,
      difficultyMix: section.difficultyMix,
      knowledgePointIds: section.knowledgePointIds,
    };
  });

  return {
    ok: attempt.ok,
    gaps,
    sectionSummaries,
    randomSeedUsed: seed,
  };
}

function pickBestWorstAttempts(attempts) {
  if (!attempts.length) {
    return { best: null, worst: null };
  }
  const byGapThenSeed = (a, b) => {
    if (a.gapCount !== b.gapCount) return a.gapCount - b.gapCount;
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    return a.seed - b.seed;
  };
  const sorted = [...attempts].sort(byGapThenSeed);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  return { best, worst };
}

/**
 * Run coverage across consecutive seeds (baseSeed, baseSeed+1, …) for wizard hints.
 * @param {number} [opts.seedTrials] default 1 (single seed only)
 */
function analyzeBlueprintCoverageMultiSeed(blueprint, pool, kpExpansionMap, opts = {}) {
  const baseSeed = Number(opts.randomSeed ?? blueprint.randomSeed) || 1;
  const seedTrials = Math.min(Math.max(Number(opts.seedTrials) || 1, 1), 32);
  const attempts = [];
  for (let i = 0; i < seedTrials; i += 1) {
    const seed = baseSeed + i;
    const analysis = analyzeBlueprintCoverage(blueprint, pool, kpExpansionMap, {
      ...opts,
      randomSeed: seed,
    });
    attempts.push({
      seed,
      ok: analysis.ok,
      gapCount: analysis.gaps.length,
      gaps: analysis.gaps,
      sectionSummaries: analysis.sectionSummaries,
    });
  }
  const { best, worst } = pickBestWorstAttempts(attempts);
  const primary = worst || attempts[0];
  return {
    ok: primary.ok,
    gaps: primary.gaps,
    sectionSummaries: primary.sectionSummaries,
    randomSeedUsed: primary.seed,
    multiSeed: {
      baseSeed,
      seedTrials,
      attempts: attempts.map(({ seed, ok, gapCount }) => ({ seed, ok, gapCount })),
      best,
      worst,
    },
  };
}

module.exports = {
  analyzeBlueprintCoverage,
  analyzeBlueprintCoverageMultiSeed,
  buildGapListQuery,
};
