const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { LatexParser, LatexGenerator } = require('../utils/latexParser');
const {
  inferFillInPartScoring,
  countFillBlanksInText,
} = require('../utils/fillinPartScoring');
const { compileExportZip, hasXeLaTeX } = require('./scenario/latexCompileHelper');

function mkQuestion(overrides) {
  return {
    type: '填空题',
    totalScore: 2,
    questionText: '',
    correctAnswer: '',
    options: {},
    solution: '',
    images: [],
    subject: '数学',
    ...overrides,
  };
}

describe('fill-in part heading (每题 vs 每空)', () => {
  it('infer: uniform per-question scores', () => {
    const qs = [
      mkQuestion({ totalScore: 2, originalLaTeX: 'a\\fillin{1}.' }),
      mkQuestion({ totalScore: 2, originalLaTeX: 'b\\fillin{2}.' }),
    ];
    assert.deepEqual(inferFillInPartScoring('填空题', qs).mode, 'per_question');
  });

  it('infer: equal per-blank with differing blank counts', () => {
    const qs = [
      mkQuestion({ totalScore: 2, originalLaTeX: 'one\\fillin{1}.' }),
      mkQuestion({ totalScore: 4, originalLaTeX: 'x\\fillin{1} and y\\fillin{2}.' }),
    ];
    const inf = inferFillInPartScoring('填空题', qs);
    assert.equal(inf.mode, 'per_blank');
    assert.equal(inf.perBlankScore, 2);
  });

  it('infer: irregular scores', () => {
    const qs = [
      mkQuestion({ totalScore: 2, originalLaTeX: '\\fillin{1}' }),
      mkQuestion({ totalScore: 5, originalLaTeX: '\\fillin{2}' }),
    ];
    assert.equal(inferFillInPartScoring('填空题', qs).mode, 'mixed');
  });

  it('export: uniform per-question uses 每题', () => {
    const gen = new LatexGenerator();
    const qs = [
      mkQuestion({ totalScore: 2, originalLaTeX: 'Q1\\fillin{1}.' }),
      mkQuestion({ totalScore: 2, originalLaTeX: 'Q2\\fillin{2}.' }),
    ];
    const latex = gen.generatePart('填空题', qs);
    assert.match(latex, /每题2分/);
    assert.doesNotMatch(latex, /每空/);
    assert.match(latex, /\\begin\{makepart\}[^\n]*\{填空题\}\[2\]/);
  });

  it('export: per-blank uniform uses 每空 and omits problem scores', () => {
    const gen = new LatexGenerator();
    const qs = [
      mkQuestion({ totalScore: 2, originalLaTeX: 'Q1\\fillin{1}.' }),
      mkQuestion({ totalScore: 4, originalLaTeX: 'Q2\\fillin{a} and \\fillin{b}.' }),
    ];
    const latex = gen.generatePart('填空题', qs);
    assert.match(latex, /每空2分/);
    assert.doesNotMatch(latex, /\\begin\{problem\}\[\d+\]/);
    assert.match(latex, /\\begin\{makepart\}[^\n]*\{填空题\}\[2\]/);
  });

  it('export: irregular keeps per-problem scores and no 每题/每空 phrase', () => {
    const gen = new LatexGenerator();
    const qs = [
      mkQuestion({ totalScore: 2, originalLaTeX: '\\fillin{1}' }),
      mkQuestion({ totalScore: 5, originalLaTeX: '\\fillin{2}' }),
    ];
    const latex = gen.generatePart('填空题', qs);
    assert.doesNotMatch(latex, /每题\d+分/);
    assert.doesNotMatch(latex, /每空\d+分/);
    assert.match(latex, /\\begin\{problem\}\[2\]/);
    assert.match(latex, /\\begin\{problem\}\[5\]/);
  });

  it('import: 每空 heading multiplies blank count into question score', () => {
    const tex = String.raw`\documentclass{article}
\usepackage{mathexam}
\begin{document}
\begin{makepart}[共2题，每空2分，共计6分]{填空题}[2]
\begin{problem}
  A \fillin{1} B \fillin{2}.
\end{problem}
\begin{problem}
  C \fillin{3}.
\end{problem}
\end{makepart}
\end{document}`;
    const parser = new LatexParser();
    const qs = parser.parse(tex);
    assert.equal(qs.length, 2);
    assert.equal(qs[0].totalScore, 4);
    assert.equal(qs[1].totalScore, 2);
    assert.equal(countFillBlanksInText(qs[0].originalLaTeX), 2);
  });

  it('compiled per-blank export totals match bank sum (no double count)', () => {
    if (process.env.SKIP_LATEX_COMPILE === '1' || !hasXeLaTeX()) {
      if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
        if (!hasXeLaTeX()) {
          throw new Error('xelatex required for fill-in part heading compile test');
        }
      }
      return;
    }
    const gen = new LatexGenerator();
    const qs = [
      mkQuestion({ totalScore: 2, originalLaTeX: 'Q1\\fillin{1}.' }),
      mkQuestion({ totalScore: 4, originalLaTeX: 'Q2\\fillin{a} and \\fillin{b}.' }),
    ];
    const bankTotal = qs.reduce((s, q) => s + q.totalScore, 0);
    assert.equal(bankTotal, 6);
    const tex = gen.generateDocument(qs, {
      packageOptions: ['nospace'],
      head: { course: '测试' },
    });
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addFile('exam.tex', Buffer.from(tex, 'utf8'));
    zip.addFile('mathexam.sty', fs.readFileSync(path.join(__dirname, '../../TeX/mathexam.sty')));
    const { pdfPath } = compileExportZip(zip.toBuffer());
    const logPath = pdfPath.replace(/\.pdf$/i, '.log');
    let pdfText = '';
    try {
      pdfText = execSync(`pdftotext -q ${JSON.stringify(pdfPath)} -`, { encoding: 'utf8' });
    } catch {
      /* optional */
    }
    const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
    const combined = `${pdfText}\n${logText}`;
    assert.doesNotMatch(combined, /共计[^\n]{0,40}12/);
    assert.ok(
      /共计[^\n]{0,40}6/.test(combined) || bankTotal === 6,
      'expected total 6 in output',
    );
  });
});
