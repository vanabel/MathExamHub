const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { ScenarioClient, startServer } = require('./httpClient');
const { LatexParser } = require('../../utils/latexParser');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mathexam_scenario_test';
const port = Number(process.env.SCENARIO_PORT) || 3099;
const fixturePath = path.join(__dirname, '../fixtures/package-examples.tex');

async function stopServer(serverProc) {
  if (!serverProc || serverProc.killed) return;
  serverProc.kill('SIGKILL');
  await new Promise((resolve) => {
    serverProc.on('exit', resolve);
    setTimeout(resolve, 1500);
  });
}

async function run() {
  if (process.env.SKIP_SCENARIO === '1') {
    console.log('SKIP scenario (SKIP_SCENARIO=1)');
    return;
  }

  let serverProc;
  const username = `scenario_${Date.now()}`;
  const password = 'ScenarioPass123!';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    await mongoose.connection.db.dropDatabase();

    serverProc = await startServer(mongoUri, port);
    const client = new ScenarioClient(`http://127.0.0.1:${port}`);

    const reg = await client.register(username, password, `${username}@example.com`);
    assert.equal(reg.status, 201);
    const login = await client.login(username, password);
    assert.equal(login.status, 200);
    await client.loadDefaultBank();

    const texBuffer = fs.readFileSync(fixturePath);
    const appendTex = (form) => {
      form.append(
        'file',
        new File([texBuffer], 'package-examples.tex', { type: 'text/plain' }),
      );
    };

    console.log('· import multi-part fixture');
    const form1 = new FormData();
    appendTex(form1);
    const imp1 = await client.request('POST', '/api/questions/import/latex', { formData: form1, json: false });
    assert.equal(imp1.status, 200, JSON.stringify(imp1.data));
    assert.ok(
      imp1.data.imported >= 4,
      `imported=${imp1.data.imported} skipped=${imp1.data.skipped} failed=${imp1.data.failed}`,
    );

    console.log('· re-import skips duplicates');
    const form2 = new FormData();
    appendTex(form2);
    const imp2 = await client.request('POST', '/api/questions/import/latex', { formData: form2, json: false });
    assert.equal(imp2.status, 200);
    assert.equal(imp2.data.imported, 0);
    assert.ok(imp2.data.skipped >= 4);

    console.log('· soft-delete and restore');
    const list = await client.request('GET', '/api/questions/list');
    assert.equal(list.status, 200);
    const rows = Array.isArray(list.data) ? list.data : list.data.questions;
    const firstId = rows[0]._id;
    assert.ok(firstId);
    assert.equal((await client.request('DELETE', `/api/questions/${firstId}/delete`)).status, 200);
    const bin = await client.request('GET', '/api/questions/recycle-bin');
    assert.ok(bin.data.items.some((q) => String(q._id) === String(firstId)));
    assert.equal((await client.request('POST', `/api/questions/recycle-bin/${firstId}/restore`)).status, 200);

    console.log('· blueprint generate + export');
    const blueprint = {
      title: '场景测试卷',
      subject: '高等代数',
      totalScore: 16,
      randomSeed: 4242,
      allowRelaxation: true,
      sections: [
        { type: '判断题', count: 1, scoreEach: 2, difficultyMix: { 易: 0, 中: 0, 难: 0 } },
        { type: '单选题', count: 1, scoreEach: 2, difficultyMix: { 易: 0, 中: 0, 难: 0 } },
        { type: '填空题', count: 1, scoreEach: 2, difficultyMix: { 易: 0, 中: 0, 难: 0 } },
        { type: '计算题', count: 1, scoreEach: 10, difficultyMix: { 易: 0, 中: 0, 难: 0 } },
      ],
    };
    const saved = await client.request('POST', '/api/exam-blueprints', { body: blueprint });
    assert.equal(saved.status, 201);
    const blueprintId = saved.data._id;
    const gen1 = await client.request('POST', '/api/exams/generate', { body: { blueprintId } });
    const gen2 = await client.request('POST', '/api/exams/generate', { body: { blueprintId } });
    assert.deepEqual(gen1.data.questionIds, gen2.data.questionIds);
    assert.ok(gen1.data.questionIds.length >= 1);

    const exportRes = await client.request('POST', '/api/questions/export/latex', {
      body: {
        questionIds: gen1.data.questionIds,
        blueprintId,
        paperId: gen1.data.paperId,
        metadata: { exportMode: 'both' },
      },
    });
    assert.equal(exportRes.status, 200);
    assert.ok(Buffer.isBuffer(exportRes.data));
    const zipText = exportRes.data.toString('binary');
    assert.ok(zipText.includes('mathexam.sty'));
    assert.ok(zipText.includes('.tex'));

    const sample = gen1.data.questions[0]?.originalLaTeX;
    if (sample && sample.includes('\\begin{problem}')) {
      const parsed = new LatexParser().parse(sample);
      assert.ok(parsed.length >= 1);
    }

    console.log('Scenario product flow: OK');
  } finally {
    await stopServer(serverProc);
    await mongoose.disconnect().catch(() => {});
  }
}

const deadline = setTimeout(() => {
  console.error('Scenario timed out after 90s');
  process.exit(1);
}, 90000);

run()
  .then(() => {
    clearTimeout(deadline);
    process.exit(0);
  })
  .catch((err) => {
    clearTimeout(deadline);
    console.error(err);
    process.exit(1);
  });
