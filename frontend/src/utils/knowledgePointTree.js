/** Flatten knowledge point nodes for indented tree selects. */
export function flattenKnowledgePointTree(nodes) {
  const list = nodes || [];
  const byParent = new Map();
  for (const n of list) {
    const pid = n.parentId ? String(n.parentId) : '';
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(n);
  }
  const sortFn = (a, b) => (a.order ?? 0) - (b.order ?? 0)
    || String(a.path || a.name).localeCompare(String(b.path || b.name), 'zh-CN');
  for (const kids of byParent.values()) kids.sort(sortFn);

  const out = [];
  const walk = (parentKey, depth) => {
    for (const n of byParent.get(parentKey) || []) {
      out.push({ ...n, depth });
      walk(String(n._id), depth + 1);
    }
  };
  walk('', 0);
  return out;
}

export function kpTreeIndent(depth) {
  return `${'\u3000'.repeat(Math.max(0, depth))}${depth > 0 ? '└ ' : ''}`;
}
