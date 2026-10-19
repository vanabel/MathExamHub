<template>
  <div class="app-page app-container container-xl py-4">
    <page-header
      title="重复题目审查"
      subtitle="当前题库内按 contentHash 精确重复与近似相似度分组（默认阈值 0.85）。"
      icon="bi-files"
      test-id="duplicates-header"
    />

    <div class="row g-2 align-items-end mb-4">
      <div class="col-auto">
        <label class="form-label">相似度阈值</label>
        <input v-model.number="threshold" type="number" min="0.5" max="1" step="0.05" class="form-control" />
      </div>
      <div class="col-auto">
        <button class="btn btn-primary" :disabled="loading" @click="loadDuplicates">
          {{ loading ? '检测中…' : '重新检测' }}
        </button>
      </div>
      <div class="col-auto">
        <button
          class="btn btn-outline-danger"
          :disabled="loading || totalGroups === 0"
          @click="confirmCleanup"
        >
          移入回收站（保留最早）
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="summary" class="alert alert-info">
      共 {{ summary.totalGroups }} 组、{{ summary.totalDuplicates }} 条重复记录
      （精确 hash {{ summary.exactGroupCount }} 组，近似 {{ summary.nearGroupCount }} 组）
    </div>

    <div v-for="group in duplicateGroups" :key="group.groupId" class="card mb-3">
      <div class="card-header d-flex justify-content-between">
        <span>
          组 #{{ group.groupId }}
          <span v-if="group.matchKind === 'exact_hash'" class="badge bg-success ms-2">精确 hash</span>
          <span v-else class="badge bg-warning text-dark ms-2">近似</span>
        </span>
        <small v-if="group.contentHash" class="text-muted font-monospace">{{ group.contentHash.slice(0, 12) }}…</small>
      </div>
      <ul class="list-group list-group-flush">
        <li
          v-for="q in group.questions"
          :key="q._id"
          class="list-group-item"
        >
          <div class="d-flex justify-content-between">
            <strong>{{ q.type }}</strong>
            <small>{{ formatDate(q.createdAt) }}</small>
          </div>
          <div class="small text-muted">{{ q.subject }}</div>
          <div class="mt-1 question-preview">{{ truncate(q.questionText) }}</div>
          <router-link :to="`/question-edit/${q._id}`" class="small">编辑</router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import PageHeader from '@/components/ui/PageHeader.vue';

export default {
  name: 'DuplicateReviewView',
  components: { PageHeader },
  data() {
    return {
      threshold: 0.85,
      loading: false,
      error: null,
      duplicateGroups: [],
      summary: null,
    };
  },
  computed: {
    totalGroups() {
      return this.duplicateGroups.length;
    },
  },
  mounted() {
    this.loadDuplicates();
  },
  methods: {
    async loadDuplicates() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.get('/questions/duplicates', {
          params: { threshold: this.threshold },
        });
        this.duplicateGroups = data.duplicateGroups || [];
        this.summary = {
          totalGroups: data.totalGroups,
          totalDuplicates: data.totalDuplicates,
          exactGroupCount: data.exactGroupCount,
          nearGroupCount: data.nearGroupCount,
        };
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '加载失败';
      } finally {
        this.loading = false;
      }
    },
    async confirmCleanup() {
      const preview = await axios.post('/questions/duplicates/cleanup', {
        threshold: this.threshold,
        dryRun: true,
      });
      const n = preview.data.deletedCount || 0;
      if (n === 0) {
        alert('没有可清理的重复题');
        return;
      }
      const ok = window.confirm(
        `将把 ${n} 道重复题移入回收站（每组保留最早创建的一条）。可在回收站恢复或永久删除。是否继续？`,
      );
      if (!ok) return;
      await axios.post('/questions/duplicates/cleanup', {
        threshold: this.threshold,
        dryRun: false,
      });
      await this.loadDuplicates();
      alert(`已将 ${n} 道重复题移入回收站`);
    },
    truncate(text) {
      const s = text || '';
      return s.length > 120 ? `${s.slice(0, 120)}…` : s;
    },
    formatDate(d) {
      if (!d) return '';
      return new Date(d).toLocaleString();
    },
  },
};
</script>

<style scoped>
.question-preview {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
