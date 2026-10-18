const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveRelationIds, buildNameToIdMap } = require('../services/kpGraphMergeService');

describe('kpGraphMergeService relations', () => {
  it('resolveRelationIds maps names to ids and reports unresolved', () => {
    const nameToId = buildNameToIdMap([
      { _id: '1', name: '自由向量' },
      { _id: '2', name: '混合积' },
    ]);
    const out = resolveRelationIds(['自由向量', '不存在'], nameToId);
    assert.deepEqual(out.ids, ['1']);
    assert.deepEqual(out.unresolved, ['不存在']);
  });
});
