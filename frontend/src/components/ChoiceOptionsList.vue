<template>
  <div class="choice-options-list">
    <div
      v-for="entry in entries"
      :key="entry.label"
      class="choice-option-row option-item"
    >
      <span class="choice-option-label mathexam-abcd-label">{{ entry.displayLabel }}</span>
      <div class="choice-option-content mathexam-abcd-body">
        <slot :entry="entry">
          <span>{{ entry.text }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<script>
import { listChoiceOptionEntries } from '../utils/choiceOptions';

export default {
  name: 'ChoiceOptionsList',
  props: {
    options: {
      type: [Object, Array],
      default: () => ({}),
    },
  },
  computed: {
    entries() {
      return listChoiceOptionEntries(this.options);
    },
  },
};
</script>

<style scoped>
.choice-options-list {
  margin: 0;
}

.choice-option-row {
  display: flex;
  gap: 0.35rem;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.choice-option-label {
  flex-shrink: 0;
  font-weight: 600;
}

.choice-option-content {
  flex: 1;
  min-width: 0;
}
</style>
