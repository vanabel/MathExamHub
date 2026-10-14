/**
 * MathJax 全局配置
 * 定义自定义命令，如 \fillin 和 \fillout
 */
export const mathjaxOptions = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    macros: {
      fillin: ["\\underline{\\phantom{|}#1\\phantom{|}}", 1],
      fillout: ["\\underline{#1}", 1],
      pickout: ["\\text{(#1)}", 1],
      score: ["\\cdots\\cdots(#1\\,\\text{分})", 1],
      true: "\\checkmark",
      false: "\\text{\\sffamily x}",
      bu: "\\mathbf{u}",
      bv: "\\mathbf{v}",
      bw: "\\mathbf{w}",
      bo: "\\mathbf{0}",
      be: "\\mathbf{e}",
      br: "\\mathbf{r}",
      bt: "\\mathbf{t}",
      bn: "\\mathbf{n}",
      bb: "\\mathbf{b}",
      I: "\\mathrm{I}",
      II: "\\mathrm{I\\!I}",
      emph: ["\\textit{#1}", 1],
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

