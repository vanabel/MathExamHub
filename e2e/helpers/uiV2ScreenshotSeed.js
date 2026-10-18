/**
 * Seed a realistic bank for UI v2 screenshots (Playwright + local capture).
 * Uses public API routes only (same as smoke tests).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const fixtureDir = path.join(__dirname, '../../backend/test/fixtures/exam-structure');
const kpFixture = path.join(__dirname, '../../backend/test/fixtures/analytic-geometry-kp.xls');

function buildMathexamZip() {
  const zipPath = path.join(os.tmpdir(), `ui-v2-seed-${Date.now()}.zip`);
  execSync(`zip -j "${zipPath}" exam.tex exam-body.tex`, { cwd: fixtureDir });
  return zipPath;
}

function headers(bankId) {
  const h = { 'Content-Type': 'application/json' };
  if (bankId) h['X-Bank-Id'] = bankId;
  return h;
}

async function pollKpTagJob(base, bankId, jobId, maxMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const res = await fetch(`${base}/questions/kp-tag-jobs/${jobId}`, {
      credentials: 'include',
      headers: headers(bankId),
    });
    const job = await res.json();
    const status = job.status;
    const rowCount = (job.rows || []).length;
    if (status === 'review' || (status === 'completed' && rowCount > 0)) {
      return job;
    }
    if (status === 'failed') {
      throw new Error(`kp tag job failed: ${job.error || 'unknown'}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('kp tag job timeout');
}

/**
 * Run in browser context via page.evaluate — pass { base: apiBase }.
 */
async function seedUiV2ScreenshotBank({ base }) {
  const bankId = localStorage.getItem('currentBankId');
  const hdrs = { 'Content-Type': 'application/json' };
  if (bankId) hdrs['X-Bank-Id'] = bankId;

  await fetch(`${base}/onboarding/tour`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tourCompleted: true, tourStep: 4 }),
  });

  const importRes = await fetch(`${base}/onboarding/import-sample`, {
    method: 'POST',
    credentials: 'include',
    headers: hdrs,
  });
  const importBody = await importRes.json();

  await fetch(`${base}/banks/${bankId}/latex-metadata`, {
    method: 'PATCH',
    credentials: 'include',
    headers: hdrs,
    body: JSON.stringify({
      course: '解析几何',
      university: '西南大学',
      school: '数学与统计学院',
    }),
  });

  const listRes = await fetch(`${base}/questions/list?limit=5`, { credentials: 'include', headers: hdrs });
  const list = await listRes.json();
  const sampleQs = list.questions || [];
  const longFormula =
    '设椭圆 $\\displaystyle\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$（$a>b>0$），'
    + '焦点为 $F_1,F_2$，过 $F_2$ 的直线与椭圆交于 $A,B$，且 $|AF_2|:|F_2B|=3:1$，'
    + '求离心率 $e=\\sqrt{1-\\frac{b^2}{a^2}}$ 的可能取值并说明理由。';
  if (sampleQs[0]?._id) {
    await fetch(`${base}/questions/${sampleQs[0]._id}/edit`, {
      method: 'PUT',
      credentials: 'include',
      headers: hdrs,
      body: JSON.stringify({
        questionText: longFormula,
        type: sampleQs[0].type || '计算题',
        totalScore: sampleQs[0].totalScore || 10,
        difficulty: '难',
        subject: '解析几何',
        correctAnswer: sampleQs[0].correctAnswer || '见解答',
        knowledgePointIds: sampleQs[0].knowledgePointIds || [],
      }),
    });
  }
  for (const q of sampleQs.slice(1, 4)) {
    await fetch(`${base}/questions/${q._id}/edit`, {
      method: 'PUT',
      credentials: 'include',
      headers: hdrs,
      body: JSON.stringify({
        questionText: q.questionText,
        type: q.type,
        totalScore: q.totalScore,
        difficulty: q.difficulty,
        subject: '解析几何',
        correctAnswer: q.correctAnswer,
        knowledgePointIds: [],
      }),
    });
  }

  const choiceRes = await fetch(`${base}/questions/create`, {
    method: 'POST',
    credentials: 'include',
    headers: hdrs,
    body: JSON.stringify({
      type: '单选题',
      subject: '解析几何',
      difficulty: '中',
      totalScore: 4,
      questionText: '直线 $y=kx+1$ 与圆 $x^2+y^2=4$ 相切，则 $k=$',
      options: {
        A: '$\\pm 1$',
        B: '$\\pm \\sqrt{3}$',
        C: '$0$',
        D: '$\\pm 2$',
      },
      correctAnswer: 'B',
    }),
  });
  await choiceRes.json();

  const blueprintList = await fetch(`${base}/exam-blueprints`, { credentials: 'include', headers: hdrs })
    .then((r) => r.json())
    .catch(() => []);
  const bp = (Array.isArray(blueprintList) ? blueprintList : []).find((b) => b.isTemplate)
    || (Array.isArray(blueprintList) ? blueprintList[0] : null);
  const blueprintId = bp?._id || importBody.starterBlueprintId;
  if (blueprintId) {
    await fetch(`${base}/exams/generate`, {
      method: 'POST',
      credentials: 'include',
      headers: hdrs,
      body: JSON.stringify({ blueprintId, allowScoreGap: true }),
    });
  }

  const jobStart = await fetch(`${base}/questions/kp-tag-jobs`, {
    method: 'POST',
    credentials: 'include',
    headers: hdrs,
    body: JSON.stringify({ subject: '解析几何', maxKpsPerQuestion: 2 }),
  });
  const jobBody = await jobStart.json();
  const jobId = jobBody.jobId || jobBody._id;

  return {
    importBody,
    jobId,
    blueprintId,
  };
}

module.exports = {
  buildMathexamZip,
  kpFixture,
  seedUiV2ScreenshotBank,
  pollKpTagJob,
  headers,
};
