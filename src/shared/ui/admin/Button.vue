<script setup lang="ts">
import { computed } from "vue";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type Size = "sm" | "md";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    block?: boolean;
  }>(),
  {
    variant: "primary",
    size: "md",
    type: "button",
    disabled: false,
    block: false,
  },
);

const classes = computed(() => [
  "admin-btn",
  `admin-btn--${props.variant}`,
  `admin-btn--${props.size}`,
  { "admin-btn--block": props.block },
]);
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.admin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  font-family: inherit;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease,
    opacity 120ms ease;
  white-space: nowrap;
  border: 1px solid transparent;
}
.admin-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.admin-btn--sm {
  font-size: 12px;
  padding: 6px 10px;
  min-height: 28px;
}
.admin-btn--md {
  font-size: 13px;
  padding: 8px 14px;
  min-height: 34px;
}
.admin-btn--block {
  width: 100%;
}

.admin-btn--primary {
  background: var(--primary);
  color: #fff;
}
.admin-btn--primary:hover:not(:disabled) {
  background: var(--primary-hover);
}
.admin-btn--primary:active:not(:disabled) {
  background: var(--primary-pressed);
}

.admin-btn--secondary {
  background: var(--surface-3);
  color: var(--ink);
}
.admin-btn--secondary:hover:not(:disabled) {
  background: #e6e6e6;
}

.admin-btn--outline {
  background: var(--surface-1);
  color: var(--ink);
  border-color: var(--outline-soft);
}
.admin-btn--outline:hover:not(:disabled) {
  background: var(--surface-3);
}

.admin-btn--ghost {
  background: transparent;
  color: var(--ink-muted);
}
.admin-btn--ghost:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--ink);
}

.admin-btn--destructive {
  background: #b91c1c;
  color: #fff;
}
.admin-btn--destructive:hover:not(:disabled) {
  background: #991b1b;
}
</style>
