import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferAcademicYearFromExamDate,
  normalizeAcademicYearOverride,
  suggestedAcademicYearLabel,
} from '../src/utils/latexExamDateForm.js';

describe('latexExamDateForm', () => {
  it('infers academic year with Sep 1 boundary', () => {
    assert.deepEqual(inferAcademicYearFromExamDate('2026-10-18'), { start: '2026', end: '2027' });
    assert.deepEqual(inferAcademicYearFromExamDate('2026-08-31'), { start: '2025', end: '2026' });
  });

  it('normalize rejects partial override', () => {
    const r = normalizeAcademicYearOverride('2026', '');
    assert.ok(r.error);
    assert.equal(r.academicYearStart, '2026');
  });

  it('normalize accepts valid pair', () => {
    const r = normalizeAcademicYearOverride('2020', '2021');
    assert.equal(r.error, null);
    assert.equal(r.academicYearStart, '2020');
  });

  it('suggested label from exam date', () => {
    assert.equal(suggestedAcademicYearLabel('2026-10-01'), '2026–2027 学年');
  });
});
