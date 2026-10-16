<template>
  <div class="container py-4">
    <h1 class="h3 mb-3"><i class="bi bi-shield-check"></i> 题目质量</h1>
    <p class="text-muted">标记缺少答案、解答、知识点或难度的题目，支持批量补全元数据。</p>

    <div class="row g-2 mb-3 align-items-end">
      <div class="col-md-4">
        <label class="form-label small">质量筛选</label>
        <select v-model="qualityFilter" class="form-select form-select-sm" @change="reload">
          <option value="incomplete">任意不完整</option>
          <option value="missing_answer">缺少答案</option>
          <option value="missing_kp">缺少知识点</option>
          <option value="missing_difficulty">缺少难度</option>
        </select>
      </div>
      <div class="col-md-2">
        <button type="button" class="btn btn-sm btn-primary w-100" @click="reload">刷新</button>
      </div>
    </div>

    <div v-if="loading" class="text-muted">加载中…</div>
    <div v-else class="table-responsive">
      <table class="table table-sm table-hover">
        <thead>
          <tr>
            <th><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
            <th>题目</th>
            <th>问题</th>
            <th>难度</th>
            <th>知识点 ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in rows" :key="q._id">
            <td><input v-model="selected" type="checkbox" :value="q._id" /></td>
            <td class="small text-truncate" style="max-width: 280px">{{ q.questionText }}</td>
            <td>
              <span v-for="issue in q.qualityIssues" :key="issue" class="badge bg-warning text-dark me-1">{{ issue }}</span>
            </td>
            <td>
              <select v-model="edits[q._id].difficulty" class="form-select form-select-sm">
                <option value="易">易</option>
                <option value="中">中</option>
                <option value="难">难</option>
              </select>
            </td>
            <td>
              <input v-model="edits[q._id].kpIdsText" class="form-control form-control-sm" placeholder="逗号分隔 KP id" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <button type="button" class="btn btn-success mt-2" :disabled="!selected.length || saving" @click="saveBatch">
      {{ saving ? '保存中…' : `批量保存 (${selected.length})` }}
    </button>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'QuestionQualityView',
  data() {
    return {
      qualityFilter: 'incomplete',
      rows: [],
      edits: {},
      selected: [],
      loading: false,
      saving: false,
    };
  },
  computed: {
    allSelected() {
      return this.rows.length && this.selected.length === this.rows.length;
    },
  },
  mounted() {
    this.reload();
  },
  methods: {
    toggleAll(e) {
      this.selected = e.target.checked ? this.rows.map((q) => q._id) : [];
    },
    async reload() {
      this.loading = true;
      try {
        const { data } = await axios.get('/questions/list', {
          params: {
            quality: this.qualityFilter,
            includeQuality: 'true',
            limit: 100,
            offset: 0,
          },
        });
        this.rows = data.questions || [];
        const edits = {};
        for (const q of this.rows) {
          edits[q._id] = {
            difficulty: q.difficulty || '中',
            kpIdsText: (q.knowledgePointIds || []).join(','),
          };
        }
        this.edits = edits;
        this.selected = [];
      } finally {
        this.loading = false;
      }
    },
    async saveBatch() {
      this.saving = true;
      try {
        const updates = this.selected.map((id) => {
          const e = this.edits[id];
          const knowledgePointIds = e.kpIdsText
            ? e.kpIdsText.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)
            : [];
          return { id, difficulty: e.difficulty, knowledgePointIds };
        });
        await axios.post('/questions/batch-metadata', { updates });
        await this.reload();
        alert('已保存');
      } catch (err) {
        alert(err.response?.data?.error || '保存失败');
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
