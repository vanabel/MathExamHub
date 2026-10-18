const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');
const { LatexParser, LatexGenerator } = require('../utils/latexParser');
const { buildMathexamDateMacroLines } = require('../utils/mathexamDateMacros');
const { hasXeLaTeX } = require('./scenario/latexCompileHelper');

const styPath = path.join(__dirname, '../../TeX/mathexam.sty');

function minimalExamTex(preambleMacros) {
  return `% !TEX program = xelatex
\\documentclass[zihao=-4]{article}
\\usepackage[nospace]{mathexam}
${preambleMacros}
\\semester{1}
\\course{测试课程}
\\university{测试大学}
\\school{测试学院}
\\begin{document}
\\makehead
\\end{document}
`;
}

function compilePreambleTex(preambleMacros) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mathexam-acyear-'));
  fs.writeFileSync(path.join(dir, 'exam.tex'), minimalExamTex(preambleMacros), 'utf8');
  fs.copyFileSync(styPath, path.join(dir, 'mathexam.sty'));
  for (let pass = 0; pass < 2; pass += 1) {
    spawnSync('xelatex', ['-shell-escape', '-interaction=nonstopmode', 'exam.tex'], {
      cwd: dir,
      encoding: 'utf8',
    });
  }
  const pdfPath = path.join(dir, 'exam.pdf');
  assert.ok(fs.existsSync(pdfPath), 'expected exam.pdf after xelatex');
  let pdfText = '';
  try {
    pdfText = execSync(`pdftotext -layout -q ${JSON.stringify(pdfPath)} -`, { encoding: 'utf8' });
  } catch {
    try {
      pdfText = execSync(`pdftotext -q ${JSON.stringify(pdfPath)} -`, { encoding: 'utf8' });
    } catch {
      /* optional locally */
    }
  }
  const logPath = path.join(dir, 'exam.log');
  const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  return `${pdfText}\n${logText}`;
}

describe('mathexam v2.3.3 academic year macros', () => {
  it('bundled mathexam.sty is v2.3.3 with single ProvidesPackage', () => {
    const sty = fs.readFileSync(styPath, 'utf8');
    assert.equal((sty.match(/\\ProvidesPackage\{mathexam\}/g) || []).length, 1);
    assert.match(sty, /v2\.3\.3/);
  });

  it('export emits \\examdate and optional \\academicyear', () => {
    const gen = new LatexGenerator();
    const header = gen.generateHeader({
      head: { course: '代数' },
      examDate: '2026-10-15',
      academicYearStart: '2020',
      academicYearEnd: '2021',
    });
    assert.match(header, /\\examdate\{2026\}\{10\}\{15\}/);
    assert.match(header, /\\academicyear\{2020\}\{2021\}/);
    assert.match(header, /\\semester\{/);
  });

  it('import parses \\examdate and \\academicyear into metadata', () => {
    const tex = minimalExamTex('\\examdate{2026}{10}{18}\\academicyear{2025}{2026}');
    const parser = new LatexParser();
    parser.parse(tex);
    assert.equal(parser.documentMetadata.examDate, '2026-10-18');
    assert.equal(parser.documentMetadata.academicYearStart, '2025');
    assert.equal(parser.documentMetadata.academicYearEnd, '2026');
  });

  it('round-trip export preserves date macros', () => {
    const gen = new LatexGenerator();
    const tex = gen.generateDocument([], {
      packageOptions: ['nospace'],
      head: { course: '测试' },
      examDate: '2026-10-01',
      academicYearStart: '2024',
      academicYearEnd: '2025',
    });
    const parser = new LatexParser();
    parser.parse(tex);
    assert.equal(parser.documentMetadata.examDate, '2026-10-01');
    assert.equal(parser.documentMetadata.academicYearStart, '2024');
    assert.equal(parser.documentMetadata.academicYearEnd, '2025');
  });

  it('buildMathexamDateMacroLines skips academic year when incomplete', () => {
    const lines = buildMathexamDateMacroLines({ examDate: '2026-10-01', academicYearStart: '2026' });
    assert.deepEqual(lines, ['\\examdate{2026}{10}{1}']);
  });

  it('October 2026 examdate PDF shows 2026至2027学年', () => {
    if (process.env.SKIP_LATEX_COMPILE === '1' || !hasXeLaTeX()) {
      if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
        if (!hasXeLaTeX()) throw new Error('xelatex required');
      }
      return;
    }
    const combined = compilePreambleTex('\\examdate{2026}{10}{18}');
    assert.match(combined, /2026\s*至\s*2027\s*学年/);
  });

  it('Aug 31 boundary uses previous academic year span', () => {
    if (process.env.SKIP_LATEX_COMPILE === '1' || !hasXeLaTeX()) {
      if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
        if (!hasXeLaTeX()) throw new Error('xelatex required');
      }
      return;
    }
    const combined = compilePreambleTex('\\examdate{2026}{8}{31}');
    assert.match(combined, /2025\s*至\s*2026\s*学年/);
    assert.doesNotMatch(combined, /2026\s*至\s*2027\s*学年/);
  });

  it('\\academicyear override wins over examdate inference', () => {
    if (process.env.SKIP_LATEX_COMPILE === '1' || !hasXeLaTeX()) {
      if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
        if (!hasXeLaTeX()) throw new Error('xelatex required');
      }
      return;
    }
    const combined = compilePreambleTex('\\examdate{2026}{10}{18}\\academicyear{2020}{2021}');
    assert.match(combined, /2020\s*至\s*2021\s*学年/);
    assert.doesNotMatch(combined, /2026\s*至\s*2027\s*学年/);
  });
});
