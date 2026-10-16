/**
 * Standalone: import mathexam fixture .tex → export ZIP → XeLaTeX compile.
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { ScenarioClient, startServer } = require('./httpClient');
const { hasXeLaTeX, compileExportZip } = require('./latexCompileHelper');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mathexam_latex_compile';
const port = Number(process.env.SCENARIO_PORT) || 3101;
const fixturePath = path.join(__dirname, '../fixtures/package-examples.tex');

async function run() {
  if (process.env.SKIP_LATEX_COMPILE === '1') {
    console.log('SKIP latex compile');
    return;
  }
  if (!hasXeLaTeX()) {
    console.error('xelatex not found; install texlive-xelatex');
    process.exit(1);
  }

  let serverProc;
  const username = `latex_compile_${Date.now()}`;
  const password = 'CompilePass123!';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    await mongoose.connection.db.dropDatabase();
    serverProc = await startServer(mongoUri, port);
    const client = new ScenarioClient(`http://127.0.0.1:${port}`);
    await client.register(username, password, `${username}@example.com`);
    await client.login(username, password);
    await client.loadDefaultBank();

    const imp = await client.importLatexFile(fixturePath, { skipDuplicates: false });
    assert.equal(imp.status, 200);

    const list = await client.request('GET', '/api/questions/list?limit=50');
    const ids = (list.data.questions || list.data || []).map((q) => q._id);
    assert.ok(ids.length >= 1);

    const exportRes = await client.request('POST', '/api/questions/export/latex', {
      body: {
        questionIds: ids,
        metadata: { exportMode: 'exam', includeAnswerSheet: true, course: '高等代数' },
      },
    });
    assert.equal(exportRes.status, 200);
    compileExportZip(exportRes.data);
    console.log('latexExportCompile: OK');
  } finally {
    if (serverProc) serverProc.kill('SIGKILL');
    await mongoose.disconnect().catch(() => {});
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
