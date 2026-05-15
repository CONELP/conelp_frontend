<script setup lang="ts">
defineProps<{
  for?: string;
}>();
</script>

<template>
  <label class="admin-label" :for="$props.for">
    <slot />
  </label>
</template>

<style scoped>
.admin-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted);
  margin-bottom: 4px;
}
</style>
