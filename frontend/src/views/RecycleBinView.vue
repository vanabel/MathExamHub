<template>
  <div class="container py-4">
    <h2 class="mb-3">回收站</h2>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: tab === 'questions' }"
          data-testid="recycle-tab-questions"
          @click="tab = 'questions'"
        >
          题目
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: tab === 'banks' }"
          data-testid="recycle-tab-banks"
          @click="switchToBanks"
        >
          题库
          <span v-if="archivedBanks.length" class="badge text-bg-secondary ms-1">{{ archivedBanks.length }}</span>
        </button>
      </li>
    </ul>

    <template v-if="tab === 'questions'">
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
        题目回收站为空
      </div>
    </template>

    <template v-else>
      <p class="text-muted">已归档的共享题库（仅拥有者可恢复）。个人默认题库不能归档。</p>
      <div v-if="bankError" class="alert alert-danger">{{ bankError }}</div>
      <div v-if="bankLoading" class="text-center py-4" data-testid="bank-recycle-loading">
        <div class="spinner-border spinner-border-sm text-secondary" role="status"></div>
        <span class="text-muted ms-2">加载中…</span>
      </div>
      <table v-if="!bankLoading && archivedBanks.length" class="table table-sm align-middle" data-testid="bank-recycle-list">
        <thead>
          <tr>
            <th>名称</th>
            <th>题目数</th>
            <th>删除时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in archivedBanks" :key="b._id">
            <td>{{ b.name }}</td>
            <td>{{ b.questionCount ?? '—' }}</td>
            <td>{{ formatDate(b.deletedAt) }}</td>
            <td>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                data-testid="bank-recycle-restore"
                @click="restoreBank(b._id)"
              >
                恢复
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!bankLoading && !archivedBanks.length" class="text-center py-5 text-muted" data-testid="bank-recycle-empty">
        <i class="bi bi-archive display-6 d-block mb-2"></i>
        没有已归档的题库
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RecycleBinView',
  data() {
    return {
      tab: 'questions',
      items: [],
      loading: false,
      error: null,
      canWrite: true,
      archivedBanks: [],
      bankLoading: false,
      bankError: null,
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
    switchToBanks() {
      this.tab = 'banks';
      this.loadArchivedBanks();
    },
    async loadArchivedBanks() {
      this.bankLoading = true;
      this.bankError = null;
      try {
        const { data } = await axios.get('/banks/recycle-bin');
        this.archivedBanks = data.banks || [];
      } catch (e) {
        this.bankError = e.response?.data?.error || e.message;
        this.archivedBanks = [];
      } finally {
        this.bankLoading = false;
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
    async restoreBank(bankId) {
      if (!window.confirm('确定恢复该题库？恢复后将重新出现在题库列表中。')) return;
      try {
        await axios.post(`/banks/recycle-bin/${bankId}/restore`);
        await this.loadArchivedBanks();
        alert('题库已恢复');
      } catch (e) {
        alert(e.response?.data?.error || e.message || '恢复失败');
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
