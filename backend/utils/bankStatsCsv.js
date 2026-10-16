function escapeCsvCell(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function gapFilterCells(listQuery) {
  const q = listQuery || {};
  return [
    q.type ?? '',
    q.difficulty ?? '',
    q.knowledgePointId ?? '',
    q.subtree === 'true' ? 'true' : '',
    q.minScore ?? '',
    q.maxScore ?? '',
  ].map(escapeCsvCell);
}

/**
 * @param {Awaited<ReturnType<import('./bankQuestionStats').buildBankQuestionDashboard>>} dashboard
 */
function buildBankStatsCsvLines(dashboard) {
  const header =
    'section,key,value,sectionIndex,slot,neededDifficulty,message,filterType,filterDifficulty,filterKnowledgePointId,filterSubtree,filterMinScore,filterMaxScore';
  const lines = [header];
  lines.push(`summary,totalQuestions,${dashboard.totalQuestions}`);
  for (const row of dashboard.byType) {
    lines.push(`byType,${escapeCsvCell(row.type)},${row.count}`);
  }
  for (const [diff, count] of Object.entries(dashboard.byDifficulty || {})) {
    lines.push(`byDifficulty,${escapeCsvCell(diff)},${count}`);
  }
  for (const row of dashboard.byKnowledgePoint || []) {
    lines.push(`byKnowledgePoint,${escapeCsvCell(row.path)},${row.count}`);
  }
  for (const g of dashboard.blueprintCoverageGaps || []) {
    const filters = gapFilterCells(g.listQuery);
    lines.push([
      'blueprintGap',
      escapeCsvCell(g.blueprintTitle),
      escapeCsvCell(g.type || ''),
      g.sectionIndex ?? '',
      g.slot ?? '',
      escapeCsvCell(g.neededDifficulty || ''),
      escapeCsvCell(g.message || ''),
      ...filters,
    ].join(','));
  }
  return lines;
}

module.exports = {
  buildBankStatsCsvLines,
  escapeCsvCell,
  gapFilterCells,
};
