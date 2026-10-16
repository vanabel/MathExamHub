const mongoose = require('mongoose');
const { generateExamPaper } = require('./examGenerator');
const { computeVariantOverlap } = require('../utils/examVariantOverlap');

const MAX_SEED_ATTEMPTS = 48;

/**
 * @param {object} blueprint base blueprint (plain)
 * @param {Array} pool
 * @param {Map} kpExpansionMap
 * @param {number} seedA
 * @param {number} seedBStart
 * @param {number} maxOverlapRatio 0..1
 */
function generateAbVariants(blueprint, pool, kpExpansionMap, seedA, seedBStart, maxOverlapRatio) {
  const bpA = { ...blueprint, randomSeed: seedA };
  const resultA = generateExamPaper(bpA, pool, kpExpansionMap);

  let best = null;
  let seedB = seedBStart;
  const warnings = [];

  for (let attempt = 0; attempt < MAX_SEED_ATTEMPTS; attempt += 1) {
    const bpB = { ...blueprint, randomSeed: seedB + attempt };
    const resultB = generateExamPaper(bpB, pool, kpExpansionMap);
    const { overlapRatio, overlapCount } = computeVariantOverlap(
      resultA.questionIds,
      resultB.questionIds,
    );
    const candidate = {
      resultB,
      seedB: bpB.randomSeed,
      overlapRatio,
      overlapCount,
    };
    if (!best || overlapRatio < best.overlapRatio) {
      best = candidate;
    }
    if (overlapRatio <= maxOverlapRatio && resultB.questionIds.length) {
      best = candidate;
      break;
    }
  }

  if (best && best.overlapRatio > maxOverlapRatio) {
    warnings.push(
      `B 卷与 A 卷重合率 ${(best.overlapRatio * 100).toFixed(1)}% 仍高于上限 ${(maxOverlapRatio * 100).toFixed(0)}%（已选最优种子）`,
    );
  }

  const variantGroupId = new mongoose.Types.ObjectId();

  return {
    variantGroupId,
    resultA,
    resultB: best.resultB,
    seedA,
    seedB: best.seedB,
    overlapRatio: best.overlapRatio,
    overlapCount: best.overlapCount,
    warnings,
  };
}

module.exports = {
  generateAbVariants,
  computeVariantOverlap,
};
