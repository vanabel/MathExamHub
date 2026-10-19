# UI v2 screenshot gallery

Captured with Playwright (`e2e/tests/ui-v2-screenshots.spec.js`). The spec seeds a realistic bank (sample import, 解析几何 metadata, MathJax stem, KP tag job, exam generate) before capturing.

```bash
# Terminal 1: backend (MongoDB required)
MONGODB_URI=mongodb://localhost:27017/mathexam_dev SESSION_SECRET=dev node backend/server.js

# Terminal 2: frontend dist (relative /api — proxied on same origin)
cd frontend && npm run build

# Terminal 3: static server with /api proxy (required for session cookies)
node e2e/scripts/ui-v2-static-server.js

# Terminal 4: capture (not run in CI unless UI_V2_PHASE is set)
cd e2e && npm ci
UI_V2_PHASE=after PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npx playwright test ui-v2-screenshots.spec.js
```

The harness logs in once via Playwright `APIRequest` on the app origin (`/api` proxy), sets `localStorage.currentUser` / `currentBankId`, persists `storageState` under `e2e/.auth/` (gitignored), and **asserts each capture is not `/login` and shows the route’s `data-testid` marker** (expanding the mobile navbar when needed). Login/register shots use a separate empty browser context so the main session is never cleared.

For **before** shots on an older UI build, serve that build on another port and set `UI_V2_PHASE=before` (same seed runs against the API so content matches).

Output layout:

- `before/{1440|390}/<slug>.png`
- `after/{1440|390}/<slug>.png`

Slugs: `login`, `register`, `navbar` (navbar strip only, 1440), `question-list`, `question-add`, `question-edit`, `latex-import`, `latex-export`, `knowledge-points`, `kp-import`, `kp-tag-review`, `duplicates`, `recycle-bin`, `exam-wizard`, `exam-history`, `question-quality`, `bank-stats`, `admin-forbidden`, `not-found`.
