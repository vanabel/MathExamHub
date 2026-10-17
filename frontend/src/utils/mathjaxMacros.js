/**
 * Single source of truth for MathExam custom TeX macros (browser MathJax + export preamble).
 */

/** MathJax 3 / vue-mathjax-next `macros` object */
export const MATHJAX_MACROS = {
  fillin: ['\\underline{\\phantom{|}#1\\phantom{|}}', 1],
  fillout: ['\\underline{\\phantom{|}#1\\phantom{|}}', 1],
  pickout: ['\\text{(#1)}', 1],
  score: ['\\qquad\\text{(#1分)}', 1],
  true: '\\checkmark',
  false: '\\text{\\sffamily x}',
  bu: '\\mathbf{u}',
  bv: '\\mathbf{v}',
  bw: '\\mathbf{w}',
  bo: '\\mathbf{0}',
  be: '\\mathbf{e}',
  br: '\\mathbf{r}',
  bt: '\\mathbf{t}',
  bn: '\\mathbf{n}',
  bb: '\\mathbf{b}',
  I: '\\mathrm{I}',
  II: '\\mathrm{I\\!I}',
  emph: ['\\textit{#1}', 1],
};

/** Lines injected into exported .tex preambles (\providecommand so banks can override). */
export const LATEX_EXPORT_MACRO_LINES = [
  '\\providecommand{\\bu}{\\mathbf{u}}',
  '\\providecommand{\\bv}{\\mathbf{v}}',
  '\\providecommand{\\bw}{\\mathbf{w}}',
  '\\providecommand{\\bo}{\\mathbf{0}}',
  '\\providecommand{\\be}{\\mathbf{e}}',
  '\\providecommand{\\br}{\\mathbf{r}}',
  '\\providecommand{\\bt}{\\mathbf{t}}',
  '\\providecommand{\\bn}{\\mathbf{n}}',
  '\\providecommand{\\bb}{\\mathbf{b}}',
  '\\providecommand{\\I}{\\mathrm{I}}',
  '\\providecommand{\\II}{\\mathrm{I\\!I}}',
];

/** MathJax 2 Hub.Config TeX.Macros (same keys/values as MATHJAX_MACROS). */
export function getMathJax2Macros() {
  return JSON.parse(JSON.stringify(MATHJAX_MACROS));
}
