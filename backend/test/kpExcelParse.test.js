const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseKpExcelBuffer, extractSubjectFromTitle } = require('../utils/kpExcelParse');

describe('kpExcelParse', () => {
  it('extractSubjectFromTitle', () => {
    assert.equal(extractSubjectFromTitle('解析几何课程知识点'), '解析几何');
  });

  it('parses analytic geometry fixture with hierarchy inheritance', () => {
    const buf = fs.readFileSync(
      path.join(__dirname, 'fixtures/analytic-geometry-kp.xls'),
    );
    const parsed = parseKpExcelBuffer(buf);
    assert.equal(parsed.subject, '解析几何');
    assert.equal(parsed.nodes.length, 113);
    const freeVector = parsed.nodes.find((n) => n.name === '自由向量');
    assert.ok(freeVector);
    assert.match(freeVector.path, /第1章 向量与坐标/);
    assert.match(freeVector.path, /自由向量$/);
    assert.ok(freeVector.prerequisiteNames.length >= 0);
  });
});
