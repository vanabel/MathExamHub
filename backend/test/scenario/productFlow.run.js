const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { ScenarioClient, startServer } = require('./httpClient');
const { LatexParser } = require('../../utils/latexParser');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mathexam_scenario_test';
const port = Number(process.env.SCENARIO_PORT) || 3099;
const fixturePath = path.join(__dirname, '../fixtures/package-examples.tex');
const TYPE_PLAN = [
  ['判断题'],
  ['单选题'],
  ['填空题'],
  ['计算题', '解答题'],
];

function listRows(data) {
  return Array.isArray(data) ? data : data.questions;
}

function buildFourSectionBlueprint(rows) {
  const byType = {};
  for (const q of rows) {
    if (!byType[q.type]) byType[q.type] = q;
  }
  const sections = [];
  for (const group of TYPE_PLAN) {
    const type = group.find((t) => byType[t]);
    assert.ok(type, `missing types ${group.join(' / ')}; have ${Object.keys(byType).join(', ')}`);
    sections.push({
      type,
      count: 1,
      scoreEach: Number(byType[type].totalScore) || 4,
      difficultyMix: { 易: 0, 中: 0, 难: 0 },
    });
  }
  return {
    title: '场景四题型卷',
    totalScore: sections.reduce((s, x) => s + x.scoreEach, 0),
    randomSeed: 4242,
    allowRelaxation: true,
    maxVariantOverlapPct: 0.2,
    sections,
  };
}

