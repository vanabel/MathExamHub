const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseMetadataOverrides,
  mapWithConcurrency,
  attachLlmSuggestions,
  LLM_PREVIEW_MAX_QUESTIONS,
} = require('../services/latexImportLlmHelper');

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

describe('attachLlmSuggestions cap', () => {
  it('truncates beyond maxQuestions', async () => {
    const questions = Array.from({ length: 5 }, (_, i) => ({
      questionText: `q${i}`,
      type: '填空题',
    }));
    const out = await attachLlmSuggestions(questions, '507f1f77bcf86cd799439011', {
      settings: { llmAssistEnabled: true },
      knowledgePoints: [],
      maxQuestions: 2,
      concurrency: 2,
      suggestQuestionMetadata: async () => ({ difficulty: '中', knowledgePointIds: [] }),
    });
    assert.equal(out.llmPreviewProcessed, 2);
    assert.equal(out.llmSuggestions.length, 5);
    assert.equal(out.llmSuggestions[2], null);
    assert.equal(out.llmPreviewTruncated, true);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves order', async () => {
    const out = await mapWithConcurrency([1, 2, 3], 2, async (x) => x * 2);
    assert.deepEqual(out, [2, 4, 6]);
  });
});
