/**
 * Desktop smart-select dialog screenshots (mocked API, fixed seed).
 * Usage: node e2e/scripts/capture-smart-select-screenshots.js
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'docs/screenshots/smart-select');
const dist = path.join(root, 'frontend/dist');

const FIXED_SEED = '42424242';

function buildSampleQuestions() {
  const list = [];
  let id = 0;
  const pushMany = (n, type, score, diff) => {
    for (let i = 0; i < n; i += 1) {
      list.push({
        _id: `q${id++}`,
        type,
        totalScore: score,
        difficulty: diff,
        status: 'published',
        subject: '高等数学',
        questionText: `${type} 示例 ${i + 1}`,
      });
    }
  };
  pushMany(9, '解答题', 12, '中');
  pushMany(10, '单选题', 3, '易');
  pushMany(10, '填空题', 4, '中');
  pushMany(10, '证明题', 15, '难');
  return list;
}

const sampleQuestions = buildSampleQuestions();

function startStaticServer() {
  return spawn(process.execPath, [path.join(__dirname, 'ui-v2-static-server.js')], {
    cwd: root,
    env: { ...process.env, UI_V2_STATIC_PORT: '8765' },
    stdio: 'pipe',
  });
}

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      return route.fulfill({
        json: { user: { _id: 'u1', username: 'shot_user', role: 'teacher' } },
      });
    }
    if (url.includes('/banks/mine')) {
      return route.fulfill({ json: { banks: [{ _id: 'bank1', name: 'Demo', isPersonalDefault: true }] } });
    }
    if (url.includes('/latex-metadata')) {
      return route.fulfill({ json: { latexExamMetadata: {} } });
    }
    if (url.includes('/questions/list')) {
      return route.fulfill({
        json: {
          questions: sampleQuestions,
          total: 250,
          limit: 200,
          offset: 0,
        },
      });
    }
    return route.fulfill({ json: {} });
  });
}

async function viewportShot(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: false });
}

async function scrollModalBody(page, scrollTop) {
  await page.locator('.modal-body').evaluate((el, top) => {
    el.scrollTop = top;
  }, scrollTop);
}

function installConfirmOverlayStub(page) {
  return page.addInitScript(() => {
    window.confirm = (message) => {
      document.getElementById('smart-select-confirm-overlay')?.remove();
      const host = document.createElement('div');
      host.id = 'smart-select-confirm-overlay';
      host.setAttribute('data-testid', 'smart-select-replace-confirm');
      host.innerHTML = `
        <div class="modal fade show" style="display:block; z-index:20050;" tabindex="-1" aria-modal="true" role="alertdialog">
          <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
            <div class="modal-content shadow">
              <div class="modal-body py-4 px-4">
                <p class="mb-0" style="font-size:1rem;">${message}</p>
              </div>
              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-secondary btn-sm">取消</button>
                <button type="button" class="btn btn-primary btn-sm">确定</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" style="z-index:20040; opacity:0.35;"></div>`;
      document.body.appendChild(host);
      return true;
    };
  });
}

async function preparePage(context, theme, { stubConfirm = false } = {}) {
  const page = await context.newPage();
  await page.addInitScript((scheme) => {
    localStorage.setItem('mathexamColorScheme', scheme);
    localStorage.setItem('currentUser', JSON.stringify({ _id: 'u1', username: 'shot_user' }));
    localStorage.setItem('currentBankId', 'bank1');
  }, theme);
  if (stubConfirm) {
    await installConfirmOverlayStub(page);
  }
  await mockApi(page);
  await page.goto('http://127.0.0.1:8765/latex-export', { waitUntil: 'networkidle' });
  await page.locator('.export-question-row').first().waitFor({ timeout: 20000 });
  return page;
}

async function openModalWithSettings(page) {
  await page.getByTestId('latex-export-smart-select').click();
  await page.locator('.modal-body').waitFor({ state: 'visible' });
  await page.locator('#smartSelectMode').selectOption('count');
  await page.locator('#targetCount').fill('12');
  await page.locator('#targetTotalScore').fill('100');
  await page.locator('#smartSelectSeed').fill(FIXED_SEED);
  await page.locator('.modal-body select.form-select').nth(1).selectOption('random');
}

async function enableTypeDistributionShortfall(page) {
  const enableBtn = page.getByRole('button', { name: '启用' });
  if (await enableBtn.isVisible()) {
    await enableBtn.click();
  }
  const answerRow = page.locator('.smart-select-type-panel .input-group').filter({ hasText: '解答题' });
  await answerRow.locator('input').fill('12');
}

async function captureSettingsAndResult(theme) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  });
  const page = await preparePage(context, theme);
  const prefix = `smart-select-${theme}`;

  await openModalWithSettings(page);
  await scrollModalBody(page, 0);
  await viewportShot(page, path.join(outDir, `${prefix}-01-settings-top.png`));

  await enableTypeDistributionShortfall(page);
  await scrollModalBody(page, 320);
  await page.locator('.smart-select-type-panel').scrollIntoViewIfNeeded();
  await viewportShot(page, path.join(outDir, `${prefix}-02-type-distribution.png`));

  await page.locator('.modal-footer').getByRole('button', { name: '应用' }).click();
  await page.getByTestId('smart-select-result-summary').waitFor({ timeout: 15000 });
  await scrollModalBody(page, 99999);
  await page.getByTestId('smart-select-result-summary').scrollIntoViewIfNeeded();
  await viewportShot(page, path.join(outDir, `${prefix}-03-result-shortfall.png`));

  await browser.close();
}

async function captureConfirmDialog(theme) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  });
  const page = await preparePage(context, theme, { stubConfirm: true });
  const prefix = `smart-select-${theme}`;

  await page.locator('.export-question-row').nth(0).click();
  await page.locator('.export-question-row').nth(1).click();
  await page.locator('.export-question-row').nth(2).click();

  await openModalWithSettings(page);
  await enableTypeDistributionShortfall(page);

  await page.evaluate(() => {
    window.confirm('替换当前已选的 3 道题？');
  });
  await page.waitForTimeout(300);
  await viewportShot(page, path.join(outDir, `${prefix}-04-confirm-replace.png`));

  await browser.close();
}

async function main() {
  if (!fs.existsSync(dist)) {
    console.error('Run frontend build first');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const old of fs.readdirSync(outDir)) {
    if (old.startsWith('smart-select-dialog-')) {
      fs.unlinkSync(path.join(outDir, old));
    }
  }

  const server = startStaticServer();
  await new Promise((r) => setTimeout(r, 800));
  try {
    for (const theme of ['light', 'dark']) {
      await captureSettingsAndResult(theme);
      await captureConfirmDialog(theme);
    }
    const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
    console.log('Saved:', files.join('\n'));
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
