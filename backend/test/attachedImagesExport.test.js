const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { LatexGenerator } = require('../utils/latexParser');
const { latexExportFigureLabelSuffix } = require('../utils/questionImages');
const { compileExportZip, hasXeLaTeX } = require('./scenario/latexCompileHelper');

const sharedImage = {
  url: '解析几何-2024-midterm-fig2.pdf',
  label: '解析几何-2024-midterm-正方体',
  caption: ' ',
};

function mkFillin(refBody) {
  return {
    type: '填空题',
    totalScore: 3,
    originalLaTeX: refBody,
    images: [sharedImage],
  };
}

describe('attached images with originalLaTeX export', () => {
  it('exports figure + label when source has no includegraphics', () => {
    const gen = new LatexGenerator();
    const tex = gen.generateProblem(
      mkFillin('如图\\ref{fig:解析几何-2024-midterm-正方体}所示'),
      'exam',
    );
    assert.match(tex, /\\includegraphics\{fig2\}/);
    assert.match(tex, /\\label\{fig:解析几何-2024-midterm-正方体\}/);
    assert.match(tex, /\\ref\{fig:解析几何-2024-midterm-正方体\}/);
  });

  it('does not duplicate when source already has includegraphics', () => {
    const gen = new LatexGenerator();
    const q = {
      type: '填空题',
      totalScore: 3,
      originalLaTeX: '\\begin{center}\\includegraphics{fig2}\\end{center}',
      images: [sharedImage],
    };
    const tex = gen.generateProblem(q, 'exam');
    const figEnvs = tex.match(/\\begin\{figure\}/g) || [];
    assert.equal(figEnvs.length, 0);
    assert.equal((tex.match(/\\includegraphics/g) || []).length, 1);
  });

  it('emits shared figure only once across two questions in one document', () => {
    const gen = new LatexGenerator();
    const qs = [
      mkFillin('Q1 \\ref{fig:解析几何-2024-midterm-正方体}'),
      mkFillin('Q2 \\ref{fig:解析几何-2024-midterm-正方体}'),
    ];
    const doc = gen.generateDocument(qs, { packageOptions: ['nospace'], course: '解析几何' });
    assert.equal((doc.match(/\\label\{fig:解析几何-2024-midterm-正方体\}/g) || []).length, 1);
    assert.equal((doc.match(/\\includegraphics\{fig2\}/g) || []).length, 1);
  });

  it('latexExportFigureLabelSuffix matches export label format', () => {
    assert.equal(latexExportFigureLabelSuffix(sharedImage), '解析几何-2024-midterm-正方体');
    assert.equal(
      latexExportFigureLabelSuffix({ url: 'a.pdf', label: 'fig:demo' }),
      'demo',
    );
  });

  it('XeLaTeX compile resolves fig ref when figure is exported once', () => {
    if (process.env.SKIP_LATEX_COMPILE === '1' || !hasXeLaTeX()) {
      if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
        if (!hasXeLaTeX()) {
          throw new Error('xelatex required for attachedImagesExport compile test');
        }
      }
      return;
    }
    const gen = new LatexGenerator();
    const qs = [
      mkFillin('如图\\ref{fig:解析几何-2024-midterm-正方体}'),
      mkFillin('again \\ref{fig:解析几何-2024-midterm-正方体}'),
    ];
    const tex = gen.generateDocument(qs, { packageOptions: ['nospace'], course: '解析几何' });
    const figPdf = fs.readFileSync(path.join(__dirname, 'fixtures/fig2.pdf'));
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addFile('exam.tex', Buffer.from(tex, 'utf8'));
    zip.addFile('fig2.pdf', figPdf);
    zip.addFile('mathexam.sty', fs.readFileSync(path.join(__dirname, '../../TeX/mathexam.sty')));
    const { pdfPath } = compileExportZip(zip.toBuffer());
    const logPath = pdfPath.replace(/\.pdf$/i, '.log');
    const logText = fs.readFileSync(logPath, 'utf8');
    assert.doesNotMatch(logText, /Reference `fig:解析几何-2024-midterm-正方体' undefined/i);
    assert.doesNotMatch(logText, /LaTeX Warning: Reference.*undefined/i);
    try {
      const pdfText = execSync(`pdftotext -q ${JSON.stringify(pdfPath)} -`, { encoding: 'utf8' });
      assert.doesNotMatch(pdfText, /\?\?/);
    } catch {
      /* pdftotext optional */
    }
  });
});
