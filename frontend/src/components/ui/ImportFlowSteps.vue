<template>
  <nav class="latex-io-steps" aria-label="导入步骤" data-testid="latex-import-flow-steps">
    <ol class="latex-io-steps__list">
      <li
        v-for="item in steps"
        :key="item.id"
        class="latex-io-steps__item"
        :class="{
          'latex-io-steps__item--active': step === item.id,
          'latex-io-steps__item--done': step > item.id,
        }"
        :data-step="item.id"
      >
        <span class="latex-io-steps__badge">{{ item.id }}</span>
        <span class="latex-io-steps__label">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script>
export default {
  name: 'ImportFlowSteps',
  props: {
    step: { type: Number, required: true },
  },
  data() {
    return {
      steps: [
        { id: 1, label: '上传' },
        { id: 2, label: '预览与校对' },
        { id: 3, label: '导入结果' },
      ],
    };
  },
};
</script>
