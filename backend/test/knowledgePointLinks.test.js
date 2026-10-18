const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  linksFromLlmSuggestions,
  reconcileLinksFromIds,
} = require('../utils/knowledgePointLinks');

describe('knowledgePointLinks', () => {
  it('linksFromLlmSuggestions stores llm source and confidence', () => {
    const links = linksFromLlmSuggestions([
      { knowledgePointId: 'kp1', confidence: 0.88 },
    ], { replace: true });
    assert.equal(links.length, 1);
    assert.equal(links[0].source, 'llm');
    assert.equal(links[0].confidence, 0.88);
  });

  it('reconcileLinksFromIds preserves existing link metadata', () => {
    const links = reconcileLinksFromIds(
      [{ knowledgePointId: 'kp1', source: 'llm', confidence: 0.9 }],
      ['kp1', 'kp2'],
    );
    assert.equal(links[0].source, 'llm');
    assert.equal(links[1].source, 'manual');
  });
});
