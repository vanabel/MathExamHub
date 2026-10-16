# TeX Live requirements (XeLaTeX export compile)

MathExamHub export ZIPs include `mathexam.sty` (pinned in `TeX/`). Compile the main `.tex` with **XeLaTeX** and **`-shell-escape`** when using answer-sheet rename hooks.

## Recommended

- **TeX Live 2022 or newer** (full or medium scheme), so `datatool` provides `\DTLwrite` (v3 API) used for optional grade CSV/dbtex export at `\end{document}`.
- Engine: **XeLaTeX** (`xelatex -shell-escape exam.tex`, two passes).

## Debian / Ubuntu packages (CI-aligned minimum)

```bash
sudo apt-get install -y \
  texlive-xetex texlive-lang-chinese texlive-fonts-recommended \
  texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-science unzip
```

| Package | Provides |
|---------|----------|
| `texlive-xetex` | XeLaTeX |
| `texlive-lang-chinese` | `ctex` / Chinese fonts |
| `texlive-latex-extra` | `ulem`, `datatool`, many common macros |
| `texlive-latex-recommended` | core LaTeX |
| `texlive-pictures` | graphics helpers used by some exports |
| `texlive-science` | math/science packages |

## Older datatool (no `\DTLwrite`)

Hub’s vendored `mathexam.sty` **detects** missing `\DTLwrite` and skips CSV/dbtex export with a warning instead of failing the compile. Exam PDF generation still succeeds; only automatic `.dat`/`.dbtex` sidecar export is omitted.

For full upstream parity, upgrade TeX Live or install a current `datatool` bundle.

See also [MATHEXAM_VENDOR.md](./MATHEXAM_VENDOR.md).
