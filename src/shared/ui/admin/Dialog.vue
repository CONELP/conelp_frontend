<script setup lang="ts">
import { computed, onUnmounted, watch } from "vue";

type Width = "sm" | "md" | "lg" | "xl";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    width?: Width;
    closeOnBackdrop?: boolean;
  }>(),
  {
    width: "md",
    closeOnBackdrop: true,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const widthPx = computed(() => {
  switch (props.width) {
    case "sm":
      return "420px";
    case "md":
      return "560px";
    case "lg":
      return "720px";
    case "xl":
      return "920px";
    default:
      return "560px";
  }
});

function onBackdropClick() {
  if (props.closeOnBackdrop) emit("update:open", false);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open) {
    emit("update:open", false);
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeydown);
    }
  },
);

onUnmounted(() => {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-dialog">
      <div v-if="open" class="admin-dialog-backdrop" role="presentation" @click="onBackdropClick">
        <div
          class="admin-dialog-panel"
          role="dialog"
          aria-modal="true"
          :style="{ width: widthPx }"
          @click.stop
        >
          <header v-if="title || $slots.header" class="admin-dialog-header">
            <slot name="header">
              <h2 class="admin-dialog-title">{{ title }}</h2>
            </slot>
            <button
              type="button"
              class="admin-dialog-close"
              aria-label="닫기"
              @click="emit('update:open', false)"
            >
              ×
            </button>
          </header>
          <div class="admin-dialog-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="admin-dialog-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.admin-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}
.admin-dialog-panel {
  background: var(--surface-1);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-soft);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.admin-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--outline-soft);
}
.admin-dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}
.admin-dialog-close {
  background: transparent;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--ink-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.admin-dialog-close:hover {
  background: var(--surface-3);
  color: var(--ink);
}
.admin-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
.admin-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--outline-soft);
}

.admin-dialog-enter-active,
.admin-dialog-leave-active {
  transition: opacity 150ms ease;
}
.admin-dialog-enter-active .admin-dialog-panel,
.admin-dialog-leave-active .admin-dialog-panel {
  transition: transform 180ms ease;
}
.admin-dialog-enter-from,
.admin-dialog-leave-to {
  opacity: 0;
}
.admin-dialog-enter-from .admin-dialog-panel,
.admin-dialog-leave-to .admin-dialog-panel {
  transform: translateY(8px);
}
</style>
