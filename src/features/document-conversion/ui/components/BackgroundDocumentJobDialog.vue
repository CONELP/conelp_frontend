<template>
  <Transition name="bg-dialog">
    <div
      v-if="isVisible"
      class="bg-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="bg-dialog__backdrop" @click="handleClose" />

      <div class="bg-dialog__panel">
        <header class="bg-dialog__header">
          <h2 :id="titleId" class="bg-dialog__title">문서 생성중</h2>
          <button
            class="bg-dialog__close"
            type="button"
            aria-label="닫기"
            @click="handleClose"
          >
            ×
          </button>
        </header>

        <ul class="bg-dialog__list">
          <li
            v-for="job in pendingJobs"
            :key="job.id"
            class="bg-dialog__item"
          >
            <span class="bg-dialog__spinner" aria-hidden="true" />
            <span class="bg-dialog__item-body">
              <span class="bg-dialog__item-title">
                {{ job.documentTypeLabel }}
              </span>
              <span class="bg-dialog__item-detail">
                {{ job.photoSummary }} 을(를) 확인해서 문서를 생성중입니다. 생성이 완료되면 알려드릴게요.
              </span>
            </span>
          </li>
        </ul>

        <footer class="bg-dialog__footer">
          <button
            class="bg-dialog__primary"
            type="button"
            @click="handleClose"
          >
            확인
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useBackgroundDocumentJobsStore } from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";

const store = useBackgroundDocumentJobsStore();

const titleId = "background-document-job-dialog-title";
const pendingJobs = computed(() => store.pendingJobs);
const isVisible = computed(
  () => store.isDialogOpen && store.hasPendingJobs,
);

function handleClose() {
  store.closeDialog();
}
</script>

<style scoped>
.bg-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.bg-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 15, 30, 0.45);
}

.bg-dialog__panel {
  position: relative;
  width: min(420px, 100%);
  background: var(--surface-1);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-soft);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bg-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bg-dialog__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.bg-dialog__close {
  appearance: none;
  background: transparent;
  border: 0;
  font-size: 24px;
  line-height: 1;
  color: var(--ink-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-control);
}

.bg-dialog__close:hover {
  background: var(--surface-3);
}

.bg-dialog__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bg-dialog__item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-control);
  background: var(--primary-soft);
  align-items: flex-start;
}

.bg-dialog__spinner {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border-radius: 50%;
  border: 2px solid var(--primary-outline);
  border-top-color: var(--primary);
  animation: bg-spin 0.9s linear infinite;
  margin-top: 2px;
}

@keyframes bg-spin {
  to { transform: rotate(360deg); }
}

.bg-dialog__item-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bg-dialog__item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.bg-dialog__item-detail {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.5;
}

.bg-dialog__footer {
  display: flex;
  justify-content: flex-end;
}

.bg-dialog__primary {
  appearance: none;
  border: 0;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: var(--radius-control);
  cursor: pointer;
}

.bg-dialog__primary:hover {
  background: var(--primary-hover);
}

.bg-dialog-enter-active,
.bg-dialog-leave-active {
  transition: opacity 200ms ease;
}
.bg-dialog-enter-from,
.bg-dialog-leave-to {
  opacity: 0;
}
</style>
