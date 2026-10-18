<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="page-title mb-0"><i class="bi bi-diagram-3"></i> 章节 / 知识点</h1>
      <router-link
        v-if="canWrite"
        to="/knowledge-points/import"
        class="btn btn-outline-primary btn-sm"
        data-testid="kp-excel-import-link"
      >
        <i class="bi bi-file-earmark-spreadsheet"></i> 知识图谱工作流
      </router-link>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <label class="form-label">科目</label>
        <input v-model="subject" class="form-control" placeholder="解析几何" @keyup.enter="loadTree" />
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button class="btn btn-primary w-100" @click="loadTree">刷新</button>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card mb-4">
          <div class="card-header">新增节点</div>
          <div class="card-body row g-2">
            <div class="col-12">
              <input v-model="newName" class="form-control" placeholder="节点名称" />
            </div>
            <div class="col-12">
              <select v-model="newParentId" class="form-select">
                <option value="">（根节点）</option>
                <option v-for="n in nodes" :key="n._id" :value="n._id">{{ n.path }}</option>
              </select>
            </div>
            <div class="col-12">
              <button class="btn btn-success w-100" :disabled="!canWrite" @click="createNode">添加</button>
            </div>
          </div>
        </div>
        <ul class="list-group">
          <li
            v-for="n in nodes"
            :key="n._id"
            class="list-group-item list-group-item-action"
            :class="{ active: selectedId === n._id }"
            @click="selectNode(n)"
          >
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <code class="small">{{ n.path }}</code>
                <div class="mt-1">
                  <span v-for="tag in n.tags || []" :key="tag" class="badge me-1" :class="tagBadge(tag)">{{ tag }}</span>
                </div>
              </div>
              <button class="btn btn-sm btn-outline-danger" :disabled="!canWrite" @click.stop="removeNode(n._id)">删</button>
            </div>
          </li>
        </ul>
      </div>
      <div v-if="selected" class="col-lg-7">
        <div class="card" data-testid="kp-detail-panel">
          <div class="card-header">知识点详情</div>
          <div class="card-body">
            <h5 class="h6"><code>{{ selected.path }}</code></h5>
            <p v-if="selected.objective" class="small"><strong>教学目标：</strong>{{ selected.objective }}</p>
            <p v-if="selected.description" class="small"><strong>说明：</strong>{{ selected.description }}</p>
            <p v-if="selected.cognitiveLevel" class="small text-muted">认知维度：{{ selected.cognitiveLevel }} · 分类：{{ selected.category || '—' }}</p>
            <p v-if="relationLine(selected)" class="small">{{ relationLine(selected) }}</p>
            <p v-if="selected.source" class="small text-muted">来源：{{ selected.source }}</p>
          </div>
        </div>
      </div>
    </div>
    <p v-if="!canWrite" class="text-muted mt-2">当前角色为只读，无法编辑知识点树。</p>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'KnowledgePointManager',
  data() {
    return {
      subject: '解析几何',
      nodes: [],
      selectedId: '',
      idToName: {},
      newName: '',
      newParentId: '',
      canWrite: true,
    };
  },
  computed: {
    selected() {
      return this.nodes.find((n) => String(n._id) === String(this.selectedId)) || null;
    },
  },
  mounted() {
    this.loadTree();
    const bank = JSON.parse(localStorage.getItem('currentBank') || '{}');
    this.canWrite = !bank.role || bank.role !== 'viewer';
  },
  methods: {
    tagBadge(tag) {
      if (tag === '重点') return 'text-bg-warning';
      if (tag === '难点') return 'text-bg-danger';
      return 'text-bg-secondary';
    },
    namesForIds(ids) {
      return (ids || []).map((id) => this.idToName[id] || id);
    },
    relationLine(n) {
      const parts = [];
      const pre = this.namesForIds(n.prerequisiteIds);
      const suc = this.namesForIds(n.successorIds);
      const rel = this.namesForIds(n.relatedIds);
      if (pre.length) parts.push(`前置：${pre.join('；')}`);
      if (suc.length) parts.push(`后置：${suc.join('；')}`);
      if (rel.length) parts.push(`关联：${rel.join('；')}`);
      return parts.join(' · ');
    },
    selectNode(n) {
      this.selectedId = n._id;
    },
    async loadTree() {
      const { data } = await axios.get('/knowledge-points/tree', {
        params: { subject: this.subject || undefined },
      });
      this.nodes = data.nodes || [];
      const map = {};
      for (const n of this.nodes) map[String(n._id)] = n.name;
      this.idToName = map;
    },
    async createNode() {
      await axios.post('/knowledge-points/', {
        name: this.newName,
        subject: this.subject,
        parentId: this.newParentId || undefined,
      });
      this.newName = '';
      await this.loadTree();
    },
    async removeNode(id) {
      await axios.delete(`/knowledge-points/${id}`);
      if (String(this.selectedId) === String(id)) this.selectedId = '';
      await this.loadTree();
    },
  },
};
</script>
