const { expect } = require('@playwright/test');

/** @type {Record<string, { testId: string, path?: RegExp, optional?: boolean }>} */
const PAGE_MARKERS = {
  'question-list': { testId: 'question-list-add', path: /question-list/ },
  'question-add': { testId: 'nav-question-list', path: /question-add/ },
  'question-edit': { testId: 'nav-question-list', path: /question-edit/ },
  'latex-export': { testId: 'latex-export-selection-summary', path: /latex-export/ },
  'latex-import': { testId: 'nav-menu-tools', path: /latex-import/ },
  'kp-import': { testId: 'kp-import-file', path: /knowledge-points\/import/ },
  'knowledge-points': { testId: 'kp-excel-import-link', path: /\/knowledge-points\/?(\?|#|$)/ },
  'kp-tag-review': { testId: 'nav-question-list', path: /knowledge-points\/review/ },
  duplicates: { testId: 'nav-question-list', path: /duplicates/ },
  'recycle-bin': { testId: 'recycle-tab-questions', path: /recycle-bin/ },
  'exam-wizard': { testId: 'wizard-generate', path: /exam-wizard/ },
  'exam-history': { testId: 'nav-exam-wizard', path: /exam-history/ },
  'question-quality': { testId: 'nav-question-list', path: /question-quality/ },
  'bank-stats': { testId: 'nav-bank-stats', path: /bank-stats/ },
  'admin-forbidden': { testId: 'nav-question-list', path: /admin/ },
  'not-found': { testId: 'not-found' },
};

async function ensureNavbarExpanded(page) {
  const toggler = page.locator('.navbar-toggler');
  if (!(await toggler.isVisible().catch(() => false))) return;
  const expanded = await toggler.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await toggler.click();
    await page.locator('#navbarNav.show, #navbarNav.collapsing').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
}

async function assertNotLoginPage(page, slug) {
  const url = page.url();
  if (/\/login(?:\?|$)/.test(url)) {
    throw new Error(`[${slug}] landed on login (session lost): ${url}`);
  }
  const expired = page.getByTestId('login-session-expired');
  if (await expired.isVisible().catch(() => false)) {
    throw new Error(`[${slug}] login session expired banner visible`);
  }
}

async function assertPageReady(page, slug) {
  await assertNotLoginPage(page, slug);
  const marker = PAGE_MARKERS[slug];
  if (!marker) return;
  if (marker.path) {
    await expect(page, `[${slug}] route`).toHaveURL(marker.path);
  }
  if (!marker.testId) return;

  await ensureNavbarExpanded(page);
  const loc = page.getByTestId(marker.testId).first();
  if (marker.optional) {
    await loc.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    return;
  }
  await expect(loc, `expected ${slug} marker ${marker.testId}`).toBeVisible({ timeout: 45000 });
}

module.exports = { assertNotLoginPage, assertPageReady, PAGE_MARKERS, ensureNavbarExpanded };
