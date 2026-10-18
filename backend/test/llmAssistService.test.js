const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  suggestQuestionMetadata,
  validateSuggestion,
  buildLlmUserPayload,
  buildQuestionMetadataInput,
} = require('../services/llmAssistService');

describe('llmAssistService payload', () => {
  it('includes answer, solution, scores, and options in LLM user JSON', () => {
    const input = buildQuestionMetadataInput(
      {
        questionText: '求极限',
        type: '解答题',
        subject: '高数',
        totalScore: 10,
        correctAnswer: '42',
        solution: '因为 \\score{5} 所以 \\score{5}',
        options: { A: '1', B: '2' },
      },
      [{ _id: 'kp1', path: '极限' }],
    );
    const payload = buildLlmUserPayload(input);
    assert.match(payload.answerAndSolution, /参考答案/);
    assert.match(payload.answerAndSolution, /解答过程/);
    assert.equal(payload.totalScore, 10);
    assert.deepEqual(payload.stepScores, [5, 5]);
    assert.equal(payload.options.A, '1');
  });
});

describe('llmAssistService mock', () => {
  it('suggests difficulty and kp id', async () => {
    const out = await suggestQuestionMetadata(
      {
        questionText: '证明勾股定理',
        type: '证明题',
        subject: '几何',
        knowledgePoints: [{ _id: 'abc', path: '几何/勾股' }],
      },
      { llmProvider: 'mock' },
    );
    assert.equal(out.difficulty, '难');
    assert.deepEqual(out.knowledgePointIds, ['abc']);
  });

  it('validateSuggestion rejects bad difficulty', () => {
    assert.equal(validateSuggestion({ difficulty: '超难' }, [{ id: '1', path: 'a' }]), null);
  });
});

describe('llmAssistService openai_compatible', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses HTTP mock and returns validated suggestion', async () => {
    global.fetch = async () => ({
      ok: true,
      async json() {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                difficulty: '易',
                knowledgePointIds: ['kp1'],
                rationale: '基础题',
              }),
            },
          }],
        };
      },
    });
    const out = await suggestQuestionMetadata(
      {
        questionText: '判断是否为真',
        type: '判断题',
        subject: '代数',
        knowledgePoints: [{ _id: 'kp1', path: '代数/基础' }],
      },
      {
        llmProvider: 'openai_compatible',
        llmApiKey: 'sk-x',
        llmApiBaseUrl: 'https://api.test/v1',
        llmModel: 'test-model',
      },
    );
    assert.equal(out.difficulty, '易');
    assert.deepEqual(out.knowledgePointIds, ['kp1']);
    assert.equal(out.source, 'llm');
  });

  it('surfaces LLM failure with heuristic fallback and llmError', async () => {
    global.fetch = async () => {
      throw new Error('network down');
    };
    const out = await suggestQuestionMetadata(
      {
        questionText: '证明勾股定理',
        type: '证明题',
        subject: '几何',
        knowledgePoints: [{ _id: 'abc', path: '几何/勾股' }],
      },
      {
        llmProvider: 'openai_compatible',
        llmApiKey: 'sk-x',
        llmApiBaseUrl: 'https://api.test/v1',
        llmModel: 'test-model',
      },
    );
    assert.equal(out.source, 'heuristic');
    assert.match(out.llmError, /network down/);
    assert.equal(out.difficulty, '难');
  });
});
