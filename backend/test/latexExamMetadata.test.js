const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  fillBankLatexMetadata,
  resolveExportMetadata,
  metadataForExportForm,
} = require('../utils/latexExamMetadata');

describe('latexExamMetadata', () => {
  it('fillBankLatexMetadata only fills empty bank fields', () => {
    const bank = {
      latexExamMetadata: {
        university: '已有大学',
        course: '',
      },
    };
    const changed = fillBankLatexMetadata(bank, {
      head: { university: '新大学', course: '高等代数', school: '数学学院' },
      packageOptions: ['nospace'],
    });
    assert.equal(changed, true);
    assert.equal(bank.latexExamMetadata.university, '已有大学');
    assert.equal(bank.latexExamMetadata.course, '高等代数');
    assert.equal(bank.latexExamMetadata.school, '数学学院');
    assert.deepEqual(bank.latexExamMetadata.packageOptions, ['nospace']);
  });

  it('resolveExportMetadata respects bank < blueprint < paper < form', () => {
    const merged = resolveExportMetadata({
      bank: { latexExamMetadata: { course: '银行课程', university: '西南大学' } },
      blueprint: { latexExamMetadata: { course: '蓝图课程', AorB: 'A' } },
      paper: { latexExamMetadata: { totaltime: '90' } },
      form: { course: '表单课程', openclose: '闭卷' },
    });
    assert.equal(merged.course, '表单课程');
    assert.equal(merged.university, '西南大学');
    assert.equal(merged.AorB, 'A');
    assert.equal(merged.totaltime, '90');
    assert.equal(merged.openclose, '闭卷');
    assert.equal(merged.head.course, '表单课程');
  });

  it('metadataForExportForm merges parsed document over bank defaults', () => {
    const form = metadataForExportForm(
      { latexExamMetadata: { school: '默认学院' } },
      { head: { course: '解析几何' }, packageOptions: ['nospace', 'showans'] },
    );
    assert.equal(form.school, '默认学院');
    assert.equal(form.course, '解析几何');
    assert.ok(form.packageOptions.includes('showans'));
  });
});
