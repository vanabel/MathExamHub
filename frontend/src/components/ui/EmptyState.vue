<template>
  <div class="app-empty" :data-testid="testId">
    <div class="app-empty__icon" aria-hidden="true">
      <i :class="['bi', icon]"></i>
    </div>
    <div class="app-empty__title">{{ title }}</div>
    <p v-if="hint" class="app-empty__hint">{{ hint }}</p>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    icon: { type: String, default: 'bi-inbox' },
    title: { type: String, default: '暂无数据' },
    hint: { type: String, default: '' },
    testId: { type: String, default: 'empty-state' },
  },
};
</script>
