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
    const { pdfPath } = compileExportZip(zip.toBuffer());
    let pdfText = '';
    try {
      pdfText = execSync(`pdftotext -q ${JSON.stringify(pdfPath)} -`, { encoding: 'utf8' });
    } catch {
      const logPath = pdfPath.replace(/\.pdf$/i, '.log');
      pdfText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
    }
    assert.match(pdfText, /90/);
    assert.doesNotMatch(pdfText, /140/);
  });
});
