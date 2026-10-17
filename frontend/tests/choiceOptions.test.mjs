import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  listChoiceOptionEntries,
  isChoiceQuestionType,
  CHOICE_OPTION_LABELS,
  formatChoiceOptionLabel,
} from '../src/utils/choiceOptions.js';

test('listChoiceOptionEntries preserves A-D order for object options', () => {
  const entries = listChoiceOptionEntries({
    D: 'fourth',
    A: 'first',
    C: 'third',
    B: 'second',
  });
  assert.deepEqual(entries.map((e) => e.label), ['A', 'B', 'C', 'D']);
  assert.equal(entries[0].text, 'first');
});

test('listChoiceOptionEntries maps arrays to A,B,C', () => {
  const entries = listChoiceOptionEntries(['x', 'y']);
  assert.deepEqual(entries.map((e) => e.label), ['A', 'B']);
});

test('isChoiceQuestionType', () => {
  assert.equal(isChoiceQuestionType('单选题'), true);
  assert.equal(isChoiceQuestionType('证明题'), false);
});

test('CHOICE_OPTION_LABELS starts with A-D', () => {
  assert.deepEqual(CHOICE_OPTION_LABELS.slice(0, 4), ['A', 'B', 'C', 'D']);
});

test('formatChoiceOptionLabel is exactly (A) not A.', () => {
  assert.equal(formatChoiceOptionLabel('A'), '(A)');
  assert.equal(formatChoiceOptionLabel('b'), '(B)');
  assert.equal(formatChoiceOptionLabel('D'), '(D)');
  assert.doesNotMatch(formatChoiceOptionLabel('A'), /^A\.$/);
});

test('listChoiceOptionEntries exposes displayLabel (A) form', () => {
  const entries = listChoiceOptionEntries({ A: 'one', B: 'two', C: 'three', D: 'four' });
  assert.deepEqual(entries.map((e) => e.displayLabel), ['(A)', '(B)', '(C)', '(D)']);
});
