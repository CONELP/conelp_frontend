<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: boolean;
    disabled?: boolean;
    id?: string;
  }>(),
  {
    modelValue: false,
    disabled: false,
  },
);

defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <input
    class="admin-checkbox"
    type="checkbox"
    :id="id"
    :checked="modelValue"
    :disabled="disabled"
    @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
  />
</template>

<style scoped>
.admin-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--outline-soft);
  border-radius: 4px;
  background: var(--surface-1);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 120ms ease, border-color 120ms ease;
}
.admin-checkbox:hover:not(:disabled) {
  border-color: var(--primary);
}
.admin-checkbox:checked {
  background: var(--primary);
  border-color: var(--primary);
}
.admin-checkbox:checked::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.admin-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
