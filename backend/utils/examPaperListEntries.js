function enrichPapers(papers, bpMap) {
  return papers.map((p) => {
    const bp = p.blueprintId ? bpMap.get(String(p.blueprintId)) : null;
    return {
      ...p,
      blueprintTitle: bp?.title,
      blueprintSubject: bp?.subject,
    };
  });
}

function buildExamPaperEntries(papers) {
  const byGroup = new Map();
  for (const p of papers) {
    if (p.variantGroupId) {
      const key = String(p.variantGroupId);
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(p);
    }
  }

  const seenGroups = new Set();
  const entries = [];
  for (const p of papers) {
    if (p.variantGroupId) {
      const key = String(p.variantGroupId);
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      const groupPapers = byGroup.get(key) || [p];
      groupPapers.sort((a, b) => (a.variantLabel === 'A' ? -1 : b.variantLabel === 'A' ? 1 : 0));
      entries.push({ kind: 'pair', variantGroupId: key, papers: groupPapers, sortDate: groupPapers[0]?.createdAt });
    } else {
      entries.push({ kind: 'single', paper: p, sortDate: p.createdAt });
    }
  }

  entries.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
  return entries;
}

function paginateEntries(entries, offset, limit) {
  const total = entries.length;
  const slice = entries.slice(offset, offset + limit);
  const pairs = slice.filter((e) => e.kind === 'pair').map((e) => ({
    variantGroupId: e.variantGroupId,
    papers: e.papers,
    blueprintTitle: e.papers[0]?.blueprintTitle,
    blueprintId: e.papers[0]?.blueprintId,
    createdAt: e.sortDate,
  }));
  const singles = slice.filter((e) => e.kind === 'single').map((e) => e.paper);
  return { pairs, singles, total, offset, limit };
}

module.exports = { buildExamPaperEntries, paginateEntries, enrichPapers };
