const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Blob } = require('buffer');
const mongoose = require('mongoose');
const { ScenarioClient, startServer } = require('./httpClient');
const { LatexParser } = require('../../utils/latexParser');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mathexam_scenario_test';
const port = Number(process.env.SCENARIO_PORT) || 3099;
const fixturePath = path.join(__dirname, '../fixtures/package-examples.tex');

describe('product scenario (Mongo + HTTP)', { skip: process.env.SKIP_SCENARIO === '1' }, () => {
  /** @type {import('child_process').ChildProcess} */
  let serverProc;
  /** @type {ScenarioClient} */
  let client;
  const username = `scenario_${Date.now()}`;
  const password = 'ScenarioPass123!';

  before(async () => {
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();

    serverProc = await startServer(mongoUri, port);
    client = new ScenarioClient(`http://127.0.0.1:${port}`);

    const reg = await client.register(username, password, `${username}@example.com`);
    assert.equal(reg.status, 201);
    const login = await client.login(username, password);
    assert.equal(login.status, 200);
    await client.loadDefaultBank();
  });

  after(async () => {
    if (serverProc) serverProc.kill();
    await mongoose.disconnect();
  });

  it('imports multi-part mathexam fixture', async () => {
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(fixturePath)]), 'package-examples.tex');
    const res = await client.request('POST', '/api/questions/import/latex', { formData: form, json: false });
    assert.equal(res.status, 200);
    assert.ok(res.data.imported >= 4, `expected >=4 imported, got ${res.data.imported}`);
  });

  it('re-import skips duplicates', async () => {
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(fixturePath)]), 'package-examples.tex');
    const res = await client.request('POST', '/api/questions/import/latex', { formData: form, json: false });
    assert.equal(res.status, 200);
    assert.equal(res.data.imported, 0);
    assert.ok(res.data.skipped >= 4);
  });

  it('soft-delete and recycle bin restore', async () => {
    const list = await client.request('GET', '/api/questions/list?limit=5');
    assert.equal(list.status, 200);
    const rows = Array.isArray(list.data) ? list.data : list.data.questions;
    const firstId = rows?.[0]?._id;
    assert.ok(firstId);

    const del = await client.request('DELETE', `/api/questions/${firstId}/delete`);
    assert.equal(del.status, 200);

    const bin = await client.request('GET', '/api/questions/recycle-bin');
    assert.equal(bin.status, 200);
    assert.ok(bin.data.items.some((q) => String(q._id) === String(firstId)));

    const restored = await client.request('POST', `/api/questions/recycle-bin/${firstId}/restore`);
    assert.equal(restored.status, 200);
  });

  it('blueprint generate is reproducible with fixed seed', async () => {
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
    assert.equal(gen1.status, 200);
    assert.equal(gen2.status, 200);
    assert.deepEqual(gen1.data.questionIds, gen2.data.questionIds);
    assert.ok(gen1.data.questionIds.length >= 1);

    const exportRes = await client.request('POST', '/api/questions/export/latex', {
      body: {
        questionIds: gen1.data.questionIds,
        blueprintId,
        paperId: gen1.data.paperId,
        metadata: { exportMode: 'both' },
      },
      json: true,
    });
    assert.equal(exportRes.status, 200);
    assert.ok(Buffer.isBuffer(exportRes.data));
    const zipText = exportRes.data.toString('binary');
    assert.ok(zipText.includes('mathexam.sty'));
    assert.ok(zipText.includes('.tex'));

    const parser = new LatexParser();
    const sample = gen1.data.questions[0]?.originalLaTeX || gen1.data.questions[0]?.questionText;
    if (sample && sample.includes('\\begin{problem}')) {
      const parsed = parser.parse(sample);
      assert.ok(parsed.length >= 1);
    }
  });
});
