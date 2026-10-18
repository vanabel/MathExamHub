const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseKpExcelBuffer } = require('../utils/kpExcelParse');
const { buildKpExcelWorkbook } = require('../utils/kpExcelExport');

describe('kpExcel round-trip', () => {
  it('export then re-parse preserves node count and sample path', () => {
    const buf = fs.readFileSync(path.join(__dirname, 'fixtures/analytic-geometry-kp.xls'));
    const parsed = parseKpExcelBuffer(buf);
    const fakeNodes = parsed.nodes.map((n, i) => ({
      _id: `id${i}`,
      path: n.path,
      name: n.name,
      tags: n.tags,
      cognitiveLevel: n.cognitiveLevel,
      category: n.category,
      objective: n.objective,
      description: n.description,
      prerequisiteIds: [],
      successorIds: [],
      relatedIds: [],
    }));
    const outBuf = buildKpExcelWorkbook({
      subject: parsed.subject,
      title: parsed.title,
      nodes: fakeNodes,
    });
    const again = parseKpExcelBuffer(outBuf);
    assert.equal(again.nodes.length, parsed.nodes.length);
    assert.equal(again.subject, parsed.subject);
    const sample = parsed.nodes.find((n) => n.name === '自由向量');
    const round = again.nodes.find((n) => n.name === '自由向量');
    assert.ok(sample && round);
    assert.equal(round.path, sample.path);
  });
});
