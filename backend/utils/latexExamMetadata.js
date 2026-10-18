const { MATHEXAM_HEAD_MACROS } = require('./latexParser');

const HEAD_FIELD_MAP = {
  university: 'university',
  school: 'school',
  course: 'course',
  AorB: 'AorB',
  semester: 'semester',
  finalmiddle: 'finalmiddle',
  totaltime: 'totaltime',
  openclose: 'openclose',
  degree: 'degree',
  totalstu: 'totalstu',
  major: 'major',
  grade: 'grade',
  examiner: 'examiner',
  director: 'director',
  dean: 'dean',
};

function isEmptyValue(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

function normalizeDocumentMetadata(documentMetadata) {
  if (!documentMetadata) return {};
  const head = documentMetadata.head || {};
  const flat = {};
  for (const key of MATHEXAM_HEAD_MACROS) {
    if (!isEmptyValue(head[key])) {
      flat[key] = String(head[key]).trim();
    }
  }
  if (documentMetadata.packageOptions?.length) {
    flat.packageOptions = [...documentMetadata.packageOptions];
  }
  if (documentMetadata.preambleLines?.length) {
    flat.preambleLines = [...documentMetadata.preambleLines];
  }
  if (documentMetadata.documentClass) {
    flat.documentClass = documentMetadata.documentClass;
  }
  if (documentMetadata.documentClassOptions?.length) {
    flat.documentClassOptions = [...documentMetadata.documentClassOptions];
  }
  return flat;
}

/**
 * 仅填充 bank 上仍为空的字段（导入时调用）
 */
function fillBankLatexMetadata(bankDoc, documentMetadata) {
  const incoming = normalizeDocumentMetadata(documentMetadata);
  if (!bankDoc.latexExamMetadata) {
    bankDoc.latexExamMetadata = {};
  }
  const target = bankDoc.latexExamMetadata;
  let changed = false;

  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'packageOptions' || key === 'documentClassOptions' || key === 'preambleLines') {
      if ((!target[key] || target[key].length === 0) && value?.length) {
        target[key] = value;
        changed = true;
      }
      continue;
    }
    if (key === 'documentClass') {
      if (isEmptyValue(target.documentClass) && !isEmptyValue(value)) {
        target.documentClass = value;
        changed = true;
      }
      continue;
    }
    if (isEmptyValue(target[key]) && !isEmptyValue(value)) {
      target[key] = value;
      changed = true;
    }
  }
  return changed;
}

function layerToExportShape(layer) {
  if (!layer) return {};
  const out = {};
  for (const key of [...Object.keys(HEAD_FIELD_MAP), 'packageOptions', 'documentClass', 'documentClassOptions', 'preambleLines', 'exportMode']) {
    if (!isEmptyValue(layer[key])) {
      out[key] = layer[key];
    }
  }
  return out;
}

/**
 * 导出元数据优先级：表单 override > ExamPaper > ExamBlueprint > QuestionBank
 */
function resolveExportMetadata({ bank, blueprint, paper, form = {} }) {
  const merged = {
    ...layerToExportShape(bank?.latexExamMetadata),
    ...layerToExportShape(blueprint?.latexExamMetadata),
    ...layerToExportShape(paper?.latexExamMetadata),
    ...layerToExportShape(form),
  };

  const head = {};
  for (const [metaKey, headKey] of Object.entries(HEAD_FIELD_MAP)) {
    if (!isEmptyValue(merged[metaKey])) {
      head[headKey] = merged[metaKey];
    }
  }

  return {
    ...merged,
    head,
    packageOptions: merged.packageOptions || ['nospace'],
    preambleLines: merged.preambleLines || [],
  };
}

function metadataForExportForm(bank, documentMetadata) {
  return resolveExportMetadata({
    bank,
    form: normalizeDocumentMetadata(documentMetadata),
  });
}

module.exports = {
  fillBankLatexMetadata,
  resolveExportMetadata,
  metadataForExportForm,
  normalizeDocumentMetadata,
};
