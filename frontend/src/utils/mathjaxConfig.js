/**
 * MathJax 3 options (vue-mathjax-next). Macros must match public/index.html Hub config.
 */
import { MATHJAX_MACROS } from './mathjaxMacros';

export const mathjaxOptions = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    tags: 'ams',
    macros: { ...MATHJAX_MACROS },
  },
  CommonHTML: {
    linebreaks: { automatic: true },
  },
  'HTML-CSS': {
    styles: { '.MathJax_Display': { margin: 0 } },
    linebreaks: { automatic: true },
  },
  SVG: {
    linebreaks: { automatic: true },
  },
};
