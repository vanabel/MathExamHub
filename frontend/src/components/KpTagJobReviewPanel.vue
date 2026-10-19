<template>
  <div class="card app-card mb-3" data-testid="kp-tag-job-review">
    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span>
        LLM 自动打标（仅未标注题目）
        <span v-if="job?._id" class="text-muted small ms-1">#{{ String(job._id).slice(-6) }}</span>
      </span>
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <span v-if="job" class="small text-muted" data-testid="kp-review-status-label">
          {{ job.processed }}/{{ job.total }} · {{ reviewStatusLabel }}
        </span>
        <span v-if="saveState === 'saving'" class="small text-muted">保存中…</span>
        <span v-if="saveState === 'saved'" class="small text-success">已保存</span>
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
          v-if="job && job.status === 'completed' && !job.appliedAt"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          data-testid="kp-tag-bulk-accept-all"
          @click="bulkAcceptAllSuggestions"
        >
          一键接受全部建议
        </button>
        <button
          v-if="job && job.status === 'completed' && !job.appliedAt"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="bulkAcceptHigh"
        >
          批量接受高置信度 (≥{{ Math.round(highConfidence * 100) }}%)
        </button>
        <button
          v-if="job && job.status === 'completed' && !job.appliedAt"
          type="button"
          class="btn btn-sm btn-primary"
          data-testid="kp-tag-job-apply"
          :disabled="applying || !acceptedCount"
          @click="applyAccepted"
        >
          {{ applying ? '写入中…' : `确认写入 (${acceptedCount})` }}
        </button>
        <button
          v-if="job && !job.appliedAt && !job.dismissedAt"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          data-testid="kp-tag-job-dismiss"
          @click="dismissJob"
        >
          关闭任务
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
      <p v-if="error" class="text-danger small" role="alert">{{ error }}</p>
      <p v-if="rowActionHint" class="small text-success mb-2" role="status" data-testid="kp-tag-row-feedback">{{ rowActionHint }}</p>
      <div v-if="job && job.status === 'running'" class="progress mb-3">
        <div
          class="progress-bar progress-bar-striped progress-bar-animated"
          :style="{ width: `${progressPct}%` }"
        ></div>
      </div>

      <p v-if="!job" class="text-muted small mb-0">填写科目并点击「后台打标」开始；完成后在此审核建议。</p>
      <p
        v-else-if="job.status === 'completed' && !displayRows.length"
        class="text-muted small mb-0"
        data-testid="kp-tag-review-empty"
      >
        本任务没有待审核条目（可能已全部处理或无匹配题目）。
      </p>

      <div v-if="displayRows.length" class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th scope="col">题干</th>
              <th scope="col">建议知识点</th>
              <th scope="col">操作</th>
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
                  class="form-select kp-tag-kp-select mb-1"
                  multiple
                  :size="Math.min(4, Math.max(2, kpOptions.length))"
                  :disabled="!!job?.appliedAt"
                  @change="onRowEdited(row)"
                >
                  <option v-for="kp in kpOptions" :key="kp.id" :value="kp.id">
                    {{ kp.path }}
                  </option>
                </select>
                <div v-for="s in row.suggestions" :key="s.knowledgePointId" class="small text-muted">
                  {{ s.path }} · {{ Math.round((s.confidence || 0) * 100) }}% — {{ s.reason }}
                </div>
              </td>
              <td>
                <div class="d-flex flex-wrap gap-2 kp-review-row-actions">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    :disabled="!!job?.appliedAt"
                    aria-label="接受本题建议"
                    @click="setStatus(row, 'accepted')"
                  >接受</button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="!!job?.appliedAt"
                    aria-label="拒绝本题建议"
                    @click="setStatus(row, 'rejected')"
                  >拒绝</button>
                </div>
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
    jobId: { type: String, default: '' },
    autoLoadLatest: { type: Boolean, default: false },
  },
  emits: ['applied', 'job-loaded', 'job-started'],
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
      saveTimer: null,
      saveState: '',
      rowActionHint: '',
      rowActionTimer: null,
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
    pendingReviewCount() {
      return this.localRows.filter((r) => r.status === 'pending').length;
    },
    reviewStatusLabel() {
      if (!this.job) return '';
      if (this.job.dismissedAt) return '已关闭';
      if (this.job.appliedAt) return '已写入题库';
      if (this.job.status === 'completed' && this.pendingReviewCount > 0) {
        return `LLM 已完成 · 待审核 ${this.pendingReviewCount}`;
      }
      if (this.job.status === 'completed') return 'LLM 已完成 · 无待审';
      return this.job.status;
    },
    activeJobId() {
      return this.jobId || (this.job?._id ? String(this.job._id) : '');
    },
  },
  watch: {
    jobId: {
      immediate: true,
      handler(id) {
        if (id) this.loadJob(id);
      },
    },
    autoLoadLatest: {
      immediate: true,
      handler(on) {
        if (on && !this.jobId) this.tryLoadLatestOpen();
      },
    },
  },
  beforeUnmount() {
    this.stopPoll();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.rowActionTimer) clearTimeout(this.rowActionTimer);
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
    async tryLoadLatestOpen() {
      try {
        const { data } = await axios.get('/questions/kp-tag-jobs/latest-open', {
          params: { subject: this.subject.trim() || undefined },
        });
        if (data.job?._id) await this.loadJob(String(data.job._id));
      } catch {
        /* no open job */
      }
    },
    async loadJob(id) {
      this.error = '';
      try {
        const { data } = await axios.get(`/questions/kp-tag-jobs/${id}`);
        this.job = data;
        this.syncRowsFromJob(data);
        this.$emit('job-loaded', data);
        if (data.status === 'running' || data.status === 'queued') {
          this.startPoll(id);
        } else {
          this.stopPoll();
        }
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      }
    },
    schedulePersist() {
      if (!this.activeJobId || this.job?.appliedAt) return;
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.persistReview(), 450);
    },
    async persistReview() {
      if (!this.activeJobId || this.job?.appliedAt) return;
      this.saveState = 'saving';
      try {
        const { data } = await axios.patch(`/questions/kp-tag-jobs/${this.activeJobId}/review`, {
          rows: this.localRows.map((r) => ({
            questionId: r.questionId,
            status: r.status,
            acceptedKnowledgePointIds: r.acceptedKnowledgePointIds,
          })),
        });
        this.job = data;
        this.saveState = 'saved';
        setTimeout(() => { this.saveState = ''; }, 2000);
      } catch (e) {
        this.saveState = '';
        this.error = e.response?.data?.error || e.message;
      }
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
        this.$emit('job-started', data.jobId);
        await this.loadJob(data.jobId);
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
    flashRowAction(text) {
      this.rowActionHint = text;
      if (this.rowActionTimer) clearTimeout(this.rowActionTimer);
      this.rowActionTimer = setTimeout(() => { this.rowActionHint = ''; }, 2500);
    },
    setStatus(row, status) {
      row.status = status;
      if (status === 'accepted' && !row.acceptedKnowledgePointIds?.length) {
        row.acceptedKnowledgePointIds = (row.suggestions || []).map((s) => s.knowledgePointId);
      }
      if (status === 'rejected') row.acceptedKnowledgePointIds = [];
      this.flashRowAction(status === 'accepted' ? '已标记为接受，将自动保存' : '已标记为拒绝，将自动保存');
      this.schedulePersist();
    },
    onRowEdited(row) {
      row.status = 'edited';
      this.schedulePersist();
    },
    bulkAcceptHigh() {
      for (const row of this.localRows) {
        const high = (row.suggestions || []).filter((s) => (s.confidence || 0) >= this.highConfidence);
        if (high.length) {
          row.acceptedKnowledgePointIds = high.map((s) => s.knowledgePointId);
          row.status = 'accepted';
        }
      }
      this.flashRowAction('已批量接受高置信度建议');
      this.schedulePersist();
    },
    bulkAcceptAllSuggestions() {
      let n = 0;
      for (const row of this.localRows) {
        if (row.status !== 'pending') continue;
        const ids = (row.suggestions || []).map((s) => s.knowledgePointId).filter(Boolean);
        if (!ids.length) continue;
        row.acceptedKnowledgePointIds = ids;
        row.status = 'accepted';
        n += 1;
      }
      this.flashRowAction(n ? `已接受 ${n} 题的全部建议` : '没有可接受的待审条目');
      this.schedulePersist();
    },
    async dismissJob() {
      if (!this.activeJobId) return;
      if (!window.confirm('关闭后导航角标不再提醒；已写入前仍可在此查看记录。确定关闭？')) return;
      try {
        await axios.post(`/questions/kp-tag-jobs/${this.activeJobId}/dismiss`);
        await this.loadJob(this.activeJobId);
        this.$emit('applied');
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      }
    },
    async applyAccepted() {
      if (!this.activeJobId) return;
      this.applying = true;
      this.error = '';
      try {
        await this.persistReview();
        await axios.post(`/questions/kp-tag-jobs/${this.activeJobId}/apply`);
        await this.loadJob(this.activeJobId);
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

.kp-review-row-actions {
  min-width: 7rem;
}
</style>
