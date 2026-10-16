<template>
  <div class="kp-picker">
    <div v-if="loading" class="text-muted small">加载知识点…</div>
    <div v-else-if="!flatNodes.length" class="text-muted small">暂无知识点，请先在「章节 / 知识点」页维护。</div>
    <div v-else class="kp-picker-list border rounded p-2 bg-white" :style="{ maxHeight: maxHeight }">
      <div v-for="n in flatNodes" :key="n._id" class="form-check form-check-sm mb-1">
        <input
          :id="`kp-${n._id}`"
          class="form-check-input"
          type="checkbox"
          :checked="isSelected(n._id)"
          @change="toggle(n._id, $event.target.checked)"
        />
        <label class="form-check-label small" :for="`kp-${n._id}`">
          <span :style="{ paddingLeft: `${n.depth * 12}px` }">{{ n.path || n.name }}</span>
        </label>
      </div>
    </div>
    <div v-if="selectedIds.length" class="mt-1">
      <span v-for="id in selectedIds" :key="id" class="badge bg-secondary me-1 mb-1">
        {{ labelFor(id) }}
        <button type="button" class="btn-close btn-close-white btn-sm ms-1" aria-label="移除" @click="toggle(id, false)" />
      </span>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'KnowledgePointPicker',
  props: {
    modelValue: { type: Array, default: () => [] },
    subject: { type: String, default: '' },
    maxHeight: { type: String, default: '160px' },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      loading: false,
      nodes: [],
    };
  },
  computed: {
    flatNodes() {
      const byParent = new Map();
      for (const n of this.nodes) {
        const pid = n.parentId ? String(n.parentId) : '';
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid).push(n);
      }
      const sortFn = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.path).localeCompare(String(b.path));
      for (const list of byParent.values()) list.sort(sortFn);

      const out = [];
      const walk = (parentKey, depth) => {
        const kids = byParent.get(parentKey) || [];
        for (const n of kids) {
          out.push({ ...n, depth });
          walk(String(n._id), depth + 1);
        }
      };
      walk('', 0);
      return out;
    },
    selectedIds() {
      return (this.modelValue || []).map(String);
    },
  },
  watch: {
    subject() {
      this.loadTree();
    },
  },
  mounted() {
    this.loadTree();
  },
  methods: {
    async loadTree() {
      this.loading = true;
      try {
        const { data } = await axios.get('/knowledge-points/tree', {
          params: { subject: this.subject || undefined },
        });
        this.nodes = data.nodes || [];
      } catch (e) {
        console.error(e);
        this.nodes = [];
      } finally {
        this.loading = false;
      }
    },
    isSelected(id) {
      return this.selectedIds.includes(String(id));
    },
    toggle(id, on) {
      const sid = String(id);
      let next = [...this.selectedIds];
      if (on) {
        if (!next.includes(sid)) next.push(sid);
      } else {
        next = next.filter((x) => x !== sid);
      }
      this.$emit('update:modelValue', next);
    },
    labelFor(id) {
      const n = this.nodes.find((x) => String(x._id) === String(id));
      return n?.path || n?.name || id;
    },
  },
};
</script>
