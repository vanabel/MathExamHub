<template>
  <router-link :to="to" :class="linkClass" data-testid="kp-graph-nav-link">
    <slot />
    <span
      v-if="pendingCount > 0"
      class="badge rounded-pill text-bg-danger ms-1"
      data-testid="kp-pending-badge"
    :title="`待审核 ${pendingCount} 条 KP 建议`"
    >{{ pendingCount }}</span>
  </router-link>
</template>

<script>
import axios from 'axios';

export default {
  name: 'KpGraphNavLink',
  props: {
    to: { type: String, default: '/knowledge-points/import' },
    linkClass: { type: [String, Object, Array], default: 'btn btn-outline-primary btn-sm' },
  },
  data() {
    return {
      pendingCount: 0,
      pollTimer: null,
    };
  },
  mounted() {
    this.refresh();
    this.pollTimer = setInterval(this.refresh, 60000);
  },
  beforeUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  },
  methods: {
    async refresh() {
      try {
        const { data } = await axios.get('/questions/kp-tag-jobs/review-summary');
        this.pendingCount = data.pendingRowCount || 0;
      } catch {
        this.pendingCount = 0;
      }
    },
  },
};
</script>
