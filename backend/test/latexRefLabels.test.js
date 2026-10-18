const assert = require('assert');
const {
  buildBankLabelSet,
  danglingRefsForQuestion,
  collectLabelsFromTex,
  collectRefsFromTex,
} = require('../utils/latexRefLabels');

function testCollectLabelsAndRefs() {
  const tex = '\\label{fig:a}\\ref{fig:b}';
  assert.deepStrictEqual([...collectLabelsFromTex(tex)], ['fig:a']);
  assert.deepStrictEqual(collectRefsFromTex(tex), ['fig:b']);
}

function testDanglingRefAcrossBank() {
  const bank = [
    { originalLaTeX: '\\label{fig:cube}', questionText: '' },
    { originalLaTeX: '', questionText: 'see \\cref{fig:cube}' },
  ];
  const labels = buildBankLabelSet(bank);
  const dangling = danglingRefsForQuestion(
    { originalLaTeX: '如图\\ref{fig:missing}', questionText: '' },
    labels,
  );
  assert.deepStrictEqual(dangling, ['fig:missing']);
  const ok = danglingRefsForQuestion(
    { originalLaTeX: '\\ref{fig:cube}', questionText: '' },
    labels,
  );
  assert.deepStrictEqual(ok, []);
}

function run() {
  testCollectLabelsAndRefs();
  testDanglingRefAcrossBank();
  console.log('latexRefLabels tests: OK');
}

run();
