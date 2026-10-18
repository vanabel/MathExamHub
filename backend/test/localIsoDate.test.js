const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatLocalIsoDate } = require('../utils/localIsoDate');

describe('localIsoDate', () => {
  it('formats YYYY-MM-DD from a Date in local components', () => {
    const d = new Date(2026, 9, 18, 15, 30);
    assert.equal(formatLocalIsoDate(d), '2026-10-18');
  });
});
