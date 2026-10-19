/**
 * Seed screenshot bank via Playwright APIRequest (same session cookies as the page).
 */
const appOrigin = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const apiBase = process.env.PLAYWRIGHT_API_URL || `${appOrigin}/api`;

async function seedViaPageRequest(page, bankId) {
  const hdr = (extra = {}) => ({
    ...(bankId ? { 'X-Bank-Id': bankId } : {}),
    ...extra,
  });

  await page.request.patch(`${apiBase}/onboarding/tour`, {
    headers: hdr({ 'Content-Type': 'application/json' }),
    data: { tourCompleted: true, tourStep: 4 },
  });

  const importRes = await page.request.post(`${apiBase}/onboarding/import-sample`, {
    headers: hdr(),
  });
  const importBody = importRes.ok() ? await importRes.json() : {};

  await page.request.patch(`${apiBase}/banks/${bankId}/latex-metadata`, {
    headers: hdr({ 'Content-Type': 'application/json' }),
    data: {
      course: '解析几何',
      university: '西南大学',
      school: '数学与统计学院',
    },
  });

  const listRes = await page.request.get(`${apiBase}/questions/list?limit=5`, { headers: hdr() });
  const list = listRes.ok() ? await listRes.json() : { questions: [] };
  const sampleQs = list.questions || [];
  const longFormula =
    '设椭圆 $\\displaystyle\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$（$a>b>0$），'
    + '焦点为 $F_1,F_2$，过 $F_2$ 的直线与椭圆交于 $A,B$，且 $|AF_2|:|F_2B|=3:1$，'
    + '求离心率 $e=\\sqrt{1-\\frac{b^2}{a^2}}$ 的可能取值并说明理由。';

  if (sampleQs[0]?._id) {
    await page.request.put(`${apiBase}/questions/${sampleQs[0]._id}/edit`, {
      headers: hdr({ 'Content-Type': 'application/json' }),
      data: {
        questionText: longFormula,
        type: sampleQs[0].type || '计算题',
        totalScore: sampleQs[0].totalScore || 10,
        difficulty: '难',
        subject: '解析几何',
        correctAnswer: sampleQs[0].correctAnswer || '见解答',
        knowledgePointIds: sampleQs[0].knowledgePointIds || [],
      },
    });
  }
  for (const q of sampleQs.slice(1, 4)) {
    await page.request.put(`${apiBase}/questions/${q._id}/edit`, {
      headers: hdr({ 'Content-Type': 'application/json' }),
      data: {
        questionText: q.questionText,
        type: q.type,
        totalScore: q.totalScore,
        difficulty: q.difficulty,
        subject: '解析几何',
        correctAnswer: q.correctAnswer,
        knowledgePointIds: [],
      },
    });
  }

  await page.request.post(`${apiBase}/questions/create`, {
    headers: hdr({ 'Content-Type': 'application/json' }),
    data: {
      type: '单选题',
      subject: '解析几何',
      difficulty: '中',
      totalScore: 4,
      questionText: '直线 $y=kx+1$ 与圆 $x^2+y^2=4$ 相切，则 $k=$',
      options: { A: '$\\pm 1$', B: '$\\pm \\sqrt{3}$', C: '$0$', D: '$\\pm 2$' },
      correctAnswer: 'B',
    },
  });

  const figureStem =
    '如图，椭圆 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$ 上一点 $P$ 满足 $|PF_1|:|PF_2|=3:1$，求离心率。';
  const figureLatex =
    `${figureStem}\n`
    + '\\begin{figure}[h]\\centering 如图 \\caption{示意图}\\end{figure}\n'
    + '\\begin{solution}\\begin{align}x^2+y^2&=1\\end{align}\\end{solution}\n'
    + '\\begin{rmk}备注：含 figure/solution/rmk 环境。\\end{rmk}';
  await page.request.post(`${apiBase}/questions/create`, {
    headers: hdr({ 'Content-Type': 'application/json' }),
    data: {
      type: '解答题',
      subject: '解析几何',
      difficulty: '难',
      totalScore: 12,
      questionText: figureStem,
      originalLaTeX: figureLatex,
      correctAnswer: '见解答',
      solution: '由焦点性质可得 $e=\\frac{\\sqrt{3}}{2}$。',
    },
  });

  const blueprintList = await page.request.get(`${apiBase}/exam-blueprints`, { headers: hdr() });
  const bps = blueprintList.ok() ? await blueprintList.json() : [];
  const bp = (Array.isArray(bps) ? bps : []).find((b) => b.isTemplate) || (Array.isArray(bps) ? bps[0] : null);
  const blueprintId = bp?._id || importBody.starterBlueprintId;
  if (blueprintId) {
    await page.request.post(`${apiBase}/exams/generate`, {
      headers: hdr({ 'Content-Type': 'application/json' }),
      data: { blueprintId, allowScoreGap: true },
    });
  }

  const jobStart = await page.request.post(`${apiBase}/questions/kp-tag-jobs`, {
    headers: hdr({ 'Content-Type': 'application/json' }),
    data: { subject: '解析几何', maxKpsPerQuestion: 2 },
  });
  const jobBody = jobStart.ok() ? await jobStart.json() : {};
  const jobId = jobBody.jobId || jobBody._id;

  return { importBody, jobId, blueprintId };
}

module.exports = { seedViaPageRequest };
