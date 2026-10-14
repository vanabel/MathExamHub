const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildKnowledgePointPath } = require('../utils/knowledgePointPath');

describe('buildKnowledgePointPath', () => {
  it('builds root path', () => {
    assert.equal(buildKnowledgePointPath(null, '解析几何'), '/解析几何');
  });

  it('appends to parent path', () => {
    assert.equal(
      buildKnowledgePointPath('/解析几何', '二次曲线'),
      '/解析几何/二次曲线',
    );
  });
});
