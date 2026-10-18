const express = require('express');
const multer = require('multer');
const KnowledgePoint = require('../models/KnowledgePoint');
const { parseKpExcelBuffer } = require('../utils/kpExcelParse');
const { buildKpExcelWorkbook } = require('../utils/kpExcelExport');
const { diffKpImport, mergeKpImport } = require('../services/kpGraphMergeService');
const Question = require('../models/Question');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const { buildKnowledgePointPath } = require('../utils/knowledgePointPath');
const { getSubtreeNodeIds } = require('../utils/knowledgePointTree');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(requireAuth);
router.use(bankContext);

router.post('/import/preview', requireBankWrite, upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: '请上传 Excel 文件（.xls/.xlsx）' });
    }
    const parsed = parseKpExcelBuffer(req.file.buffer);
    const subject = req.body?.subject?.trim() || parsed.subject;
    const diff = await diffKpImport(req.bankId, subject, parsed.nodes);
    const nameSet = new Set(parsed.nodes.map((n) => n.name));
    const unresolvedRelationNames = [];
    for (const node of parsed.nodes) {
      for (const name of [...node.prerequisiteNames, ...node.successorNames, ...node.relatedNames]) {
        if (name && !nameSet.has(name)) unresolvedRelationNames.push({ path: node.path, name });
      }
    }
    res.json({
      dryRun: true,
      fileName: req.file.originalname,
      title: parsed.title,
      subject,
      treePreview: parsed.nodes.slice(0, 40).map((n) => ({
        path: n.path,
        tags: n.tags,
        name: n.name,
      })),
      unresolvedRelationNames: unresolvedRelationNames.slice(0, 50),
      diff: {
        totalParsed: diff.totalParsed,
        existingCount: diff.existingCount,
        toCreate: diff.toCreate,
        toUpdate: diff.toUpdate,
        unchanged: diff.unchanged,
        preview: diff.preview,
      },
    });
  } catch (error) {
    console.error('KP import preview failed', error);
    res.status(400).json({ error: error.message || '预览失败' });
  }
});

router.post('/import/apply', requireBankWrite, upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: '请上传 Excel 文件（.xls/.xlsx）' });
    }
    const parsed = parseKpExcelBuffer(req.file.buffer);
    const subject = req.body?.subject?.trim() || parsed.subject;
    const result = await mergeKpImport(req.bankId, subject, parsed.nodes);
    res.json({
      dryRun: false,
      subject,
      ...result,
    });
  } catch (error) {
    console.error('KP import apply failed', error);
    res.status(400).json({ error: error.message || '导入失败' });
  }
});

router.get('/export/excel', requireBankWrite, async (req, res) => {
  try {
    const subject = String(req.query.subject || '').trim();
    if (!subject) {
      return res.status(400).json({ error: 'subject 查询参数必填' });
    }
    const nodes = await KnowledgePoint.find({ bankId: req.bankId, subject })
      .sort({ path: 1, order: 1 })
      .lean();
    const buffer = buildKpExcelWorkbook({
      subject,
      title: `${subject}课程知识点`,
      nodes,
    });
    const fileName = encodeURIComponent(`${subject}-课程知识点.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    res.send(buffer);
  } catch (error) {
    console.error('KP export failed', error);
    res.status(500).json({ error: '导出失败' });
  }
});

router.get('/tree', async (req, res) => {
  try {
    const { subject } = req.query;
    const query = { bankId: req.bankId };
    if (subject) query.subject = String(subject).trim();
    const nodes = await KnowledgePoint.find(query).sort({ path: 1, order: 1 }).lean();
    res.json({ bankId: req.bankId, nodes });
  } catch (error) {
    console.error('获取知识点树失败:', error);
    res.status(500).json({ error: 'Failed to list knowledge points' });
  }
});

router.get('/:id/subtree-ids', async (req, res) => {
  try {
    const ids = await getSubtreeNodeIds(req.bankId, req.params.id);
    res.json({ ids });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve subtree' });
  }
});

router.post('/', requireBankWrite, async (req, res) => {
  try {
    const { name, subject, parentId, order } = req.body;
    if (!name || !subject) {
      return res.status(400).json({ error: 'name 与 subject 为必填' });
    }

    let path;
    if (parentId) {
      const parent = await KnowledgePoint.findOne({ _id: parentId, bankId: req.bankId });
      if (!parent) {
        return res.status(404).json({ error: '父节点不存在或不属于当前题库' });
      }
      if (parent.subject !== subject) {
        return res.status(400).json({ error: '父节点科目与 subject 不一致' });
      }
      path = buildKnowledgePointPath(parent.path, name);
    } else {
      path = buildKnowledgePointPath(null, name);
    }

    const node = await KnowledgePoint.create({
      bankId: req.bankId,
      name: String(name).trim(),
      subject: String(subject).trim(),
      parentId: parentId || null,
      path,
      order: order != null ? Number(order) : 0,
    });
    res.status(201).json(node);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: '同题库下 path 已存在' });
    }
    console.error('创建知识点失败:', error);
    res.status(500).json({ error: 'Failed to create knowledge point' });
  }
});

router.put('/:id', requireBankWrite, async (req, res) => {
  try {
    const node = await KnowledgePoint.findOne({ _id: req.params.id, bankId: req.bankId });
    if (!node) {
      return res.status(404).json({ error: '节点不存在' });
    }

    const { name, order } = req.body;
    if (name != null && String(name).trim() !== node.name) {
      const parent = node.parentId
        ? await KnowledgePoint.findOne({ _id: node.parentId, bankId: req.bankId })
        : null;
      node.name = String(name).trim();
      node.path = buildKnowledgePointPath(parent?.path, node.name);
    }
    if (order != null) node.order = Number(order);
    await node.save();
    res.json(node);
  } catch (error) {
    console.error('更新知识点失败:', error);
    res.status(500).json({ error: 'Failed to update knowledge point' });
  }
});

router.delete('/:id', requireBankWrite, async (req, res) => {
  try {
    const id = req.params.id;
    const childCount = await KnowledgePoint.countDocuments({ parentId: id, bankId: req.bankId });
    if (childCount > 0) {
      return res.status(409).json({ error: '存在子节点，无法删除' });
    }
    const used = await Question.countDocuments(activeQuestionFilter({
      knowledgePointIds: id,
      bankId: req.bankId,
    }));
    if (used > 0) {
      return res.status(409).json({ error: '仍有题目引用该知识点' });
    }
    const deleted = await KnowledgePoint.findOneAndDelete({ _id: id, bankId: req.bankId });
    if (!deleted) {
      return res.status(404).json({ error: '节点不存在' });
    }
    res.json({ message: '已删除', id });
  } catch (error) {
    console.error('删除知识点失败:', error);
    res.status(500).json({ error: 'Failed to delete knowledge point' });
  }
});

module.exports = router;
