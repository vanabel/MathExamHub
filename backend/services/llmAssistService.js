const { normalizeDifficulty } = require('../constants/difficulty');

async function suggestQuestionMetadata(input, settings) {
  const provider = settings?.llmProvider || 'mock';
  if (provider === 'mock') {
    return suggestWithMock(input);
  }
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return suggestWithMock(input);
  }
  return null;
}

function suggestWithMock(input) {
  const text = String(input.questionText || '');
  let difficulty = '中';
  if (/证明|推导/.test(text)) difficulty = '难';
  if (/判断|是否/.test(text)) difficulty = '易';

  const kps = input.knowledgePoints || [];
  let knowledgePointIds = [];
  if (kps.length) {
    const subject = input.subject || '';
    const match = kps.find((k) => !subject || String(k.path || k.name || '').includes(subject)) || kps[0];
    if (match?._id) knowledgePointIds = [String(match._id)];
  }

  return {
    difficulty: normalizeDifficulty(difficulty, '中'),
    knowledgePointIds,
    source: 'mock',
  };
}

module.exports = {
  suggestQuestionMetadata,
};
