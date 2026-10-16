# Upstream contributions (not pushed from MathExamHub CI)

This folder holds **patch files and instructions** for [vanabel/mathexam](https://github.com/vanabel/mathexam). Apply and open PRs **manually** on the mathexam repository.

## `mathexam-dtlwrite-guard.patch`

**Problem:** `mathexam` v2.3.1 calls `\DTLwrite` at `\end{document}`. TeX Live installs with older `datatool` (no `\DTLwrite`) fail to compile with an undefined control sequence.

**Fix:** Wrap the two `\DTLwrite` lines in `\@ifundefined{DTLwrite}{...}{...}` and emit `\PackageWarningNoLine` when skipped.

### How to apply on a mathexam checkout

```bash
git clone https://github.com/vanabel/mathexam.git
cd mathexam
git checkout v2.3.1   # or your release branch

# If you build from dtx, patch both mathexam.sty (if shipped) and mathexam.dtx (source of truth):
patch -p1 < /path/to/MathExamHub/docs/upstream/mathexam-dtlwrite-guard.patch

# Mirror the same hunk in mathexam.dtx (search for \preto{\@enddocumenthook}) if only .dtx is maintained upstream.

latex mathexam.dtx    # regenerate mathexam.sty if needed
```

### Suggested upstream PR title

`fix: guard DTLwrite export for older datatool / TeX Live`

### Verification

Compile any minimal mathexam document on Ubuntu with `texlive-latex-extra` only; PDF should build with a warning instead of hard failure.

MathExamHub already ships this guard in `TeX/mathexam.sty` (see [MATHEXAM_VENDOR.md](../MATHEXAM_VENDOR.md)).
