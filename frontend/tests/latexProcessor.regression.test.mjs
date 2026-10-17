import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(
  fs.readFileSync(path.join(root, 'tests/fixtures/latex-render-regression.json'), 'utf8'),
);

async function loadProcessor() {
  const src = path.join(root, 'src/utils/latexProcessor.js');
  let code = fs.readFileSync(src, 'utf8').replace(
    /^import axios from ['"]axios['"];?/m,
    "const axios = { defaults: { baseURL: '/api' } };",
  );
  const tmp = path.join(root, 'tests/.tmp-latexProcessor.mjs');
  fs.writeFileSync(tmp, code);
  return import(pathToFileURL(tmp).href + '?' + Date.now());
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

test('regression fixtures: processQuestionTextToHTML / processAnswerTextToHTML', async () => {
  const P = await loadProcessor();
  const { shouldUseChoiceOptionLabels } = await import(
    pathToFileURL(path.join(root, 'src/utils/choiceOptions.js')).href
  );

  for (const c of fixtures.cases) {
    const hasOptions = !!(c.options && Object.keys(c.options).length);
    const opts = {
      hasOptions,
      mode: 'question',
      questionType: c.type || '',
      choiceOptionLabels: shouldUseChoiceOptionLabels({
        questionType: c.type,
        hasOptions,
        questionText: c.questionText,
        originalLaTeX: c.originalLaTeX,
      }),
    };
    const stem = P.processQuestionTextToHTML(c.questionText, c.originalLaTeX, opts);
    const ans = P.processAnswerTextToHTML(
      Array.isArray(c.correctAnswer) ? c.correctAnswer : c.correctAnswer,
    );

    switch (c.name) {
      case 'display-math-in-answer': {
        assert.match(ans, /\$\$[\s\S]+?\$\$/);
        assert.doesNotMatch(ans, /(?<!\$)\$(?!\$)[\s\S]*\\gamma'/);
        assert.match(ans, /step-score-badge|\(1分\)|\\score\{1\}/);
        break;
      }
      case 'display-math-in-stem-enumerate': {
        assert.match(stem, /<em>平行曲面<\/em>/);
        assert.match(stem, /<ol class="latex-enumerate"/);
        assert.match(ans, /<ol class="latex-enumerate"/);
        assert.doesNotMatch(stripTags(ans), /\\eqref/);
        assert.doesNotMatch(ans, /\(\?\?\?\)/);
        break;
      }
      case 'nested-split-in-display': {
        const splitCount = (ans.match(/\\begin\{split\}/g) || []).length;
        assert.equal(splitCount, 1);
        assert.doesNotMatch(stripTags(ans), /\\implies \\kappa_n/);
        break;
      }
      case 'pickout-choice': {
        assert.match(stem, /[\(（]\s*　　\s*[\)）]/);
        assert.doesNotMatch(stem, /mathexam-abcd/);
        assert.match(stripTags(ans), /^C$/m);
        break;
      }
      case 'choice-dup-tetrahedron': {
        assert.doesNotMatch(stem, /[\(（]\s*D\s*[\)）]/);
        assert.doesNotMatch(stem, /mathexam-abcd/);
        assert.doesNotMatch(stem, /<ol class="latex-enumerate"/);
        assert.match(stripTags(ans), /^D$/m);
        break;
      }
      case 'choice-abcd-stem': {
        assert.match(stem, /\(A\)/);
        assert.match(stem, /\(D\)/);
        assert.match(stem, /mathexam-abcd-label/);
        break;
      }
      case 'choice-enumerate-stem': {
        assert.match(stem, /\(A\)/);
        assert.match(stem, /\(B\)/);
        assert.match(stem, /\(C\)/);
        assert.match(stem, /\(D\)/);
        assert.match(stem, /choice-option-label|mathexam-abcd-label/);
        assert.doesNotMatch(stem, /<ol class="latex-enumerate"/);
        assert.doesNotMatch(stem, /list-style:\s*upper-alpha/i);
        break;
      }
      case 'true-judgment':
        assert.match(ans, /✓/);
        break;
      case 'false-judgment':
        assert.match(ans, /✗/);
        break;
      case 'textbf-stem':
        assert.match(stem, /<strong>正交<\/strong>/);
        break;
      case 'fillin-bare-latex-answer': {
        assert.match(stem, /\\fillin\{\}/);
        assert.match(ans, /\$[\s\S]*\\frac\{1\}\{2\}[\s\S]*\$/);
        break;
      }
      case 'fillin-pm-answer':
        assert.match(ans, /\$[\s\S]*\\pm\s*2[\s\S]*\$/);
        break;
      case 'fillin-matrix-answer':
        assert.match(ans, /\\begin\{pmatrix\}/);
        assert.match(ans, /\$/);
        break;
      case 'fillin-multi-array-answer':
        assert.match(stem, /\\fillin\{\}/g);
        break;
      case 'eqref-equation-label':
        assert.doesNotMatch(stripTags(ans), /\\eqref/);
        break;
      case 'answer-center-includegraphics':
        assert.match(ans, /latex-figure|pdf-container/);
        assert.doesNotMatch(ans, /\\begin\{center\}/);
        assert.doesNotMatch(ans, /\\includegraphics/);
        break;
      case 'dg-macros':
        assert.match(ans, /\$\$[\s\S]*\\br/u);
        break;
      case 'II-I-macros':
        assert.match(ans, /<em>外法向量<\/em>/);
        assert.match(ans, /\\II/);
        break;
      default:
        break;
    }
  }
});

test('index.html MathJax2 macros match mathjaxMacros.json', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const json = JSON.parse(fs.readFileSync(path.join(root, 'src/utils/mathjaxMacros.json'), 'utf8'));
  for (const key of Object.keys(json.macros)) {
    assert.match(indexHtml, new RegExp(`\\b${key}:`), `index.html missing macro ${key}`);
  }
  assert.match(indexHtml, /equationNumbers:\s*\{\s*autoNumber:\s*'AMS'\s*\}/);
  assert.match(indexHtml, /linebreaks:\s*\{\s*automatic:\s*true/);
});
