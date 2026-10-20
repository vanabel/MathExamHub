<template>
  <div class="kp-tag-row-kp-cell">
    <div v-if="row.suggestions && row.suggestions.length" class="mb-1">
      <span
        v-for="s in row.suggestions"
        :key="s.knowledgePointId"
        class="badge rounded-pill text-bg-light border me-1 mb-1"
      >{{ s.path }}</span>
    </div>
    <div
      v-else-if="row.acceptedKnowledgePointIds && row.acceptedKnowledgePointIds.length"
      class="mb-1"
    >
      <span
        v-for="id in row.acceptedKnowledgePointIds"
        :key="id"
        class="badge rounded-pill text-bg-light border me-1 mb-1"
      >{{ kpPathById(id) }}</span>
    </div>
    <p v-else class="text-muted small mb-1">暂无建议</p>

    <div v-for="s in row.suggestions" :key="'meta-' + s.knowledgePointId" class="small text-muted mb-1">
      {{ Math.round((s.confidence || 0) * 100) }}% — {{ s.reason }}
    </div>
    <span v-if="row.llmError" class="text-warning small d-block mb-1">{{ row.llmError }}</span>

    <button
      v-if="!job?.appliedAt"
      type="button"
      class="btn btn-link btn-sm p-0"
      data-testid="kp-tag-row-edit-kps"
      @click="$emit('toggle-edit')"
    >
      {{ kpEditOpen ? '完成' : '编辑' }}
    </button>

    <div v-if="kpEditOpen" class="mt-2">
      <input
        :value="kpEditSearch"
        type="search"
        class="form-control form-control-sm mb-1"
        placeholder="搜索知识点…"
        data-testid="kp-tag-row-kp-search"
        @input="$emit('update:search', $event.target.value)"
      />
      <div class="kp-tag-kp-checklist border rounded p-2">
        <label
          v-for="kp in filteredOptions"
          :key="kp.id"
          class="form-check form-check-sm d-block"
        >
          <input
            class="form-check-input"
            type="checkbox"
            :checked="row.acceptedKnowledgePointIds.includes(kp.id)"
            @change="$emit('toggle-kp', kp.id, $event.target.checked)"
          />
          <span class="form-check-label">{{ kp.path }}</span>
        </label>
        <p v-if="!filteredOptions.length" class="small text-muted mb-0">无匹配知识点</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KpTagRowKpCell',
  props: {
    row: { type: Object, required: true },
    job: { type: Object, default: null },
    kpEditOpen: { type: Boolean, default: false },
    kpEditSearch: { type: String, default: '' },
    filteredOptions: { type: Array, default: () => [] },
    kpPathById: { type: Function, required: true },
  },
  emits: ['toggle-edit', 'update:search', 'toggle-kp'],
};
</script>
