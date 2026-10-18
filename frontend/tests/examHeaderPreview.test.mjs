import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExamHeaderHtmlPreview,
  buildExamHeaderPreamblePreview,
} from '../src/utils/examHeaderPreview.js';

describe('examHeaderPreview', () => {
  it('embeds course in HTML preview', () => {
    const html = buildExamHeaderHtmlPreview({ course: '解析几何', university: '西南大学' });
    assert.match(html, /解析几何/);
    assert.match(html, /西南大学/);
  });

  it('builds mathexam preamble lines', () => {
    const tex = buildExamHeaderPreamblePreview({ course: '高数', packageOptions: ['nospace'] });
    assert.match(tex, /\\usepackage\[nospace\]\{mathexam\}/);
    assert.match(tex, /\\course\{高数\}/);
  });
});
