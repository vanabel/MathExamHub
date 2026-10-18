# UI v2 screenshot gallery

Captured with Playwright (`e2e/tests/ui-v2-screenshots.spec.js`).

```bash
# Terminal 1–2: backend + frontend (see docs/DEV_API.md)
UI_V2_PHASE=before npx playwright test ui-v2-screenshots.spec.js --config e2e/playwright.config.js
UI_V2_PHASE=after  npx playwright test ui-v2-screenshots.spec.js --config e2e/playwright.config.js
```

Output layout:

- `before/{1440|390}/<slug>.png`
- `after/{1440|390}/<slug>.png`

Slugs: `login`, `register`, `question-list`, `question-add`, `question-edit`, `latex-import-empty`, `latex-export`, `knowledge-points`, `kp-import`, `duplicates`, `recycle-bin`, `exam-wizard`, `exam-history`, `question-quality`, `bank-stats`, `admin-forbidden`.
