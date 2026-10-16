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

module.exports = {
  analyzeBlueprintCoverage,
  buildGapListQuery,
};
