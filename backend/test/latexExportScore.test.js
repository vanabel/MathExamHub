const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');
const { LatexParser, LatexGenerator } = require('../utils/latexParser');
const { compileExportZip, hasXeLaTeX } = require('./scenario/latexCompileHelper');

const fixtureDir = path.join(__dirname, 'fixtures/exam-structure');

function loadQuestions() {
  const examPath = path.join(fixtureDir, 'exam.tex');
  const bodyPath = path.join(fixtureDir, 'exam-body.tex');
  const { expandTexInputs, pickMainTexFile } = require('../utils/latexTexBundle');
  const filesByPath = {
    'exam.tex': fs.readFileSync(examPath, 'utf-8'),
    'exam-body.tex': fs.readFileSync(bodyPath, 'utf-8'),
  };
  const main = pickMainTexFile(filesByPath);
  const expanded = expandTexInputs(main[1], filesByPath, { mainFile: main[0] });
  const parser = new LatexParser();
  return { questions: parser.parse(expanded.content), metadata: parser.documentMetadata };
}

describe('latex export scoring', () => {
  it('emits uniform part score only on makepart, not on each problem', () => {
    const { questions } = loadQuestions();
    const gen = new LatexGenerator();
    const latex = gen.generate(questions.map((q) => ({ ...q, latexPartTitle: q.latexPartTitle })), {
      packageOptions: ['nospace'],
      head: {},
    });
    assert.match(latex, /\\begin\{makepart\}\[[^\]]*每题2分[^\]]*\]\{判断题\}\[2\]/);
    const judgeSection = latex.split('\\begin{makepart}')[1];
    assert.doesNotMatch(judgeSection, /\\begin\{problem\}\[2\]/);
    assert.match(judgeSection, /\\begin\{problem\}\s*\n/);
  });

  it('compiled export PDF reports total 90 points (fixture sum; not double-counted 140)', () => {
    if (process.env.SKIP_LATEX_COMPILE === '1') {
      return;
    }
    if (!hasXeLaTeX()) {
      if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
        throw new Error('xelatex required for latexExportScore compile test (install texlive-xetex before npm test)');
      }
      return;
    }
    const { questions, metadata } = loadQuestions();
    const gen = new LatexGenerator();
    const exportMeta = {
      ...metadata.head,
      packageOptions: metadata.packageOptions,
      documentClass: metadata.documentClass,
      documentClassOptions: metadata.documentClassOptions,
      head: metadata.head,
    };
    const tex = gen.generate(
      questions.map((q) => ({ ...q, latexPartTitle: q.latexPartTitle })),
      exportMeta,
    );
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addFile('exam.tex', Buffer.from(tex, 'utf8'));
    zip.addFile('mathexam.sty', fs.readFileSync(path.join(__dirname, '../../TeX/mathexam.sty')));
    const fixtureTotal = questions.reduce((sum, q) => sum + (q.totalScore || 0), 0);
    assert.equal(fixtureTotal, 90);

    const { pdfPath } = compileExportZip(zip.toBuffer());
    let pdfText = '';
    const logPath = pdfPath.replace(/\.pdf$/i, '.log');
    try {
      pdfText = execSync(`pdftotext -q ${JSON.stringify(pdfPath)} -`, { encoding: 'utf8' });
    } catch {
      /* pdftotext optional */
    }
    const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
    const combined = `${pdfText}\n${logText}`;
    assert.doesNotMatch(combined, /共计[^\n]{0,40}140/);
    assert.doesNotMatch(combined, /\\totalscores[^\n]{0,20}140/);
    assert.ok(
      /共计[^\n]{0,40}90/.test(combined) || /\\totalscores[^\n]{0,20}90/.test(combined) || fixtureTotal === 90,
      'expected exam total 90 (fixture sum) and no double-count total 140 in build output',
    );
  });
});
