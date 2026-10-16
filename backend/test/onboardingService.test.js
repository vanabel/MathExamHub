const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseSampleTexQuestions, onboardingPayload } = require('../services/onboardingService');

describe('onboardingService', () => {
  it('parses package-examples.tex into multiple questions', () => {
    const { questions, sourceFileName } = parseSampleTexQuestions();
    assert.equal(sourceFileName, 'package-examples.tex');
    assert.ok(questions.length >= 4, `expected sample questions, got ${questions.length}`);
    assert.ok(questions.some((q) => q.type && q.questionText));
  });

  it('onboardingPayload reflects user flags', () => {
    const p = onboardingPayload({
      onboardingSampleImported: true,
      onboardingTourCompleted: false,
      onboardingTourStep: 2,
    });
    assert.equal(p.sampleImported, true);
    assert.equal(p.tourStep, 2);
  });
});
