<template>
  <header class="page-header-block" :data-testid="testId">
    <div class="page-header-block__row">
      <div class="page-header-block__text">
        <h1 class="page-header-block__title">
          <i v-if="icon" :class="['bi', icon, 'me-2']" aria-hidden="true"></i>
          <slot name="title">{{ title }}</slot>
        </h1>
        <p v-if="subtitle || $slots.subtitle" class="page-header-block__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions" class="page-header-block__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'PageHeader',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    icon: { type: String, default: '' },
    testId: { type: String, default: '' },
  },
};
</script>
