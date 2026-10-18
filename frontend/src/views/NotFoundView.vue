<template>
  <div class="app-page">
    <div class="app-container container-xl">
      <div class="empty-state text-center py-5" data-testid="not-found">
        <i class="bi bi-compass display-1 text-muted" aria-hidden="true"></i>
        <h1 class="h3 mt-3">页面不存在</h1>
        <p class="text-muted mb-4">您访问的地址无效或已被移除。</p>
        <router-link to="/question-list" class="btn btn-primary" data-testid="not-found-home">
          返回题目列表
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFoundView',
};
</script>
