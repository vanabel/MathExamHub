/** @typedef {string[]} CorsOriginList */

const DEFAULT_CORS_ORIGINS = [
  'https://exam.vanabel.cn',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8085',
  'http://localhost:8085',
  'http://127.0.0.1:3000',
];

/**
 * @param {string | undefined} raw
 * @returns {CorsOriginList}
 */
function parseCorsOrigins(raw = process.env.CORS_ORIGINS) {
  if (raw == null || String(raw).trim() === '') {
    return [...DEFAULT_CORS_ORIGINS];
  }
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {string | undefined} origin
 * @param {CorsOriginList} allowedOrigins
 */
function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

module.exports = {
  DEFAULT_CORS_ORIGINS,
  parseCorsOrigins,
  isOriginAllowed,
};
