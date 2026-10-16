const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseSampleTexQuestions,
  loadRichBankFixture,
  onboardingPayload,
} = require('../services/onboardingService');

describe('onboardingService', () => {
  it('parses package-examples.tex into multiple questions', () => {
    const { questions, sourceFileName } = parseSampleTexQuestions();
    assert.equal(sourceFileName, 'package-examples.tex');
    assert.ok(questions.length >= 4, `expected sample questions, got ${questions.length}`);
    assert.ok(questions.some((q) => q.type && q.questionText));
  });

  it('rich bank fixture has 40+ questions, four types, three difficulties, KP tree', () => {
    const fixture = loadRichBankFixture();
    assert.ok(fixture.questions.length >= 40);
    const types = new Set(fixture.questions.map((q) => q.type));
    assert.equal(types.size, 4);
    const diffs = new Set(fixture.questions.map((q) => q.difficulty));
    assert.ok(diffs.has('易') && diffs.has('中') && diffs.has('难'));
    assert.ok(fixture.knowledgePoints.length >= 5);
    assert.ok(fixture.starterBlueprint?.sections?.length >= 4);
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
