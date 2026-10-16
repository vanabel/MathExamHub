# Release notes — v1.0.0

**Date:** 2026-10-16  
**Git tag (when ready):** `v1.0.0` on `main`

## Highlights

- **End-to-end exam workflow:** LaTeX import → blueprint wizard → multi-seed coverage check → generate → mathexam ZIP export (CI compiles with XeLaTeX).
- **Onboarding:** One-click 44-question sample bank, knowledge-point tree, shared starter blueprint template.
- **Operations:** Docker Compose + Nginx, migration scripts, admin console, bank-stats CSV with blueprint gap filters.
- **Quality gates:** Unit tests, Mongo scenario flow, list benchmark, Playwright smoke (login → import → wizard → export → stats CSV → optional TeX compile).

## Upgrade from 0.x / feature branches

1. Read [DEPLOYMENT_NAS.md](./DEPLOYMENT_NAS.md) **Production upgrade checklist**.
2. Run migrations in order on a **backup** of MongoDB.
3. Rebuild frontend (`npm run build`) so `/api` base URL matches deployment.
4. Pull `TeX/mathexam.sty` with the Hub DTLwrite guard or use TeX Live 2022+.

## Known limitations

- Server does not compile PDFs for users (local/CI XeLaTeX only); see [ROADMAP.md](./ROADMAP.md) M12 backlog.
- LLM features require `OPENAI_API_KEY` / platform settings.

## Tag command (maintainers)

```bash
git checkout main
git pull origin main
git tag -a v1.0.0 -m "MathExamHub 1.0.0"
git push origin v1.0.0
```
