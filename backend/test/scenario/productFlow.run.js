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

    console.log('· import multi-part fixture');
    const imp1 = await client.importLatexFile(fixturePath, { skipDuplicates: false });
    assert.equal(imp1.status, 200, JSON.stringify(imp1.data));
    const firstTotal = imp1.data.imported + imp1.data.skipped + (imp1.data.failed || 0);
    assert.ok(firstTotal >= 4, `import batch size ${firstTotal}`);
    assert.ok(
      imp1.data.imported >= 3,
      `imported=${imp1.data.imported} skipped=${imp1.data.skipped} failed=${imp1.data.failed}`,
    );

    console.log('· re-import skips duplicates');
    const imp2 = await client.importLatexFile(fixturePath);
    assert.equal(imp2.status, 200);
    assert.equal(imp2.data.imported, 0);
    assert.ok(imp2.data.skipped >= imp1.data.imported);

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
    const typesInBank = [...new Set(rows.map((q) => q.type))];
    assert.ok(typesInBank.length >= 1, '题库题型不足');
    const pickType = typesInBank[0];
    const blueprint = {
      title: '场景测试卷',
      totalScore: 4,
      randomSeed: 4242,
      allowRelaxation: true,
      sections: [{
        type: pickType,
        count: 1,
        scoreEach: 4,
        difficultyMix: { 易: 0, 中: 0, 难: 0 },
      }],
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
