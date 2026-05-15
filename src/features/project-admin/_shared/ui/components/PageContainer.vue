<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="page-container">
    <div class="page-container__title">{{ title }}</div>
    <slot />
  </div>
</template>

<style scoped>
.page-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.page-container__title {
  text-align: right;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}
</style>
