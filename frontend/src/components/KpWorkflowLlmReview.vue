<template>
  <div class="card mb-3">
    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span>步骤 2：LLM 自动打标（可选）</span>
      <div class="d-flex gap-2 flex-wrap">
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          data-testid="kp-workflow-llm-fetch"
          :disabled="loading || !subject.trim()"
          @click="fetchSuggestions"
        >
          {{ loading ? '分析中…' : '生成建议' }}
        </button>
        <button
          v-if="rows.length"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="acceptAll"
        >
          全部接受
        </button>
        <button
          v-if="rows.length"
          type="button"
          class="btn btn-sm btn-primary"
          data-testid="kp-workflow-llm-apply"
          :disabled="applying || !pendingApplyCount"
          @click="applyAccepted"
        >
          {{ applying ? '写入中…' : `确认写入 (${pendingApplyCount})` }}
        </button>
      </div>
    </div>
    <div class="card-body">
      <div class="row g-3 mb-3">
        <div class="col-md-3">
          <label class="form-label small">每题知识点数 (1–3)</label>
          <input v-model.number="maxKpsPerQuestion" type="number" min="1" max="3" class="form-control form-control-sm" />
        </div>
        <div class="col-md-3">
          <label class="form-label small">额外 KP 最低置信度</label>
          <input v-model.number="extraMinConfidence" type="number" min="0" max="1" step="0.05" class="form-control form-control-sm" />
        </div>
        <div class="col-md-6 d-flex align-items-end">
          <div class="form-check">
            <input id="includeTagged" v-model="includeTagged" class="form-check-input" type="checkbox" />
            <label class="form-check-label small" for="includeTagged">包含已有知识点的题目</label>
          </div>
        </div>
      </div>
      <p v-if="error" class="text-danger small">{{ error }}</p>
      <p v-if="summary" class="small text-muted">{{ summary }}</p>

      <div v-if="rows.length" class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>题目</th>
              <th>接受的知识点</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.questionId" :class="{ 'table-secondary': row.rejected }">
              <td class="small">
                <div>{{ row.questionPreview || row.questionId.slice(-8) }}</div>
                <div class="text-muted">{{ row.type }} · {{ row.subject || '—' }}</div>
              </td>
              <td>
                <div v-if="!row.rejected && row.suggestions.length" class="d-flex flex-column gap-1">
                  <div v-for="s in row.suggestions" :key="s.knowledgePointId" class="form-check">
                    <input
                      :id="`acc-${row.questionId}-${s.knowledgePointId}`"
                      v-model="row.acceptedIds"
                      class="form-check-input"
                      type="checkbox"
                      :value="s.knowledgePointId"
                    />
                    <label class="form-check-label small" :for="`acc-${row.questionId}-${s.knowledgePointId}`">
                      {{ s.path || s.knowledgePointId }}
                      <span class="badge text-bg-light border ms-1">llm {{ Math.round((s.confidence || 0) * 100) }}%</span>
                    </label>
                  </div>
                  <select
                    v-model="row.manualExtraId"
                    class="form-select form-select-sm mt-1"
                    @change="addManualPick(row)"
                  >
                    <option value="">手动改选…</option>
                    <option v-for="kp in kpOptions" :key="kp.id" :value="kp.id">{{ kp.path }}</option>
                  </select>
                </div>
                <span v-else-if="row.rejected" class="text-muted small">已拒绝</span>
                <span v-else class="text-muted small">无建议</span>
                <span v-if="row.llmError" class="text-warning small d-block">{{ row.llmError }}</span>
              </td>
              <td class="text-nowrap">
                <button type="button" class="btn btn-sm btn-link" @click="row.rejected = false">恢复</button>
                <button type="button" class="btn btn-sm btn-link text-danger" @click="rejectRow(row)">拒绝</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'KpWorkflowLlmReview',
  props: {
    subject: { type: String, required: true },
    kpTree: { type: Array, default: () => [] },
  },
  emits: ['applied'],
  data() {
    return {
      maxKpsPerQuestion: 1,
      extraMinConfidence: 0.85,
      includeTagged: false,
      loading: false,
      applying: false,
      error: '',
      summary: '',
      rows: [],
    };
  },
  computed: {
    kpOptions() {
      return (this.kpTree || []).map((n) => ({
        id: String(n._id),
        path: n.path || n.name,
      }));
    },
    pendingApplyCount() {
      return this.rows.filter((r) => !r.rejected && r.acceptedIds?.length).length;
    },
  },
  methods: {
    rejectRow(row) {
      row.rejected = true;
      row.acceptedIds = [];
    },
    acceptAll() {
      for (const row of this.rows) {
        if (row.rejected) continue;
        row.acceptedIds = (row.suggestions || []).map((s) => s.knowledgePointId);
      }
    },
    addManualPick(row) {
      const id = row.manualExtraId;
      if (!id) return;
      if (!row.acceptedIds.includes(id)) row.acceptedIds.push(id);
      row.manualExtraId = '';
    },
    async fetchSuggestions() {
      this.loading = true;
      this.error = '';
      this.summary = '';
      try {
        const { data } = await axios.post('/questions/llm-tag-knowledge-points', {
          subject: this.subject.trim(),
          maxKpsPerQuestion: this.maxKpsPerQuestion,
          extraMinConfidence: this.extraMinConfidence,
          includeTagged: this.includeTagged,
        });
        this.rows = (data.suggestions || []).map((s) => ({
          ...s,
          rejected: false,
          acceptedIds: (s.suggestions || [])
            .map((x) => x.knowledgePointId)
            .filter((id) => !(s.currentKnowledgePointIds || []).includes(id)),
          manualExtraId: '',
        }));
        this.summary = `共 ${data.total} 题，${data.wouldAdd} 题有可写入建议（每题最多 ${data.options?.maxKpsPerQuestion ?? this.maxKpsPerQuestion} 个 KP）`;
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '生成建议失败';
      } finally {
        this.loading = false;
      }
    },
    async applyAccepted() {
      this.applying = true;
      this.error = '';
      try {
        const updates = this.rows
          .filter((r) => !r.rejected && r.acceptedIds?.length)
          .map((r) => {
            const acceptedSuggestions = (r.suggestions || []).filter(
              (s) => r.acceptedIds.includes(s.knowledgePointId),
            );
            const manualIds = r.acceptedIds.filter(
              (id) => !acceptedSuggestions.some((s) => s.knowledgePointId === id),
            );
            const existing = (r.currentKnowledgePointLinks || []).map((l) => ({
              knowledgePointId: String(l.knowledgePointId),
              source: l.source || 'manual',
              confidence: l.confidence,
            }));
            const byId = new Map(existing.map((l) => [l.knowledgePointId, l]));
            for (const s of acceptedSuggestions) {
              byId.set(s.knowledgePointId, {
                knowledgePointId: s.knowledgePointId,
                source: 'llm',
                confidence: s.confidence,
              });
            }
            for (const id of manualIds) {
              byId.set(id, { knowledgePointId: id, source: 'manual' });
            }
            const links = [...byId.values()];
            return {
              questionId: r.questionId,
              knowledgePointLinks: links,
            };
          });
        await axios.post('/questions/llm-apply-knowledge-points', { updates, replace: false });
        this.$emit('applied');
        this.summary = `已写入 ${updates.length} 题`;
        await this.fetchSuggestions();
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '写入失败';
      } finally {
        this.applying = false;
      }
    },
  },
};
</script>
