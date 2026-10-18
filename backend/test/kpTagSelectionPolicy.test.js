const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { applyKpTagSelectionPolicy } = require('../utils/kpTagSelectionPolicy');

describe('kpTagSelectionPolicy', () => {
  const catalog = [
    { id: 'root', path: '/章' },
    { id: 'leaf', path: '/章/节/点' },
    { id: 'mid', path: '/章/节' },
  ];

  it('prefers deeper leaf and default max 1', () => {
    const picked = applyKpTagSelectionPolicy([
      { knowledgePointId: 'root', confidence: 0.99, reason: 'a' },
      { knowledgePointId: 'leaf', confidence: 0.7, reason: 'b' },
    ], catalog, { maxKpsPerQuestion: 1 });
    assert.equal(picked.length, 1);
    assert.equal(picked[0].knowledgePointId, 'leaf');
  });

  it('allows extra KPs only above confidence threshold', () => {
    const twoLeaves = [
      { id: 'a', path: '/章/甲' },
      { id: 'b', path: '/章/乙' },
    ];
    const picked = applyKpTagSelectionPolicy([
      { knowledgePointId: 'a', confidence: 0.9, reason: 'a' },
      { knowledgePointId: 'b', confidence: 0.5, reason: 'b' },
      { knowledgePointId: 'b', confidence: 0.92, reason: 'c' },
    ], twoLeaves, { maxKpsPerQuestion: 2, extraMinConfidence: 0.85 });
    assert.equal(picked.length, 2);
    assert.deepEqual(picked.map((p) => p.knowledgePointId).sort(), ['a', 'b']);
  });
});
