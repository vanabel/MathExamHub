const REF_CMD_RE = /\\(?:ref|cref|Cref|eqref|Ref|pageref)\{([^}]+)\}/gi;
const LABEL_RE = /\\label\{([^}]+)\}/g;

function collectLabelsFromTex(tex) {
  const labels = new Set();
  const s = String(tex || '');
  let m = LABEL_RE.exec(s);
  while (m) {
    labels.add(m[1].trim());
    m = LABEL_RE.exec(s);
  }
  LABEL_RE.lastIndex = 0;
  return labels;
}

function collectRefsFromTex(tex) {
  const refs = [];
  const s = String(tex || '');
  let m = REF_CMD_RE.exec(s);
  while (m) {
    refs.push(m[1].trim());
    m = REF_CMD_RE.exec(s);
  }
  REF_CMD_RE.lastIndex = 0;
  return refs;
}

function buildBankLabelSet(questions) {
  const labels = new Set();
  for (const q of questions || []) {
    for (const l of collectLabelsFromTex(q.originalLaTeX)) labels.add(l);
    for (const l of collectLabelsFromTex(q.questionText)) labels.add(l);
  }
  return labels;
}

function danglingRefsForQuestion(q, bankLabelSet) {
  const tex = `${q.originalLaTeX || ''}\n${q.questionText || ''}`;
  const refs = collectRefsFromTex(tex);
  return refs.filter((r) => r && !bankLabelSet.has(r));
}

module.exports = {
  collectLabelsFromTex,
  collectRefsFromTex,
  buildBankLabelSet,
  danglingRefsForQuestion,
};
