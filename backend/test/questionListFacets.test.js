const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const { buildQuestionListFilter, computeQuestionListFacets } = require('../utils/questionListQuery');
const { activeQuestionFilter } = require('../constants/questionLifecycle');

describe('computeQuestionListFacets', () => {
  it('returns grouped counts for subject, type, difficulty', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const origAggregate = Question.aggregate;
    const calls = [];
    Question.aggregate = async (pipeline) => {
      calls.push(pipeline);
      const group = pipeline.find((s) => s.$group)?.$group;
      if (group?._id === '$subject') {
        return [{ _id: '代数', count: 2 }, { _id: '几何', count: 1 }];
      }
      if (group?._id === '$type') {
        return [{ _id: '填空题', count: 3 }];
      }
      if (group?._id === '$difficulty') {
        return [{ _id: '中', count: 2 }, { _id: '易', count: 1 }];
      }
      return [];
    };
    try {
      const filter = buildQuestionListFilter({ bankId, query: {} });
      assert.deepEqual(filter, activeQuestionFilter({ bankId }));
      const facets = await computeQuestionListFacets(Question, filter);
      assert.equal(calls.length, 3);
      assert.deepEqual(facets.subject, [{ value: '代数', count: 2 }, { value: '几何', count: 1 }]);
      assert.deepEqual(facets.type, [{ value: '填空题', count: 3 }]);
      assert.deepEqual(facets.difficulty, [{ value: '中', count: 2 }, { value: '易', count: 1 }]);
    } finally {
      Question.aggregate = origAggregate;
    }
  });
});
