const PACKAGE_SUGGESTIONS = ['nospace', 'showans', 'fixlast', 'caogaozhi', 'a3paper'];

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pick(meta, key, fallback = '') {
  const v = meta?.[key];
  if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  return fallback;
}

/**
 * HTML approximation of mathexam exam title block (A4 layout).
 */
export function buildExamHeaderHtmlPreview(meta) {
  const university = pick(meta, 'university', '西南大学');
  const school = pick(meta, 'school', '数学与统计学院');
  const course = pick(meta, 'course', '');
  const aorb = pick(meta, 'AorB', 'A');
  const finalmiddle = pick(meta, 'finalmiddle', '期末');
  const totaltime = pick(meta, 'totaltime', '120');
  const openclose = pick(meta, 'openclose', '闭卷');
  const degree = pick(meta, 'degree', '本科');
  const major = pick(meta, 'major', '数学与应用数学');
  const grade = pick(meta, 'grade', '');
  const examiner = pick(meta, 'examiner', '—');
  const director = pick(meta, 'director', '—');
  const dean = pick(meta, 'dean', '—');

  return `
<div class="exam-header-preview-inner">
  <div class="exam-header-preview-title">${escapeHtml(university)} · ${escapeHtml(school)}</div>
  <div class="exam-header-preview-course">${course ? `《${escapeHtml(course)}》` : '（未设置课程）'}课程试题【${escapeHtml(aorb)}】卷</div>
  <table class="exam-header-preview-table">
    <tr><td colspan="2">${escapeHtml(finalmiddle)}考试</td><td colspan="2">${escapeHtml(totaltime)} 分钟</td></tr>
    <tr><td>${escapeHtml(openclose)}</td><td>${escapeHtml(degree)}</td><td colspan="2">${escapeHtml(major)}</td></tr>
    <tr><td colspan="2">${grade ? `${escapeHtml(grade)} 级` : '—'}</td><td colspan="2">命题 ${escapeHtml(examiner)} · 审题 ${escapeHtml(director)} · 院长 ${escapeHtml(dean)}</td></tr>
  </table>
</div>`;
}

function buildDateMacroPreviewLines(meta) {
  const lines = [];
  const examDate = pick(meta, 'examDate', '');
  const m = examDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    lines.push(`\\examdate{${parseInt(m[1], 10)}}{${parseInt(m[2], 10)}}{${parseInt(m[3], 10)}}`);
  }
  const ay0 = pick(meta, 'academicYearStart', '');
  const ay1 = pick(meta, 'academicYearEnd', '');
  if (ay0 && ay1) {
    lines.push(`\\academicyear{${ay0}}{${ay1}}`);
  }
  return lines;
}

export function buildExamHeaderPreamblePreview(meta) {
  const pkg = (meta?.packageOptions?.length ? meta.packageOptions : ['nospace']).join(',');
  const lines = [
    '% !TEX program = xelatex',
    '\\documentclass{article}',
    `\\usepackage[${pkg}]{mathexam}`,
    '\\usepackage{hyperref}',
    `\\university{${pick(meta, 'university', '西南大学')}}`,
    `\\school{${pick(meta, 'school', '数学与统计学院')}}`,
    `\\course{${pick(meta, 'course', '')}}`,
    `\\AorB{${pick(meta, 'AorB', 'A')}}`,
    ...buildDateMacroPreviewLines(meta),
    `\\semester{${pick(meta, 'semester', '')}}`,
    `\\finalmiddle{${pick(meta, 'finalmiddle', '期末')}}`,
    `\\totaltime{${pick(meta, 'totaltime', '120')}}`,
    `\\openclose{${pick(meta, 'openclose', '闭卷')}}`,
    `\\degree{${pick(meta, 'degree', '本科')}}`,
    `\\major{${pick(meta, 'major', '数学与应用数学')}}`,
    `\\grade{${pick(meta, 'grade', '')}}`,
    `\\examiner{${pick(meta, 'examiner', '')}}`,
    `\\director{${pick(meta, 'director', '')}}`,
    `\\dean{${pick(meta, 'dean', '')}}`,
  ];
  return lines.join('\n');
}

export { PACKAGE_SUGGESTIONS };
