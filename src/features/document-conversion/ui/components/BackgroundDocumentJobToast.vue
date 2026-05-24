<template>
  <TransitionGroup name="bg-toast" tag="div" class="bg-toast-stack">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="bg-toast"
      :class="`bg-toast--${toast.tone}`"
      role="status"
    >
      <span class="bg-toast__message">{{ toast.message }}</span>
      <button
        class="bg-toast__close"
        type="button"
        aria-label="닫기"
        @click="handleDismiss(toast.id)"
      >
        ×
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useBackgroundDocumentJobsStore } from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";

const store = useBackgroundDocumentJobsStore();

const toasts = computed(() => store.toasts);

function handleDismiss(toastId: string) {
  store.dismissToast(toastId);
}
</script>

<style scoped>
.bg-toast-stack {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: min(560px, calc(100vw - 32px));
  pointer-events: none;
}

.bg-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 20px 24px;
  border-radius: var(--radius-panel);
  background: var(--surface-inverse);
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.bg-toast--success {
  background: var(--primary);
}

.bg-toast--error {
  background: #b32d2d;
}

.bg-toast__message {
  flex: 1 1 auto;
  line-height: 1.4;
}

.bg-toast__close {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  padding: 0 6px;
}

.bg-toast-enter-active,
.bg-toast-leave-active {
  transition: transform 240ms ease, opacity 240ms ease;
}
.bg-toast-enter-from,
.bg-toast-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>
