<template>
  <div class="llm-kp-panel border rounded p-3 bg-light">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
      <strong><i class="bi bi-stars"></i> LLM 建议知识点</strong>
      <div class="d-flex gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          data-testid="llm-kp-suggest-btn"
          :disabled="loading || !questionIds.length"
          @click="fetchSuggestions"
        >
          {{ loading ? '分析中…' : '获取建议' }}
        </button>
        <button
          v-if="rows.length"
          type="button"
          class="btn btn-sm btn-primary"
          data-testid="llm-kp-apply-btn"
          :disabled="applying || !acceptedCount"
          @click="applyAccepted"
        >
          {{ applying ? '应用中…' : `确认应用 (${acceptedCount})` }}
        </button>
      </div>
    </div>

    <p v-if="error" class="text-danger small mb-2">{{ error }}</p>
    <p v-if="!questionIds.length" class="text-muted small mb-0">请先选择题目。</p>

    <div v-if="rows.length" class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>题目</th>
            <th>建议（勾选后应用）</th>
            <th>来源</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.questionId">
            <td class="small text-muted">{{ row.questionId.slice(-6) }} · {{ row.type }}</td>
            <td>
              <div v-for="s in row.suggestions" :key="s.knowledgePointId" class="form-check form-check-sm">
                <input
                  :id="`kp-${row.questionId}-${s.knowledgePointId}`"
                  v-model="row.accepted"
                  class="form-check-input"
                  type="checkbox"
                  :value="s.knowledgePointId"
                />
                <label class="form-check-label small" :for="`kp-${row.questionId}-${s.knowledgePointId}`">
                  {{ s.path || s.knowledgePointId }}
                  <span class="text-muted">({{ Math.round(s.confidence * 100) }}%)</span>
                  — {{ s.reason }}
                </label>
              </div>
              <span v-if="!row.suggestions.length" class="text-muted small">无建议</span>
              <span v-if="row.llmError" class="text-warning small d-block">{{ row.llmError }}</span>
            </td>
            <td class="small">{{ row.source }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'LlmKpSuggestPanel',
  props: {
    questionIds: { type: Array, default: () => [] },
  },
  emits: ['applied'],
  data() {
    return {
      loading: false,
      applying: false,
      error: '',
      rows: [],
    };
  },
  computed: {
    acceptedCount() {
      return this.rows.reduce((n, r) => n + (r.accepted?.length || 0), 0);
    },
  },
  watch: {
    questionIds: {
      handler() {
        this.rows = [];
        this.error = '';
      },
      deep: true,
    },
  },
  methods: {
    async fetchSuggestions() {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await axios.post('/questions/llm-tag-knowledge-points', {
          questionIds: this.questionIds,
        });
        this.rows = (data.suggestions || []).map((s) => ({
          ...s,
          accepted: (s.suggestions || [])
            .map((x) => x.knowledgePointId)
            .filter((id) => !(s.currentKnowledgePointIds || []).includes(id)),
        }));
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '获取建议失败';
      } finally {
        this.loading = false;
      }
    },
    async applyAccepted() {
      this.applying = true;
      this.error = '';
      try {
        const updates = this.rows
          .filter((r) => r.accepted?.length)
          .map((r) => ({
            questionId: r.questionId,
            knowledgePointIds: r.accepted,
          }));
        await axios.post('/questions/llm-apply-knowledge-points', { updates });
        this.$emit('applied');
        await this.fetchSuggestions();
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '应用失败';
      } finally {
        this.applying = false;
      }
    },
  },
};
</script>
