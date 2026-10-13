const DIFFICULTY_VALUES = ['易', '中', '难'];

const LEGACY_DIFFICULTY_MAP = {
  简单: '易',
  易: '易',
  中等: '中',
  中: '中',
  较难: '难',
  困难: '难',
  难: '难',
};

/**
 * @param {string | null | undefined} value
 * @param {'易' | '中' | '难'} [fallback='中']
 */
function normalizeDifficulty(value, fallback = '中') {
  if (value == null || String(value).trim() === '') {
    return fallback;
  }
  const trimmed = String(value).trim();
  if (LEGACY_DIFFICULTY_MAP[trimmed]) {
    return LEGACY_DIFFICULTY_MAP[trimmed];
  }
  if (DIFFICULTY_VALUES.includes(trimmed)) {
    return trimmed;
  }
  return fallback;
}

/** @deprecated 迁移脚本别名 */
const mapDifficultyForMigration = normalizeDifficulty;

module.exports = {
  DIFFICULTY_VALUES,
  LEGACY_DIFFICULTY_MAP,
  normalizeDifficulty,
  mapDifficultyForMigration,
};
