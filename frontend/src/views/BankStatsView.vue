<template>
  <div class="container py-4">
    <h1 class="h3 mb-3"><i class="bi bi-bar-chart"></i> 题库统计</h1>
    <p class="text-muted">当前题库题目分布、知识点覆盖与蓝图抽题缺口（与 examGenerator 规则一致，固定蓝图 randomSeed、不放宽）。</p>

    <div v-if="loading" class="text-muted">加载中…</div>
    <template v-else-if="stats">
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="text-muted small">题目总数</div>
              <div class="display-6">{{ stats.totalQuestions }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header">按题型</div>
            <ul class="list-group list-group-flush">
              <li v-for="row in stats.byType" :key="row.type" class="list-group-item d-flex justify-content-between">
                <span>{{ row.type }}</span>
                <span class="badge bg-primary">{{ row.count }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header">按难度</div>
            <ul class="list-group list-group-flush">
              <li v-for="(count, diff) in stats.byDifficulty" :key="diff" class="list-group-item d-flex justify-content-between">
                <span>{{ diff }}</span>
                <span class="badge bg-secondary">{{ count }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mt-3">
        <div class="card-header">知识点（Top 25）</div>
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead><tr><th>路径</th><th>题量</th></tr></thead>
            <tbody>
              <tr v-for="row in stats.byKnowledgePoint" :key="row.knowledgePointId">
                <td>{{ row.path }}</td>
                <td>{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card shadow-sm mt-3">
        <div class="card-header">蓝图覆盖缺口</div>
        <p v-if="!stats.blueprintCoverageGaps.length" class="card-body text-muted mb-0">暂无缺口（或尚无蓝图）。</p>
        <div v-else class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>蓝图</th>
                <th>Section</th>
                <th>题型</th>
                <th>说明</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(g, i) in stats.blueprintCoverageGaps" :key="i">
                <td>{{ g.blueprintTitle }}</td>
                <td>#{{ (g.sectionIndex ?? 0) + 1 }}<span v-if="g.slot != null"> · 槽 {{ g.slot + 1 }}</span></td>
                <td>{{ g.type }}</td>
                <td class="small">{{ g.message || formatGapMeta(g) }}</td>
                <td>
                  <router-link
                    v-if="g.listQuery"
                    class="btn btn-sm btn-outline-primary"
                    :to="{ name: 'question-list', query: g.listQuery }"
                  >
                    筛选
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'BankStatsView',
  data() {
    return { stats: null, loading: false };
  },
  mounted() {
    this.load();
  },
  methods: {
    formatGapMeta(g) {
      const parts = [];
      if (g.neededDifficulty) parts.push(`难度 ${g.neededDifficulty}`);
      if (g.scoreEach != null) parts.push(`分值≈${g.scoreEach}`);
      return parts.join(' · ') || '—';
    },
    async load() {
      this.loading = true;
      try {
        const { data } = await axios.get('/questions/stats/dashboard');
        this.stats = data;
      } catch (err) {
        alert(err.response?.data?.error || '加载统计失败');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
