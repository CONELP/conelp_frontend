<script setup lang="ts">
interface TabOption {
  value: string;
  label: string;
}

defineProps<{
  modelValue: string;
  options: TabOption[];
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <div class="admin-tabs">
    <div class="admin-tabs__list" role="tablist">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        role="tab"
        :aria-selected="modelValue === opt.value"
        class="admin-tabs__trigger"
        :class="{ 'admin-tabs__trigger--active': modelValue === opt.value }"
        @click="$emit('update:modelValue', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
    <div class="admin-tabs__panel">
      <slot :value="modelValue" />
    </div>
  </div>
</template>

<style scoped>
.admin-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.admin-tabs__list {
  display: flex;
  align-items: flex-end;
  gap: 0;
  position: relative;
  z-index: 1;
}
.admin-tabs__trigger {
  padding: 8px 16px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
  background: var(--surface-3);
  border: 1px solid var(--outline-soft);
  border-bottom: 1px solid var(--outline-soft);
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  margin-bottom: -1px;
}
.admin-tabs__trigger + .admin-tabs__trigger {
  border-left: none;
}
.admin-tabs__trigger:hover {
  background: #ececec;
}
.admin-tabs__trigger--active {
  background: var(--surface-1);
  color: var(--ink);
  border-bottom-color: transparent;
}
.admin-tabs__panel {
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: 0 var(--radius-control) var(--radius-control) var(--radius-control);
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
