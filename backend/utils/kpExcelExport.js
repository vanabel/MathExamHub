const XLSX = require('xlsx');
const { SHEET_NAME, LEVEL_COLS, COL } = require('./kpExcelParse');

function pathToLevelNames(path) {
  const p = String(path || '').trim();
  if (!p) return [];
  return p.replace(/^\//, '').split('/').filter(Boolean);
}

function buildKpExcelWorkbook({ subject, title, nodes }) {
  const sheetTitle = title || `${subject}课程知识点`;
  const header = [
    '一级知识点', '二级知识点', '三级知识点', '四级知识点',
    '五级知识点', '六级知识点', '七级知识点',
    '前置知识点', '后置知识点', '关联知识点',
    '标签', '认知维度', '分类', '教学目标', '知识点说明',
  ];

  const nameById = new Map((nodes || []).map((n) => [String(n._id || n.id), n.name]));

  const resolveNames = (ids) => (ids || [])
    .map((id) => nameById.get(String(id)))
    .filter(Boolean)
    .join(';');

  const dataRows = (nodes || [])
    .slice()
    .sort((a, b) => String(a.path).localeCompare(String(b.path), 'zh-CN'))
    .map((n) => {
      const row = Array(16).fill('');
      const levels = pathToLevelNames(n.path);
      for (let i = 0; i < Math.min(levels.length, LEVEL_COLS); i += 1) {
        row[i] = levels[i];
      }
      row[COL.PREREQ] = resolveNames(n.prerequisiteIds);
      row[COL.SUCCESSOR] = resolveNames(n.successorIds);
      row[COL.RELATED] = resolveNames(n.relatedIds);
      row[COL.TAGS] = (n.tags || []).join(';');
      row[COL.COGNITIVE] = n.cognitiveLevel || '';
      row[COL.CATEGORY] = n.category || '';
      row[COL.OBJECTIVE] = n.objective || '';
      row[COL.DESCRIPTION] = n.description || '';
      return row;
    });

  const aoa = [[sheetTitle, ...Array(15).fill('')], header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  buildKpExcelWorkbook,
  pathToLevelNames,
};
