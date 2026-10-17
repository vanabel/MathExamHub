import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildRenderer() {
  const macroJson = JSON.parse(
    fs.readFileSync(path.join(root, 'src/utils/mathjaxMacros.json'), 'utf8'),
  );
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const tex = new TeX({
    packages: AllPackages.sort(),
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    macros: macroJson.macros,
    tags: 'ams',
  });
  const svg = new SVG({ fontCache: 'none' });
  return { doc: mathjax.document('', { InputJax: tex, OutputJax: svg }), adaptor };
}

function extractMathFragments(html) {
  const frags = [];
  const re = /\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    frags.push({ tex: m[1] ?? m[2], display: m[1] != null });
  }
  return frags;
}

test('\\score macro compiles inside display math (no \\hfill)', () => {
  const { doc, adaptor } = buildRenderer();
  const tex = String.raw`x = 1 \score{3} y = 2`;
  const node = doc.convert(tex, { display: true });
  assert.ok(adaptor.innerHTML(node).length > 0);
});

test('math fragments from regression fixtures compile under MathJax 3 + shared macros', async () => {
  const fixtures = JSON.parse(
    fs.readFileSync(path.join(root, 'tests/fixtures/latex-render-regression.json'), 'utf8'),
  );
  let code = fs.readFileSync(path.join(root, 'src/utils/latexProcessor.js'), 'utf8').replace(
    /^import axios from ['"]axios['"];?/m,
    "const axios = { defaults: { baseURL: '/api' } };",
  );
  const tmp = path.join(root, 'tests/.tmp-latexProcessor.mjs');
  fs.writeFileSync(tmp, code);
  const P = await import(pathToFileURL(tmp).href + '?' + Date.now());
  const { doc, adaptor } = buildRenderer();

  const { shouldUseChoiceOptionLabels } = await import(
    pathToFileURL(path.join(root, 'src/utils/choiceOptions.js')).href
  );

  for (const c of fixtures.cases) {
    const hasOptions = !!(c.options && Object.keys(c.options).length);
    const stem = P.processQuestionTextToHTML(c.questionText, c.originalLaTeX, {
      hasOptions,
      mode: 'question',
      questionType: c.type || '',
      choiceOptionLabels: shouldUseChoiceOptionLabels({
        questionType: c.type,
        hasOptions,
        questionText: c.questionText,
        originalLaTeX: c.originalLaTeX,
      }),
    });
    const ans = P.processAnswerTextToHTML(c.correctAnswer);
    for (const { tex, display } of [...extractMathFragments(stem), ...extractMathFragments(ans)]) {
      const node = doc.convert(tex, { display });
      adaptor.innerHTML(node);
      assert.ok(adaptor.innerHTML(node).length > 0);
    }
  }
});
