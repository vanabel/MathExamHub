const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateKpTagSuggestions } = require('../services/llmKpSuggestService');

describe('llmKpSuggestService', () => {
  const catalog = [
    { id: 'kp1', path: '/几何/勾股' },
    { id: 'kp2', path: '/几何/相似' },
  ];

  it('validateKpTagSuggestions parses suggestions with confidence', () => {
    const out = validateKpTagSuggestions({
      suggestions: [
        { knowledgePointId: 'kp1', confidence: 0.92, reason: '勾股定理' },
        { knowledgePointId: 'bad', confidence: 1, reason: 'x' },
        { knowledgePointId: 'kp2', confidence: 1.5, reason: 'y' },
      ],
    }, catalog);
    assert.equal(out.suggestedKnowledgePointIds.length, 2);
    assert.equal(out.suggestions[0].confidence, 0.92);
    assert.equal(out.source, 'llm');
  });
});
