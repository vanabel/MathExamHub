const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mergeKnowledgePointIds } = require('../utils/knowledgePointApply');

describe('mergeKnowledgePointIds', () => {
  it('adds without removing existing by default', () => {
    assert.deepEqual(
      mergeKnowledgePointIds(['a', 'b'], ['b', 'c']),
      ['a', 'b', 'c'],
    );
  });

  it('replaces when replace=true', () => {
    assert.deepEqual(
      mergeKnowledgePointIds(['a', 'b'], ['c'], true),
      ['c'],
    );
  });
});
