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
      <div class="col-md-4 d-flex align-items-end">
        <button class="btn btn-outline-secondary w-100" :disabled="!canWrite || drafting" @click="draftTreeWithLlm">
          {{ drafting ? '生成中…' : 'LLM 草稿知识点树' }}
        </button>
      </div>
    </div>
    <p v-if="draftMessage" class="small text-muted">{{ draftMessage }}</p>

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
      drafting: false,
      draftMessage: '',
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
    async draftTreeWithLlm() {
      this.drafting = true;
      this.draftMessage = '';
      try {
        const { data } = await axios.post('/knowledge-points/llm-draft-tree', {
          subject: this.subject || undefined,
        });
        const blob = new Blob([JSON.stringify(data.draft, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kp-draft-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.draftMessage = `已下载草稿（${data.draft?.nodes?.length || 0} 个节点），请审核后再手动创建。`;
      } catch (e) {
        this.draftMessage = e.response?.data?.error || '草稿生成失败';
      } finally {
        this.drafting = false;
      }
    },
  },
};
</script>
