const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseMetadataOverrides } = require('../services/latexImportLlmHelper');

describe('parseMetadataOverrides', () => {
  it('parses JSON string array', () => {
    const body = {
      metadataOverrides: JSON.stringify([{ difficulty: '难', knowledgePointIds: ['kp1'] }]),
    };
    const out = parseMetadataOverrides(body);
    assert.deepEqual(out, [{ difficulty: '难', knowledgePointIds: ['kp1'] }]);
  });

  it('returns null for invalid JSON', () => {
    assert.equal(parseMetadataOverrides({ metadataOverrides: 'not-json' }), null);
  });

  it('returns null when missing', () => {
    assert.equal(parseMetadataOverrides({}), null);
  });
});
