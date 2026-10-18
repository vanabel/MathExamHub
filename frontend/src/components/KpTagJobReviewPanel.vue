<template>
  <div class="card mb-3" data-testid="kp-tag-job-review">
    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span>LLM 自动打标（仅未标注题目）</span>
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <span v-if="job" class="small text-muted">
          {{ job.processed }}/{{ job.total }} · {{ job.status }}
        </span>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          data-testid="kp-tag-job-start"
          :disabled="starting || !subject.trim() || (job && job.status === 'running')"
          @click="startJob"
        >
          {{ starting ? '启动中…' : '后台打标' }}
        </button>
        <button
          v-if="job && job.status === 'completed'"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="bulkAcceptHigh"
        >
          批量接受高置信度 (≥{{ Math.round(highConfidence * 100) }}%)
        </button>
        <button
          v-if="job && job.status === 'completed'"
          type="button"
          class="btn btn-sm btn-primary"
          data-testid="kp-tag-job-apply"
          :disabled="applying || !acceptedCount"
          @click="applyAccepted"
        >
          {{ applying ? '写入中…' : `确认写入 (${acceptedCount})` }}
        </button>
      </div>
    </div>
    <div class="card-body">
      <div class="row g-2 mb-3">
        <div class="col-md-2">
          <label class="form-label small">每题 KP (1–3)</label>
          <input v-model.number="maxKps" type="number" min="1" max="3" class="form-control form-control-sm" />
        </div>
        <div class="col-md-2">
          <label class="form-label small">额外 KP 置信度</label>
          <input v-model.number="extraMinConfidence" type="number" step="0.05" min="0" max="1" class="form-control form-control-sm" />
        </div>
      </div>
      <p v-if="error" class="text-danger small">{{ error }}</p>
      <div v-if="job && job.status === 'running'" class="progress mb-3">
        <div
          class="progress-bar progress-bar-striped progress-bar-animated"
          :style="{ width: `${progressPct}%` }"
        ></div>
      </div>

      <div v-if="displayRows.length" class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>题干</th>
              <th>建议知识点</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in displayRows" :key="row.questionId" :class="rowClass(row)">
              <td class="small" style="max-width: 280px">
                <div class="kp-stem-preview" v-html="stemHtml(row.questionText)"></div>
              </td>
              <td>
                <select
                  v-model="row.acceptedKnowledgePointIds"
                  class="form-select form-select-sm mb-1"
                  multiple
                  size="3"
                  @change="markEdited(row)"
                >
                  <option v-for="kp in kpOptions" :key="kp.id" :value="kp.id">
                    {{ kp.path }}
                  </option>
                </select>
                <div v-for="s in row.suggestions" :key="s.knowledgePointId" class="small text-muted">
                  {{ s.path }} · {{ Math.round((s.confidence || 0) * 100) }}% — {{ s.reason }}
                </div>
              </td>
              <td class="text-nowrap">
                <button type="button" class="btn btn-link btn-sm p-0" @click="setStatus(row, 'accepted')">接受</button>
                <button type="button" class="btn btn-link btn-sm p-0 text-danger" @click="setStatus(row, 'rejected')">拒绝</button>
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
import { processQuestionTextToHTML } from '../utils/latexProcessor';

export default {
  name: 'KpTagJobReviewPanel',
  props: {
    subject: { type: String, required: true },
    kpTree: { type: Array, default: () => [] },
  },
  emits: ['applied'],
  data() {
    return {
      maxKps: 1,
      extraMinConfidence: 0.85,
      highConfidence: 0.85,
      job: null,
      localRows: [],
      pollTimer: null,
      starting: false,
      applying: false,
      error: '',
    };
  },
  computed: {
    kpOptions() {
      return (this.kpTree || []).map((n) => ({
        id: String(n._id),
        path: n.path || n.name,
      }));
    },
    displayRows() {
      return this.localRows;
    },
    progressPct() {
      if (!this.job?.total) return 0;
      return Math.min(100, Math.round((this.job.processed / this.job.total) * 100));
    },
    acceptedCount() {
      return this.localRows.filter((r) => r.status === 'accepted' || r.status === 'edited').length;
    },
  },
  beforeUnmount() {
    this.stopPoll();
  },
  methods: {
    stemHtml(text) {
      return processQuestionTextToHTML(String(text || '').slice(0, 400));
    },
    rowClass(row) {
      if (row.status === 'rejected') return 'table-secondary';
      if (row.status === 'accepted' || row.status === 'edited') return 'table-success';
      return '';
    },
    syncRowsFromJob(job) {
      this.localRows = (job.rows || []).map((r) => ({
        ...r,
        acceptedKnowledgePointIds: [...(r.acceptedKnowledgePointIds || [])],
      }));
    },
    async startJob() {
      this.starting = true;
      this.error = '';
      try {
        const { data } = await axios.post('/questions/kp-tag-jobs', {
          subject: this.subject.trim(),
          maxKpsPerQuestion: this.maxKps,
          extraMinConfidence: this.extraMinConfidence,
        });
        this.job = { _id: data.jobId, status: data.status, total: data.total, processed: 0, rows: [] };
        this.localRows = [];
        this.startPoll(data.jobId);
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      } finally {
        this.starting = false;
      }
    },
    startPoll(jobId) {
      this.stopPoll();
      const tick = async () => {
        try {
          const { data } = await axios.get(`/questions/kp-tag-jobs/${jobId}`);
          this.job = data;
          if (data.status === 'completed' || data.status === 'failed') {
            this.syncRowsFromJob(data);
            this.stopPoll();
          } else {
            this.job = data;
          }
        } catch (e) {
          this.error = e.response?.data?.error || e.message;
          this.stopPoll();
        }
      };
      tick();
      this.pollTimer = setInterval(tick, 2000);
    },
    stopPoll() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = null;
    },
    setStatus(row, status) {
      row.status = status;
      if (status === 'accepted' && !row.acceptedKnowledgePointIds?.length) {
        row.acceptedKnowledgePointIds = (row.suggestions || []).map((s) => s.knowledgePointId);
      }
      if (status === 'rejected') row.acceptedKnowledgePointIds = [];
    },
    markEdited(row) {
      row.status = 'edited';
    },
    bulkAcceptHigh() {
      for (const row of this.localRows) {
        const high = (row.suggestions || []).filter((s) => (s.confidence || 0) >= this.highConfidence);
        if (high.length) {
          row.acceptedKnowledgePointIds = high.map((s) => s.knowledgePointId);
          row.status = 'accepted';
        }
      }
    },
    async applyAccepted() {
      if (!this.job?._id) return;
      this.applying = true;
      this.error = '';
      try {
        await axios.patch(`/questions/kp-tag-jobs/${this.job._id}/review`, {
          rows: this.localRows.map((r) => ({
            questionId: r.questionId,
            status: r.status,
            acceptedKnowledgePointIds: r.acceptedKnowledgePointIds,
          })),
        });
        await axios.post(`/questions/kp-tag-jobs/${this.job._id}/apply`);
        this.$emit('applied');
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      } finally {
        this.applying = false;
      }
    },
  },
};
</script>

<style scoped>
.kp-stem-preview {
  max-height: 120px;
  overflow: auto;
}
</style>