function flatFromGenerate(data) {
  const byId = new Map((data.questions || []).map((q) => [String(q._id), q]));
  const flat = [];
  (data.sections || []).forEach((sec, sectionIndex) => {
    (sec.questionIds || []).forEach((id, slotIndex) => {
      const q = byId.get(String(id));
      if (q) flat.push({ ...q, sectionIndex, slotIndex });
    });
  });
  return flat;
}

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

    console.log('· platform admin API smoke');
    const denied = await client.request('GET', '/api/admin/stats');
    assert.equal(denied.status, 403);
    await User.findOneAndUpdate({ username }, { role: 'admin' });
    const stats = await client.request('GET', '/api/admin/stats');
    assert.equal(stats.status, 200, JSON.stringify(stats.data));
    assert.ok(typeof stats.data.userCount === 'number');
    const users = await client.request('GET', '/api/admin/users');
    assert.equal(users.status, 200);
    assert.ok(users.data.users?.some((u) => u.username === username));

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
    let list = await client.request('GET', '/api/questions/list');
    assert.equal(list.status, 200);
    let rows = listRows(list.data);
    const firstId = rows[0]._id;
    assert.ok(firstId);
    assert.equal((await client.request('DELETE', `/api/questions/${firstId}/delete`)).status, 200);
    const bin = await client.request('GET', '/api/questions/recycle-bin');
    assert.ok(bin.data.items.some((q) => String(q._id) === String(firstId)));
    assert.equal((await client.request('POST', `/api/questions/recycle-bin/${firstId}/restore`)).status, 200);

    list = await client.request('GET', '/api/questions/list');
    rows = listRows(list.data);

    console.log('· ensure four question types for blueprint');
    const requiredCreates = ['判断题', '单选题', '填空题', '计算题'];
    for (const type of requiredCreates) {
      if (!rows.some((q) => q.type === type)) {
        const created = await client.request('POST', '/api/questions/create', {
          body: {
            questionText: `场景测试占位题（${type}）${Date.now()}`,
            type,
            totalScore: 4,
            difficulty: '中',
            subject: '高等代数',
            correctAnswer: type === '判断题' ? true : '略',
            ...(type === '单选题' ? { options: { A: '1', B: '2', C: '3', D: '4' } } : {}),
          },
        });
        assert.ok(created.status === 201 || created.status === 200, JSON.stringify(created.data));
      }
    }
    list = await client.request('GET', '/api/questions/list');
    rows = listRows(list.data);
    const missingTypes = requiredCreates.filter((t) => !rows.some((q) => q.type === t));
    assert.equal(missingTypes.length, 0, `after ensure missing: ${missingTypes.join(', ')}`);

    const fillSample = rows.find((q) => q.type === '填空题');
    const fillScore = Number(fillSample?.totalScore) || 4;
    while (rows.filter((q) => q.type === '填空题').length < 2) {
      const created = await client.request('POST', '/api/questions/create', {
        body: {
          questionText: `场景换题备用填空 ${Date.now()}`,
          type: '填空题',
          totalScore: fillScore,
          difficulty: fillSample?.difficulty || '中',
          subject: fillSample?.subject || '高等代数',
          correctAnswer: '略',
        },
      });
      assert.ok(created.status === 201 || created.status === 200);
      list = await client.request('GET', '/api/questions/list');
      rows = listRows(list.data);
    }

    console.log('· knowledge-point tree + section constraint');
    const kpRes = await client.request('POST', '/api/knowledge-points/', {
      body: { name: '场景章节', subject: '高等代数' },
    });
    assert.equal(kpRes.status, 201, JSON.stringify(kpRes.data));
    const kpId = kpRes.data._id;
    const fillForKp = rows.find((q) => q.type === '填空题');
    assert.ok(fillForKp);
    const tagKp = await client.request('PUT', `/api/questions/${fillForKp._id}/edit`, {
      body: { knowledgePointIds: [kpId] },
    });
    assert.equal(tagKp.status, 200);
    const kpOnlyBlueprint = {
      title: 'KP 约束卷',
      totalScore: 4,
      randomSeed: 777,
      allowRelaxation: true,
      sections: [{
        type: '填空题',
        count: 1,
        scoreEach: fillScore,
        difficultyMix: { 易: 0, 中: 0, 难: 0 },
        knowledgePointIds: [kpId],
      }],
    };
    const kpSaved = await client.request('POST', '/api/exam-blueprints', { body: kpOnlyBlueprint });
    assert.equal(kpSaved.status, 201);
    const kpGen = await client.request('POST', '/api/exams/generate', {
      body: { blueprintId: kpSaved.data._id },
    });
    assert.equal(kpGen.status, 200, JSON.stringify(kpGen.data));
    assert.equal(kpGen.data.questionIds?.length, 1);
    assert.equal(String(kpGen.data.questions[0]._id), String(fillForKp._id));

    console.log('· blueprint template library clone');
    const blueprintBody = buildFourSectionBlueprint(rows);
    const tpl = await client.request('POST', '/api/exam-blueprints', {
      body: {
        ...blueprintBody,
        title: '场景四题型模板',
        isTemplate: true,
        sharedWithBank: true,
      },
    });
    assert.equal(tpl.status, 201);
    const library = await client.request('GET', '/api/exam-blueprints/library');
    assert.equal(library.status, 200);
    assert.ok(library.data.some((b) => String(b._id) === String(tpl.data._id)));
    const cloned = await client.request('POST', `/api/exam-blueprints/${tpl.data._id}/clone`, {
      body: { title: '从模板克隆' },
    });
    assert.equal(cloned.status, 201);
    assert.equal(cloned.data.clonedFromId, tpl.data._id);

    console.log('· four-section blueprint generate');
    const saved = await client.request('POST', '/api/exam-blueprints', { body: blueprintBody });
    assert.equal(saved.status, 201);
    const blueprintId = saved.data._id;
    const gen1 = await client.request('POST', '/api/exams/generate', { body: { blueprintId } });
    const gen2 = await client.request('POST', '/api/exams/generate', { body: { blueprintId } });
    assert.equal(gen1.status, 200, JSON.stringify(gen1.data));
    assert.equal(gen2.status, 200);
    assert.deepEqual(gen1.data.questionIds, gen2.data.questionIds);
    assert.ok(gen1.data.questionIds?.length >= 4, JSON.stringify(gen1.data));

    console.log('· swap-question API');
    const flat = flatFromGenerate(gen1.data);
    assert.ok(flat.length >= 1);
    const target = flat.find((q) => q.type === '填空题') || flat[0];
    const swap = await client.request('POST', '/api/exams/swap-question', {
      body: {
        blueprintId,
        sectionIndex: target.sectionIndex,
        replaceQuestionId: target._id,
        occupiedQuestionIds: gen1.data.questionIds.filter((id) => String(id) !== String(target._id)),
        randomSeed: 999,
      },
    });
    assert.equal(swap.status, 200, JSON.stringify(swap.data));
    assert.ok(swap.data.replacement?._id);
    assert.notEqual(String(swap.data.replacement._id), String(target._id));

    console.log('· relaxation reporting');
    const fillCount = rows.filter((q) => q.type === '填空题').length;
    const relaxSaved = await client.request('POST', '/api/exam-blueprints', {
      body: {
        title: '场景放宽测试',
        randomSeed: 31337,
        allowRelaxation: true,
        sections: [{
          type: '填空题',
          count: Math.max(fillCount + 5, 12),
          scoreEach: fillScore,
          difficultyMix: { 易: 0, 中: 0, 难: 0 },
        }],
      },
    });
    assert.equal(relaxSaved.status, 201);
    const relaxGen = await client.request('POST', '/api/exams/generate', {
      body: { blueprintId: relaxSaved.data._id },
    });
    assert.equal(relaxGen.status, 200, JSON.stringify(relaxGen.data));
    assert.ok(
      (relaxGen.data.relaxations || []).length > 0,
      `expected relaxations: ${JSON.stringify(relaxGen.data)}`,
    );

    console.log('· A/B variants');
    const ab = await client.request('POST', '/api/exams/generate-variants', {
      body: { blueprintId, maxVariantOverlapPct: 0.2 },
    });
    assert.equal(ab.status, 200, JSON.stringify(ab.data));
    assert.ok(ab.data.variants?.A?.paperId);
    assert.ok(ab.data.variants?.B?.paperId);
    assert.ok(typeof ab.data.overlapRatio === 'number');
    assert.ok(ab.data.overlapRatio <= 0.2 || (ab.data.warnings || []).length > 0);

    console.log('· strict A/B overlap (large pool, no overlap warning)');
    const expandTypes = [
      { type: '判断题', totalScore: 2, correctAnswer: true },
      { type: '单选题', totalScore: 2, correctAnswer: 'A', options: { A: '1', B: '2', C: '3', D: '4' } },
      { type: '填空题', totalScore: fillScore, correctAnswer: '略' },
      { type: '计算题', totalScore: 10, correctAnswer: '略' },
    ];
    for (const spec of expandTypes) {
      for (let i = 0; i < 12; i += 1) {
        const extra = await client.request('POST', '/api/questions/create', {
          body: {
            questionText: `场景扩池 ${spec.type} ${i}-${Date.now()}`,
            type: spec.type,
            totalScore: spec.totalScore,
            difficulty: '中',
            subject: '高等代数',
            correctAnswer: spec.correctAnswer,
            ...(spec.options ? { options: spec.options } : {}),
          },
        });
        assert.ok(extra.status === 201 || extra.status === 200);
      }
    }
    const abStrict = await client.request('POST', '/api/exams/generate-variants', {
      body: { blueprintId, maxVariantOverlapPct: 0.2, seedA: 88001, seedB: 99001 },
    });
    assert.equal(abStrict.status, 200, JSON.stringify(abStrict.data));
    assert.ok(abStrict.data.overlapRatio <= 0.2, JSON.stringify(abStrict.data));
    const overlapWarn = (abStrict.data.warnings || []).some(
      (w) => String(w).includes('重合率') && String(w).includes('高于'),
    );
    assert.equal(overlapWarn, false, JSON.stringify(abStrict.data.warnings));

    console.log('· export ZIP');
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
  console.error('Scenario timed out after 120s');
  process.exit(1);
}, 120000);

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
