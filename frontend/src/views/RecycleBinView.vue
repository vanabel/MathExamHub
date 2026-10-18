<template>
  <div class="container py-4">
    <h2 class="mb-3">回收站</h2>
    <p class="text-muted">当前题库内已软删除的题目。可恢复或永久删除（需编辑权限）。</p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="text-center py-4" data-testid="recycle-bin-loading">
      <div class="spinner-border spinner-border-sm text-secondary" role="status"></div>
      <span class="text-muted ms-2">加载中…</span>
    </div>

    <table v-if="!loading && items.length" class="table table-sm align-middle">
      <thead>
        <tr>
          <th>题型</th>
          <th>科目</th>
          <th>题干</th>
          <th>删除时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item._id">
          <td>{{ item.type }}</td>
          <td>{{ item.subject }}</td>
          <td class="preview">{{ truncate(item.questionText) }}</td>
          <td>{{ formatDate(item.deletedAt) }}</td>
          <td>
            <button
              class="btn btn-sm btn-outline-primary me-1"
              :disabled="!canWrite"
              @click="restore(item._id)"
            >
              恢复
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              :disabled="!canWrite"
              @click="permanentDelete(item._id)"
            >
              永久删除
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && !items.length" class="text-center py-5 text-muted" data-testid="recycle-bin-empty">
      <i class="bi bi-trash3 display-6 d-block mb-2"></i>
      回收站为空
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RecycleBinView',
  data() {
    return {
      items: [],
      loading: false,
      error: null,
      canWrite: true,
    };
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.get('/questions/recycle-bin');
        this.items = data.items || [];
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
        if (e.response?.status === 403) this.canWrite = false;
      } finally {
        this.loading = false;
      }
    },
    async restore(id) {
      if (!window.confirm('确定将该题目恢复到题库？')) return;
      try {
        await axios.post(`/questions/recycle-bin/${id}/restore`);
        await this.load();
      } catch (e) {
        alert(e.response?.data?.error || e.message || '恢复失败');
      }
    },
    async permanentDelete(id) {
      if (!window.confirm('永久删除后无法恢复，且可能释放 contentHash 以便重新导入。确定？')) return;
      try {
        await axios.delete(`/questions/recycle-bin/${id}`);
        await this.load();
      } catch (e) {
        alert(e.response?.data?.error || e.message || '删除失败');
      }
    },
    truncate(text) {
      const s = text || '';
      return s.length > 80 ? `${s.slice(0, 80)}…` : s;
    },
    formatDate(d) {
      return d ? new Date(d).toLocaleString() : '';
    },
  },
};
</script>

<style scoped>
.preview {
  max-width: 360px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
