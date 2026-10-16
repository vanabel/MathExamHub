const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const mongoose = require('mongoose');

const dupModule = require('../utils/duplicateDetector');
const origDetectDup = dupModule.detectDuplicatesInBatch;
dupModule.detectDuplicatesInBatch = async (questions) => ({
  duplicates: [],
  questions,
});

const platformSettingsService = require('../services/platformSettingsService');
const origGetPlatformSettings = platformSettingsService.getPlatformSettings;
platformSettingsService.getPlatformSettings = async () => ({ llmAssistEnabled: false });

const registerLatexImportRoutes = require('../routes/latexImport');
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');

const fixturePath = path.join(__dirname, 'fixtures/package-examples.tex');
const bankId = new mongoose.Types.ObjectId();

describe('latexImport routes', () => {
  let server;
  let baseUrl;
  let origBankFind;
  let origQuestionFindOne;
  let savedDocs;

  before(async () => {
    origBankFind = QuestionBank.findById.bind(QuestionBank);
    QuestionBank.findById = (id) => {
      if (id && String(id) === String(bankId)) {
        return {
          lean: async () => ({ latexExamMetadata: {} }),
          save: async () => {},
          latexExamMetadata: {},
        };
      }
      return origBankFind(id);
    };

    origQuestionFindOne = Question.findOne.bind(Question);
    Question.findOne = () => ({
      select: () => ({
        lean: async () => null,
      }),
    });

    savedDocs = [];
    Question.prototype.save = async function saveStub() {
      savedDocs.push(this);
      this._id = this._id || new mongoose.Types.ObjectId();
      return this;
    };

    const app = express();
    const router = express.Router();
    registerLatexImportRoutes(router, {
      requireBankWrite: (req, res, next) => {
        req.bankId = bankId;
        req.user = { username: 'route-test' };
        next();
      },
      attachLlmSuggestions: async (questions) => ({
        llmSuggestions: questions.map((q, i) => ({
          difficulty: i === 0 ? '难' : '中',
          knowledgePointIds: ['kp-mock'],
          source: 'mock-route',
        })),
        knowledgePoints: [{ _id: 'kp-mock', path: '几何/测试' }],
        llmPreviewCap: 20,
        llmPreviewProcessed: questions.length,
        llmPreviewTruncated: false,
      }),
    });
    app.use(express.json());
    app.use('/questions', router);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    platformSettingsService.getPlatformSettings = origGetPlatformSettings;
    QuestionBank.findById = origBankFind;
    Question.findOne = origQuestionFindOne;
    dupModule.detectDuplicatesInBatch = origDetectDup;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('preview returns llmSuggestions when llmPreview=true', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(fixturePath), {
      filename: 'package-examples.tex',
      contentType: 'text/plain',
    });
    form.append('checkDuplicates', 'false');
    form.append('llmPreview', 'true');
    const res = await axios.post(`${baseUrl}/questions/import/latex/preview`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      validateStatus: () => true,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.llmSuggestions));
    assert.ok(res.data.llmSuggestions.length > 0);
    assert.equal(res.data.llmSuggestions[0].difficulty, '难');
    assert.equal(res.data.llmPreviewProcessed, res.data.questions.length);
  });

  it('import applies metadataOverrides', async () => {
    savedDocs.length = 0;
    const form = new FormData();
    form.append('file', fs.createReadStream(fixturePath), {
      filename: 'package-examples.tex',
      contentType: 'text/plain',
    });
    form.append('skipDuplicates', 'true');
    form.append('checkDuplicates', 'false');
    form.append('applyBankMetadata', 'false');
    const overrides = [{ difficulty: '易', knowledgePointIds: ['507f1f77bcf86cd799439099'] }];
    form.append('metadataOverrides', JSON.stringify(overrides));
    const res = await axios.post(`${baseUrl}/questions/import/latex`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      validateStatus: () => true,
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(res.data.imported >= 1);
    assert.equal(savedDocs[0].difficulty, '易');
    assert.deepEqual(savedDocs[0].knowledgePointIds.map(String), ['507f1f77bcf86cd799439099']);
  });
});
