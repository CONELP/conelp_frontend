<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string | number | null;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
  }>(),
  {
    modelValue: "",
    type: "text",
    disabled: false,
    readonly: false,
    invalid: false,
  },
);

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <input
    class="admin-input"
    :class="{ 'admin-input--invalid': invalid }"
    :type="type"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<style scoped>
.admin-input {
  width: 100%;
  padding: 7px 10px;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.admin-input:hover:not(:disabled) {
  border-color: rgba(0, 0, 0, 0.28);
}
.admin-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-outline);
}
.admin-input:disabled {
  background: var(--surface-3);
  cursor: not-allowed;
  opacity: 0.7;
}
.admin-input--invalid {
  border-color: #b91c1c;
}
.admin-input--invalid:focus {
  box-shadow: 0 0 0 2px rgba(185, 28, 28, 0.18);
}
</style>
