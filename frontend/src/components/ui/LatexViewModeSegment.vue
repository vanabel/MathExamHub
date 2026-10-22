<template>
  <div
    class="btn-group btn-group-sm macos-segment latex-view-mode-segment"
    role="group"
    :aria-label="ariaLabel"
    :data-testid="testId"
  >
    <input
      :id="`${uid}-preview`"
      type="radio"
      class="btn-check"
      name="latexViewMode"
      autocomplete="off"
      :checked="modelValue === 'preview'"
      @change="$emit('update:modelValue', 'preview')"
    />
    <label class="btn btn-outline-secondary" :for="`${uid}-preview`">预览</label>
    <input
      :id="`${uid}-latex`"
      type="radio"
      class="btn-check"
      name="latexViewMode"
      autocomplete="off"
      :checked="modelValue === 'latex'"
      @change="$emit('update:modelValue', 'latex')"
    />
    <label class="btn btn-outline-secondary" :for="`${uid}-latex`">LaTeX 源码</label>
  </div>
</template>

<script>
let segmentUid = 0;

export default {
  name: 'LatexViewModeSegment',
  props: {
    modelValue: {
      type: String,
      default: 'preview',
    },
    testId: {
      type: String,
      default: 'latex-export-view-mode',
    },
    ariaLabel: {
      type: String,
      default: '题目显示方式',
    },
  },
  emits: ['update:modelValue'],
  data() {
    segmentUid += 1;
    return { uid: `lvm-${segmentUid}` };
  },
};
</script>
