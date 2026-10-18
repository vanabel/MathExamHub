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

  it('rejects unknown ids and caps at 3', () => {
    const bigCatalog = [
      { id: 'kp1', path: '/a' },
      { id: 'kp2', path: '/b' },
      { id: 'kp3', path: '/c' },
      { id: 'kp4', path: '/d' },
    ];
    const out = validateKpTagSuggestions({
      suggestions: [
        { knowledgePointId: 'kp1', confidence: 0.9, reason: 'a' },
        { knowledgePointId: 'kpX', confidence: 1, reason: 'bad' },
        { knowledgePointId: 'kp2', confidence: 0.8, reason: 'b' },
        { knowledgePointId: 'kp3', confidence: 0.7, reason: 'c' },
        { knowledgePointId: 'kp4', confidence: 0.6, reason: 'd' },
      ],
    }, bigCatalog);
    assert.equal(out.suggestions.length, 3);
    assert.ok(!out.suggestions.some((s) => s.knowledgePointId === 'kpX'));
  });
});
