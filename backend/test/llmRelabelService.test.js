const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');

describe('llmRelabelService', () => {
  it('resolveRelabelConcurrency prefers CLI override', () => {
    const { resolveRelabelConcurrency } = require('../services/llmRelabelService');
    assert.equal(resolveRelabelConcurrency({ llmPreviewConcurrency: 3 }, '5'), 5);
  });

  it('retries on timeout-like llmError before giving up', async () => {
    const llmAssist = require('../services/llmAssistService');
    let calls = 0;
    mock.method(llmAssist, 'suggestQuestionMetadata', async () => {
      calls += 1;
      if (calls < 3) {
        return { difficulty: '中', knowledgePointIds: [], source: 'heuristic', llmError: 'This operation was aborted' };
      }
      return { difficulty: '难', knowledgePointIds: [], source: 'llm', rationale: 'ok' };
    });
    delete require.cache[require.resolve('../services/llmRelabelService')];
    try {
      const { suggestWithTimeoutRetries } = require('../services/llmRelabelService');
      const out = await suggestWithTimeoutRetries(
        { questionText: 'x', knowledgePoints: [] },
        { llmProvider: 'openai_compatible', relabelTimeoutBackoffMs: [1, 1] },
      );
      assert.equal(out.source, 'llm');
      assert.equal(calls, 3);
    } finally {
      mock.restoreAll();
      delete require.cache[require.resolve('../services/llmRelabelService')];
    }
  });

  it('applyRelabelSuggestionsFromReport updates changed rows only', async () => {
    const Question = require('../models/Question');
    const updates = [];
    mock.method(Question, 'updateOne', async (filter, patch) => {
      updates.push({ filter, patch });
      return { modifiedCount: 1 };
    });
    delete require.cache[require.resolve('../services/llmRelabelService')];
    try {
      const { applyRelabelSuggestionsFromReport } = require('../services/llmRelabelService');
      const result = await applyRelabelSuggestionsFromReport('bank1', [
        { questionId: 'q1', currentDifficulty: '易', suggestedDifficulty: '中' },
        { questionId: 'q2', currentDifficulty: '中', suggestedDifficulty: '中' },
      ]);
      assert.equal(result.changed, 1);
      assert.equal(result.modified, 1);
      assert.equal(updates.length, 1);
      assert.equal(updates[0].patch.$set.difficulty, '中');
    } finally {
      mock.restoreAll();
      delete require.cache[require.resolve('../services/llmRelabelService')];
    }
  });
});
