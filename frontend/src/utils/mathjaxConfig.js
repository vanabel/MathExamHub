/**
 * MathJax 全局配置
 * 定义自定义命令，如 \fillin 和 \fillout
 */
export const mathjaxOptions = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    macros: {
      fillin: ["\\underline{#1}", 1],
      fillout: ["\\underline{#1}", 1],
    },
  },
  CommonHTML: {
    linebreaks: { automatic: true },
  },
  "HTML-CSS": {
    styles: { ".MathJax_Display": { margin: 0 } },
    linebreaks: { automatic: true },
  },
  SVG: {
    linebreaks: { automatic: true },
  },
};

