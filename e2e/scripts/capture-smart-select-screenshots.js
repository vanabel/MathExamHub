/**
 * Captures smart-select dialog screenshots (light + dark) using mocked API.
 * Usage: node e2e/scripts/capture-smart-select-screenshots.js
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'docs/screenshots/smart-select');
const dist = path.join(root, 'frontend/dist');

const sampleQuestions = [];
const types = ['单选题', '填空题', '解答题', '证明题'];
for (let i = 0; i < 40; i += 1) {
  sampleQuestions.push({
    _id: `q${i}`,
    type: types[i % types.length],
    totalScore: [3, 4, 12, 15][i % 4],
    difficulty: ['易', '中', '难'][i % 3],
    status: i === 2 ? 'archived' : 'published',
    subject: '高等数学',
    questionText: `示例题目 ${i + 1}`,
  });
}

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
          questions: sampleQuestions.filter((q) => q.status !== 'archived'),
          total: 250,
          limit: 200,
          offset: 0,
        },
      });
    }
    return route.fulfill({ status: 404, body: 'not mocked' });
  });
}

async function capture(theme) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  });
  const page = await context.newPage();
  await page.addInitScript((scheme) => {
    localStorage.setItem('mathexamColorScheme', scheme);
    localStorage.setItem('currentUser', JSON.stringify({ _id: 'u1', username: 'shot_user' }));
    localStorage.setItem('currentBankId', 'bank1');
  }, theme);
  await mockApi(page);
  await page.goto('http://127.0.0.1:8765/latex-export', { waitUntil: 'networkidle' });
  await page.getByTestId('latex-export-smart-select').click();
  await page.locator('#targetCount').fill('8');
  await page.getByRole('button', { name: '启用' }).click();
  const answerInput = page.locator('.smart-select-type-panel .input-group', { hasText: '解答题' }).locator('input');
  await answerInput.fill('5');
  await page.getByRole('button', { name: '应用' }).click();
  await page.getByTestId('smart-select-result-summary').waitFor({ timeout: 15000 });
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `smart-select-dialog-${theme}.png`);
  await page.locator('.modal-content').screenshot({ path: file });
  await browser.close();
  return file;
}

async function main() {
  if (!fs.existsSync(dist)) {
    console.error('Run frontend build first');
    process.exit(1);
  }
  const server = startStaticServer();
  await new Promise((r) => setTimeout(r, 800));
  try {
    await capture('light');
    await capture('dark');
    console.log('Saved screenshots to', outDir);
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
