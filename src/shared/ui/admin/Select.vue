<script setup lang="ts">
interface SelectOption {
  value: string | number | null;
  label: string;
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    placeholder: "선택",
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number | null];
}>();

function handleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (target.value === "") {
    emit("update:modelValue", null);
    return;
  }
  const rawOption = (target.options[target.selectedIndex] as HTMLOptionElement | undefined)?.dataset
    .raw;
  if (rawOption === "number") {
    emit("update:modelValue", Number(target.value));
  } else {
    emit("update:modelValue", target.value);
  }
}
</script>

<template>
  <select
    class="admin-select"
    :value="modelValue ?? ''"
    :disabled="disabled"
    @change="handleChange"
  >
    <option value="" disabled hidden>{{ placeholder }}</option>
    <option
      v-for="opt in options"
      :key="String(opt.value)"
      :value="opt.value ?? ''"
      :disabled="opt.disabled"
      :data-raw="typeof opt.value === 'number' ? 'number' : 'string'"
    >
      {{ opt.label }}
    </option>
  </select>
</template>

<style scoped>
.admin-select {
  width: 100%;
  padding: 7px 30px 7px 10px;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  background-color: var(--surface-1);
  background-image: linear-gradient(45deg, transparent 50%, var(--ink-muted) 50%),
    linear-gradient(135deg, var(--ink-muted) 50%, transparent 50%);
  background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.admin-select:hover:not(:disabled) {
  border-color: rgba(0, 0, 0, 0.28);
}
.admin-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-outline);
}
.admin-select:disabled {
  background-color: var(--surface-3);
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
