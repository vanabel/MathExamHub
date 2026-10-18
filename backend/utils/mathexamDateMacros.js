/**
 * mathexam v2.3.3 \\examdate / \\academicyear metadata helpers.
 */

const ISO_DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

function parseIsoExamDate(value) {
  if (value == null || String(value).trim() === '') return null;
  const m = String(value).trim().match(ISO_DATE_RE);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

function formatIsoExamDate(y, m, d) {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function pickMetaField(metadata, key) {
  if (metadata == null) return '';
  if (metadata[key] !== undefined && metadata[key] !== null && String(metadata[key]).trim() !== '') {
    return String(metadata[key]).trim();
  }
  const head = metadata.head || {};
  if (head[key] !== undefined && head[key] !== null && String(head[key]).trim() !== '') {
    return String(head[key]).trim();
  }
  return '';
}

function buildMathexamDateMacroLines(metadata) {
  const lines = [];
  const examDateRaw = pickMetaField(metadata, 'examDate');
  const parsed = parseIsoExamDate(examDateRaw);
  if (parsed) {
    lines.push(`\\examdate{${parsed.y}}{${parsed.m}}{${parsed.d}}`);
  }

  const ayStart = pickMetaField(metadata, 'academicYearStart');
  const ayEnd = pickMetaField(metadata, 'academicYearEnd');
  if (ayStart && ayEnd) {
    lines.push(`\\academicyear{${ayStart}}{${ayEnd}}`);
  }

  return lines;
}

function extractMathexamDateMetadata(preamble) {
  const out = {};
  const examM = preamble.match(/\\examdate\{(\d+)\}\{(\d+)\}\{(\d+)\}/);
  if (examM) {
    out.examDate = formatIsoExamDate(
      parseInt(examM[1], 10),
      parseInt(examM[2], 10),
      parseInt(examM[3], 10),
    );
  }
  const acyM = preamble.match(/\\academicyear\{(\d+)\}\{(\d+)\}/);
  if (acyM) {
    out.academicYearStart = acyM[1].trim();
    out.academicYearEnd = acyM[2].trim();
  }
  return out;
}

const MATHEXAM_DATE_METADATA_KEYS = ['examDate', 'academicYearStart', 'academicYearEnd'];

module.exports = {
  parseIsoExamDate,
  formatIsoExamDate,
  buildMathexamDateMacroLines,
  extractMathexamDateMetadata,
  MATHEXAM_DATE_METADATA_KEYS,
};
