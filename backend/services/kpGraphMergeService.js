const KnowledgePoint = require('../models/KnowledgePoint');
const { buildKnowledgePointPath } = require('../utils/knowledgePointPath');

function stableFields(node) {
  return {
    tags: [...(node.tags || [])].sort(),
    cognitiveLevel: node.cognitiveLevel || '',
    category: node.category || '',
    objective: node.objective || '',
    description: node.description || '',
  };
}

function fieldsChanged(existing, incoming) {
  const a = stableFields(existing);
  const b = stableFields(incoming);
  return JSON.stringify(a) !== JSON.stringify(b);
}

function buildNameToIdMap(allNodes) {
  const map = new Map();
  for (const n of allNodes) {
    map.set(n.name, String(n._id || n.id));
  }
  return map;
}

function resolveRelationIds(names, nameToId) {
  const ids = [];
  const unresolved = [];
  for (const name of names || []) {
    const id = nameToId.get(name);
    if (id) ids.push(id);
    else unresolved.push(name);
  }
  return { ids: [...new Set(ids)], unresolved };
}

async function diffKpImport(bankId, subject, parsedNodes) {
  const existing = await KnowledgePoint.find({ bankId, subject }).lean();
  const byPath = new Map(existing.map((n) => [n.path, n]));

  const toCreate = [];
  const toUpdate = [];
  let unchanged = 0;

  for (const node of parsedNodes) {
    const hit = byPath.get(node.path);
    if (!hit) {
      toCreate.push(node);
    } else if (fieldsChanged(hit, node)) {
      toUpdate.push({ path: node.path, before: stableFields(hit), after: stableFields(node), node });
    } else {
      unchanged += 1;
    }
  }

  return {
    subject,
    totalParsed: parsedNodes.length,
    existingCount: existing.length,
    toCreate: toCreate.length,
    toUpdate: toUpdate.length,
    unchanged,
    preview: {
      create: toCreate.slice(0, 20).map((n) => ({ path: n.path, name: n.name })),
      update: toUpdate.slice(0, 20).map((u) => ({ path: u.path, after: u.after })),
    },
    parsedNodes,
  };
}

async function mergeKpImport(bankId, subject, parsedNodes) {
  const existing = await KnowledgePoint.find({ bankId, subject }).lean();
  const pathToId = new Map(existing.map((n) => [n.path, String(n._id)]));
  const unresolvedRelations = [];

  const sorted = [...parsedNodes].sort(
    (a, b) => a.levelNames.length - b.levelNames.length,
  );

  let created = 0;
  let updated = 0;

  for (let i = 0; i < sorted.length; i += 1) {
    const node = sorted[i];
    const parentPath = node.levelNames.length > 1
      ? `/${node.levelNames.slice(0, -1).join('/')}`
      : null;
    const parentId = parentPath ? pathToId.get(parentPath) || null : null;

    const payload = {
      bankId,
      subject,
      name: node.name,
      path: node.path,
      parentId,
      order: i,
      tags: node.tags,
      cognitiveLevel: node.cognitiveLevel,
      category: node.category,
      objective: node.objective,
      description: node.description,
    };

    let doc = await KnowledgePoint.findOne({ bankId, subject, path: node.path });
    if (!doc) {
      doc = await KnowledgePoint.create({ ...payload, source: 'excel-import' });
      created += 1;
    } else {
      Object.assign(doc, payload);
      if (!doc.source) doc.source = 'excel-import';
      await doc.save();
      updated += 1;
    }
    pathToId.set(node.path, String(doc._id));
  }

  const allInSubject = await KnowledgePoint.find({ bankId, subject }).lean();
  const nameToId = buildNameToIdMap(allInSubject);

  for (const node of parsedNodes) {
    const id = pathToId.get(node.path);
    if (!id) continue;

    const pre = resolveRelationIds(node.prerequisiteNames, nameToId);
    const suc = resolveRelationIds(node.successorNames, nameToId);
    const rel = resolveRelationIds(node.relatedNames, nameToId);
    unresolvedRelations.push(
      ...pre.unresolved.map((name) => ({ path: node.path, field: 'prerequisite', name })),
      ...suc.unresolved.map((name) => ({ path: node.path, field: 'successor', name })),
      ...rel.unresolved.map((name) => ({ path: node.path, field: 'related', name })),
    );

    await KnowledgePoint.updateOne(
      { _id: id },
      {
        $set: {
          prerequisiteIds: pre.ids,
          successorIds: suc.ids,
          relatedIds: rel.ids,
          updatedAt: new Date(),
        },
      },
    );
  }

  return {
    created,
    updated,
    total: parsedNodes.length,
    unresolvedRelations,
  };
}

module.exports = {
  diffKpImport,
  mergeKpImport,
  resolveRelationIds,
  buildNameToIdMap,
};
