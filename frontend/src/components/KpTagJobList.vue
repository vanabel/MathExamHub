<template>
  <div class="card mb-3" data-testid="kp-tag-job-list">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>打标任务</span>
      <button type="button" class="btn btn-sm btn-link" @click="refresh">刷新</button>
    </div>
    <div class="card-body p-0">
      <p v-if="!jobs.length" class="small text-muted p-3 mb-0">暂无任务</p>
      <div v-else class="table-responsive">
        <table class="table table-sm mb-0">
          <thead>
            <tr>
              <th>科目</th>
              <th>状态</th>
              <th>创建</th>
              <th>审核</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="j in jobs"
              :key="j._id"
              class="kp-job-row"
              :class="{ 'table-active': j._id === selectedJobId }"
              @click="$emit('select', j._id)"
            >
              <td class="small">{{ j.subject || '—' }}</td>
              <td class="small">
                <span data-testid="kp-job-status-label">{{ jobStatusLabel(j) }}</span>
              </td>
              <td class="small text-muted">{{ formatDate(j.createdAt) }}</td>
              <td class="small">
                <span
                  v-if="j.reviewCounts.pending > 0"
                  class="badge text-bg-warning text-dark me-1"
                  data-testid="kp-job-pending-badge"
                >待审核 {{ j.reviewCounts.pending }}</span>
                接 {{ j.reviewCounts.accepted + j.reviewCounts.edited }} /
                拒 {{ j.reviewCounts.rejected }}
              </td>
              <td class="text-end">
                <router-link
                  v-if="j.reviewOpen"
                  class="btn btn-sm btn-outline-primary"
                  :to="`/knowledge-points/review/${j._id}`"
                  data-testid="kp-tag-job-open"
                  @click.stop
                >
                  审核
                </router-link>
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
  name: 'KpTagJobList',
  props: {
    selectedJobId: { type: String, default: '' },
  },
  emits: ['select'],
  data() {
    return {
      jobs: [],
    };
  },
  mounted() {
    this.refresh();
  },
  methods: {
    formatDate(iso) {
      if (!iso) return '';
      return new Date(iso).toLocaleString();
    },
    jobStatusLabel(j) {
      if (j.appliedAt) return '已写入题库';
      if (j.status === 'completed' && (j.reviewCounts?.pending || 0) > 0) {
        return `LLM 已完成 · 待审核 ${j.reviewCounts.pending}`;
      }
      if (j.status === 'completed') return 'LLM 已完成 · 无待审';
      if (j.status === 'running' || j.status === 'queued') return 'LLM 运行中';
      if (j.status === 'failed') return 'LLM 失败';
      return j.status || '—';
    },
    async refresh() {
      try {
        const { data } = await axios.get('/questions/kp-tag-jobs');
        this.jobs = data.jobs || [];
      } catch {
        this.jobs = [];
      }
    },
  },
};
</script>
