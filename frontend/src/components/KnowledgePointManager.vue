<template>
  <div class="container py-4">
    <h1 class="page-title mb-3"><i class="bi bi-diagram-3"></i> 章节 / 知识点</h1>
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <label class="form-label">科目</label>
        <input v-model="subject" class="form-control" placeholder="解析几何" @keyup.enter="loadTree" />
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button class="btn btn-primary w-100" @click="loadTree">刷新</button>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header">新增节点</div>
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input v-model="newName" class="form-control" placeholder="节点名称" />
        </div>
        <div class="col-md-4">
          <select v-model="newParentId" class="form-select">
            <option value="">（根节点）</option>
            <option v-for="n in nodes" :key="n._id" :value="n._id">{{ n.path }}</option>
          </select>
        </div>
        <div class="col-md-4">
          <button class="btn btn-success w-100" :disabled="!canWrite" @click="createNode">添加</button>
        </div>
      </div>
    </div>

    <ul class="list-group">
      <li v-for="n in nodes" :key="n._id" class="list-group-item d-flex justify-content-between">
        <span><code>{{ n.path }}</code></span>
        <button class="btn btn-sm btn-outline-danger" :disabled="!canWrite" @click="removeNode(n._id)">删除</button>
      </li>
    </ul>
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
      newName: '',
      newParentId: '',
      canWrite: true,
    };
  },
  mounted() {
    this.loadTree();
    const bank = JSON.parse(localStorage.getItem('currentBank') || '{}');
    this.canWrite = !bank.role || bank.role !== 'viewer';
  },
  methods: {
    async loadTree() {
      const { data } = await axios.get('/knowledge-points/tree', {
        params: { subject: this.subject || undefined },
      });
      this.nodes = data.nodes || [];
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
      await this.loadTree();
    },
  },
};
</script>
