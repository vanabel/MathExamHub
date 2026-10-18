const XLSX = require('xlsx');

const SHEET_NAME = '课程知识点';
const LEVEL_COLS = 7;
const COL = {
  PREREQ: 7,
  SUCCESSOR: 8,
  RELATED: 9,
  TAGS: 10,
  COGNITIVE: 11,
  CATEGORY: 12,
  OBJECTIVE: 13,
  DESCRIPTION: 14,
};

function splitNameList(value) {
  return String(value ?? '')
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitTags(value) {
  return String(value ?? '')
    .split(/[;；、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractSubjectFromTitle(title) {
  const t = String(title || '').trim();
  const m = t.match(/^(.+?)课程知识点$/);
  if (m) return m[1].trim();
  return t.replace(/课程知识点/g, '').trim() || '数学';
}

function parseKpExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error(`缺少工作表「${SHEET_NAME}」`);
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) {
    throw new Error('Excel 内容过短');
  }
  const title = String(rows[0][0] || '').trim();
  const subject = extractSubjectFromTitle(title);
  const header = rows[1];
  if (!String(header[0] || '').includes('一级知识点')) {
    throw new Error('第 2 行应为表头（一级知识点…）');
  }

  const lastSeen = Array(LEVEL_COLS).fill('');
  const nodes = [];

  for (let r = 2; r < rows.length; r += 1) {
    const row = rows[r];
    let depth = -1;
    for (let i = 0; i < LEVEL_COLS; i += 1) {
      const cell = String(row[i] ?? '').trim();
      if (cell) {
        lastSeen[i] = cell;
        for (let j = i + 1; j < LEVEL_COLS; j += 1) lastSeen[j] = '';
        depth = i;
      }
    }
    if (depth < 0) continue;

    const levelNames = lastSeen.slice(0, depth + 1).filter(Boolean);
    const name = levelNames[levelNames.length - 1];
    const path = `/${levelNames.join('/')}`;

    nodes.push({
      name,
      path,
      depth,
      levelNames,
      prerequisiteNames: splitNameList(row[COL.PREREQ]),
      successorNames: splitNameList(row[COL.SUCCESSOR]),
      relatedNames: splitNameList(row[COL.RELATED]),
      tags: splitTags(row[COL.TAGS]),
      cognitiveLevel: String(row[COL.COGNITIVE] ?? '').trim(),
      category: String(row[COL.CATEGORY] ?? '').trim(),
      objective: String(row[COL.OBJECTIVE] ?? '').trim(),
      description: String(row[COL.DESCRIPTION] ?? '').trim(),
      rowIndex: r,
    });
  }

  return {
    sheetName: SHEET_NAME,
    title,
    subject,
    nodes,
  };
}

module.exports = {
  parseKpExcelBuffer,
  extractSubjectFromTitle,
  SHEET_NAME,
  COL,
  LEVEL_COLS,
  splitNameList,
  splitTags,
};
