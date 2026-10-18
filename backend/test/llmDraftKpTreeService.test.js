const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateDraftTree, KP_IMPORT_FORMAT } = require('../services/llmDraftKpTreeService');

describe('llmDraftKpTreeService', () => {
  it('validateDraftTree normalizes import format', () => {
    const out = validateDraftTree({
      subject: '解析几何',
      nodes: [{ name: '二次曲线', parentPath: '/解析几何' }],
    }, '解析几何');
    assert.equal(out.format, KP_IMPORT_FORMAT);
    assert.equal(out.nodes[0].path, '/解析几何/二次曲线');
  });
});
