const assert = require('node:assert/strict');
const { test } = require('node:test');
const { LatexGenerator } = require('../utils/latexParser');

test('generateHeader includes default vector macros via providecommand', () => {
  const generator = new LatexGenerator();
  const header = generator.generateHeader({}, 'exam');
  for (const macro of ['\\providecommand{\\br}', '\\providecommand{\\bn}', '\\providecommand{\\II}']) {
    assert.match(header, new RegExp(macro.replace(/\\/g, '\\\\')));
  }
});
