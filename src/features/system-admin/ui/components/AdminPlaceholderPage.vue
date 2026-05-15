<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="admin-placeholder">
    <h1 class="admin-placeholder__title">{{ title }}</h1>
    <p v-if="description" class="admin-placeholder__desc">{{ description }}</p>
    <div class="admin-placeholder__panel">
      <p class="admin-placeholder__msg">이 화면은 곧 구현될 예정입니다.</p>
    </div>
  </div>
</template>

<style scoped>
.admin-placeholder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.admin-placeholder__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
}
.admin-placeholder__desc {
  margin: 0;
  font-size: 13px;
  color: var(--ink-muted);
}
.admin-placeholder__panel {
  background: var(--surface-1);
  border: 1px dashed var(--outline-soft);
  border-radius: var(--radius-control);
  padding: 64px 32px;
  text-align: center;
}
.admin-placeholder__msg {
  margin: 0;
  font-size: 14px;
  color: var(--ink-faint);
}
</style>
