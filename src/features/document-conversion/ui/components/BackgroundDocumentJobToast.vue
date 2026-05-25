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
        v-if="toast.actionLabel && toast.actionRoute"
        class="bg-toast__action"
        type="button"
        @click="handleAction(toast.id, toast.actionRoute)"
      >
        {{ toast.actionLabel }}
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { useRouter } from "vue-router";

import { useBackgroundDocumentJobsStore } from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";

const DEFAULT_TOAST_DISMISS_MS = 3000;

const store = useBackgroundDocumentJobsStore();
const router = useRouter();
const autoDismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

const toasts = computed(() => store.toasts);

function handleDismiss(toastId: string) {
  clearAutoDismissTimer(toastId);
  store.dismissToast(toastId);
}

async function handleAction(toastId: string, route: string) {
  handleDismiss(toastId);
  await router.push(route);
}

function clearAutoDismissTimer(toastId: string) {
  const timer = autoDismissTimers.get(toastId);

  if (!timer) return;

  clearTimeout(timer);
  autoDismissTimers.delete(toastId);
}

function scheduleAutoDismissToast(toast: (typeof toasts.value)[number]) {
  if (autoDismissTimers.has(toast.id)) return;

  const createdAt = toast.createdAt ?? Date.now();
  const durationMs = toast.durationMs ?? DEFAULT_TOAST_DISMISS_MS;
  const remainingMs = Math.max(durationMs - (Date.now() - createdAt), 0);
  const timer = setTimeout(() => {
    autoDismissTimers.delete(toast.id);
    store.dismissToast(toast.id);
  }, remainingMs);

  autoDismissTimers.set(toast.id, timer);
}

watch(
  toasts,
  (currentToasts) => {
    const currentToastIds = new Set(currentToasts.map((toast) => toast.id));

    currentToasts.forEach(scheduleAutoDismissToast);
    Array.from(autoDismissTimers.keys()).forEach((toastId) => {
      if (!currentToastIds.has(toastId)) {
        clearAutoDismissTimer(toastId);
      }
    });
  },
  { immediate: true, deep: true },
);

onBeforeUnmount(() => {
  Array.from(autoDismissTimers.keys()).forEach(clearAutoDismissTimer);
});
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
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border-radius: 8px;
  background: var(--surface-inverse);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.bg-toast--info {
  background: #243447;
}

.bg-toast--success {
  background: #217346;
}

.bg-toast--error {
  background: #b32d2d;
}

.bg-toast__message {
  flex: 1 1 auto;
  line-height: 1.4;
}

.bg-toast__action {
  flex: 0 0 auto;
  min-height: 2rem;
  padding: 0 0.72rem;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 760;
  cursor: pointer;
  white-space: nowrap;
}

.bg-toast__action:hover {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-width: 540px) {
  .bg-toast {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 14px 16px;
    font-size: 14px;
  }

  .bg-toast__message {
    flex-basis: 100%;
  }
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
