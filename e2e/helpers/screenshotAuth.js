/**
 * Authenticated session for UI screenshot runs.
 * Uses Playwright APIRequest (same cookie jar as page) + localStorage on app origin.
 */

const path = require('path');
const fs = require('fs');

const appOrigin = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
/** Same-origin /api when using e2e/scripts/ui-v2-static-server.js */
const apiBase = process.env.PLAYWRIGHT_API_URL || `${appOrigin}/api`;

const defaultStorageStatePath = path.join(__dirname, '../.auth/ui-v2-screenshot-storage.json');

async function syncLocalStorageSession(page, { user, bankId }) {
  await page.goto(`${appOrigin}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ u, bid }) => {
    if (u) localStorage.setItem('currentUser', JSON.stringify(u));
    else localStorage.removeItem('currentUser');
    if (bid) localStorage.setItem('currentBankId', String(bid));
    else localStorage.removeItem('currentBankId');
  }, { u: user, bankId: bankId || '' });
}

async function persistAuthStorageState(context, page, { user, bankId }, statePath = defaultStorageStatePath) {
  await syncLocalStorageSession(page, { user, bankId });
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  await context.storageState({ path: statePath });
  return statePath;
}

async function restoreAuthStorageState(context, statePath = defaultStorageStatePath) {
  if (!fs.existsSync(statePath)) {
    throw new Error(`missing auth storageState at ${statePath}`);
  }
  await context.setStorageState({ path: statePath });
}

async function registerAndLoginSession(page, { uid, password, email }) {
  const reg = await page.request.post(`${apiBase}/auth/register`, {
    data: { username: uid, password, email },
  });
  if (!reg.ok() && reg.status() !== 409) {
    throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
  }

  const login = await page.request.post(`${apiBase}/auth/login`, {
    data: { username: uid, password },
  });
  if (!login.ok()) {
    throw new Error(`login failed: ${login.status()} ${await login.text()}`);
  }

  const meRes = await page.request.get(`${apiBase}/auth/me`);
  if (!meRes.ok()) {
    throw new Error(`auth/me failed after login: ${meRes.status()}`);
  }
  const me = await meRes.json();

  const banksRes = await page.request.get(`${apiBase}/banks/mine`);
  const banksBody = banksRes.ok() ? await banksRes.json() : { banks: [] };
  const personal = (banksBody.banks || []).find((b) => b.isPersonalDefault) || (banksBody.banks || [])[0];
  const bankId = personal?._id || '';

  await syncLocalStorageSession(page, { user: me.user, bankId });

  const verify = await page.request.get(`${apiBase}/auth/me`);
  if (!verify.ok()) {
    throw new Error('session verify failed: API cookie not persisted on request context');
  }

  return { user: me.user, bankId };
}

async function restoreSessionToPage(page, { user, bankId, password, uid }) {
  const login = await page.request.post(`${apiBase}/auth/login`, {
    data: { username: uid, password },
  });
  if (!login.ok()) {
    throw new Error(`session restore login failed: ${login.status()}`);
  }
  await page.evaluate(({ u, bid }) => {
    if (u) localStorage.setItem('currentUser', JSON.stringify(u));
    if (bid) localStorage.setItem('currentBankId', bid);
  }, { u: user, bankId });
}

async function captureLoggedOutAuthPages(browser, vp, snapFn) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${appOrigin}/login`, { waitUntil: 'domcontentloaded' });
  await snapFn(page, 'login', vp);
  await page.goto(`${appOrigin}/register`, { waitUntil: 'domcontentloaded' });
  await snapFn(page, 'register', vp);
  await ctx.close();
}

module.exports = {
  apiBase,
  appOrigin,
  defaultStorageStatePath,
  registerAndLoginSession,
  syncLocalStorageSession,
  persistAuthStorageState,
  restoreAuthStorageState,
  restoreSessionToPage,
  captureLoggedOutAuthPages,
};
