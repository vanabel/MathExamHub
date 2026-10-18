const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LatexParser, LatexGenerator } = require('../utils/latexParser');
const { validateQuestionBatch } = require('../utils/questionValidator');
const { expandTexInputs, pickMainTexFile } = require('../utils/latexTexBundle');
const { stepScoreMismatch } = require('../utils/stepScoreUtils');

const fixtureDir = path.join(__dirname, 'fixtures/exam-structure');

function loadExamBundle() {
  const examPath = path.join(fixtureDir, 'exam.tex');
  const bodyPath = path.join(fixtureDir, 'exam-body.tex');
  const filesByPath = {
    'exam.tex': fs.readFileSync(examPath, 'utf-8'),
    'exam-body.tex': fs.readFileSync(bodyPath, 'utf-8'),
  };
  const main = pickMainTexFile(filesByPath);
  const expanded = expandTexInputs(main[1], filesByPath, { mainFile: main[0] });
  assert.equal(expanded.missing.length, 0);
  return expanded.content;
}

describe('exam-structure fixture (mathexam v2.3.2 layout)', () => {
  it('imports 21/21 via input bundle with fuzzy part titles', () => {
    const content = loadExamBundle();
    const parser = new LatexParser();
    const questions = parser.parse(content);
    assert.equal(questions.length, 21);

    const validation = validateQuestionBatch(questions);
    assert.equal(validation.summary.errorCount, 0);
    assert.equal(validation.summary.valid, 21);

    const byType = questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {});
    assert.equal(byType['判断题'], 5);
    assert.equal(byType['单选题'], 5);
    assert.equal(byType['填空题'], 5);
    assert.equal(byType['解答题'], 6);

    const calcPart = questions.filter((q) => q.latexPartTitle === '计算与证明题');
    assert.equal(calcPart.length, 6);
    const mismatch = stepScoreMismatch(calcPart[0]);
    assert.equal(mismatch, null);

    assert.deepEqual(parser.documentMetadata.documentClassOptions, ['zihao=-4']);
    assert.equal(parser.documentMetadata.head.semester, '1');
  });

  it('round-trip export preserves part titles and document metadata', () => {
    const content = loadExamBundle();
    const parser = new LatexParser();
    const questions = parser.parse(content);
    const gen = new LatexGenerator();
    const metadata = {
      ...parser.documentMetadata.head,
      packageOptions: parser.documentMetadata.packageOptions,
      documentClass: parser.documentMetadata.documentClass,
      documentClassOptions: parser.documentMetadata.documentClassOptions,
      head: parser.documentMetadata.head,
    };
    const exported = gen.generate(
      questions.map((q) => ({
        ...q,
        latexPartTitle: q.latexPartTitle,
      })),
      metadata,
    );
    assert.match(exported, /\\documentclass\[zihao=-4\]\{article\}/);
    assert.match(exported, /\\semester\{1\}/);
    assert.match(exported, /\\begin\{makepart\}[^\\]*\{计算与证明题\}/);
    assert.match(exported, /\\begin\{makepart\}[^\\]*\{判断题\}/);

    const reparsed = new LatexParser().parse(exported);
    assert.equal(reparsed.length, 21);
    assert.equal(
      reparsed.filter((q) => q.latexPartTitle === '计算与证明题').length,
      6,
    );
  });
});
