# Changelog

All notable changes to MathExamHub are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-10-16 (tag-ready)

First production-ready release: multi-bank LaTeX import/export, constraint-driven exam generation, onboarding, CI scenario + e2e smoke, and vendored `mathexam` v2.3.1 with TeX compatibility guard.

### Added (by roadmap milestone)

- **M0–M1**: Unified `/api` prefix, Docker/Nginx alignment, unit tests + GitHub Actions CI.
- **M2–M3**: Question schema (`originalLaTeX`, lifecycle, `contentHash`), knowledge points, **QuestionBank** / members, migration scripts.
- **M4–M5**: LaTeX import/export UI, duplicate review, recycle bin, quality tools.
- **M6**: Paginated question list, filters, list benchmark in CI.
- **M7–M9**: Exam blueprints, generator, wizard UI, template library, LaTeX ZIP export (exam + answer), blueprint coverage analysis.
- **M10**: A/B variants, usage tracking on questions, exam history.
- **M11**: Platform admin console, auth `/me` refresh, bank-scoped middleware hardening.
- **Post-M11**: Multi-seed coverage hints; bank-stats CSV with gap `listQuery` columns; rich onboarding sample (44 Q) + starter blueprint; fill-gaps batch in question list; Playwright `e2e-smoke`; XeLaTeX compile in CI for exported ZIPs; `\DTLwrite` guard in vendored `mathexam.sty`; [TEXLIVE.md](./docs/TEXLIVE.md).

### Changed

- Onboarding imports JSON sample bank instead of tiny `package-examples.tex` only (fixture still used for metadata / compile tests).
- README and [GETTING_STARTED.md](./docs/GETTING_STARTED.md) include real Playwright screenshots.

### Fixed

- Bank stats view merge-conflict residue (caught by conflict-marker CI).
- Older TeX Live / datatool: export PDF builds with warning instead of hard failure when `\DTLwrite` is missing.

### Security

- Production checklist in [DEPLOYMENT_NAS.md](./docs/DEPLOYMENT_NAS.md): `SESSION_SECRET`, Mongo exposure, admin role, migrations.

---

## [0.x] - Pre-1.0 (development)

Historical work tracked in [ROADMAP.md](./docs/ROADMAP.md) and merged PRs #1–#42 on `main` through 2026-10.
