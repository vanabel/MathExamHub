/** Client-side helpers for examDate / academic year fields (mathexam Sep 1 rule). */

export function parseIsoExamDate(value) {
  const m = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/** Academic year start/end calendar years (e.g. Oct 2026 → 2026 / 2027). */
export function inferAcademicYearFromExamDate(examDate) {
  const p = parseIsoExamDate(examDate);
  if (!p) return null;
  const start = p.m >= 9 ? p.y : p.y - 1;
  return { start: String(start), end: String(start + 1) };
}

/**
 * Normalize override fields for API export. Empty both → auto from examDate in LaTeX.
 * @returns {{ academicYearStart: string, academicYearEnd: string, error: string|null }}
 */
export function normalizeAcademicYearOverride(start, end) {
  const s = start === undefined || start === null ? '' : String(start).trim();
  const e = end === undefined || end === null ? '' : String(end).trim();
  if (!s && !e) {
    return { academicYearStart: '', academicYearEnd: '', error: null };
  }
  if (!s || !e) {
    return {
      academicYearStart: s,
      academicYearEnd: e,
      error: '请同时填写学年起止，或两者都留空以按考试日期自动推算（9 月 1 日起算）。',
    };
  }
  const sn = parseInt(s, 10);
  const en = parseInt(e, 10);
  if (Number.isNaN(sn) || Number.isNaN(en)) {
    return { academicYearStart: s, academicYearEnd: e, error: '学年应为四位数字年份。' };
  }
  if (en <= sn) {
    return {
      academicYearStart: String(sn),
      academicYearEnd: String(en),
      error: '学年止应大于学年起（通常为起 + 1，如 2026–2027）。',
    };
  }
  if (en !== sn + 1) {
    return {
      academicYearStart: String(sn),
      academicYearEnd: String(en),
      error: '学年跨度建议为一年（学年止 = 学年起 + 1）。',
    };
  }
  return { academicYearStart: String(sn), academicYearEnd: String(en), error: null };
}

export function suggestedAcademicYearLabel(examDate) {
  const inf = inferAcademicYearFromExamDate(examDate);
  if (!inf) return '';
  return `${inf.start}–${inf.end} 学年`;
}
