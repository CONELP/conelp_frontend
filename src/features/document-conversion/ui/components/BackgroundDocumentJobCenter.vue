<template>
  <div ref="rootRef" class="background-job-center">
    <button
      class="background-job-center__button"
      :class="{
        'background-job-center__button--active': activeJobCount > 0,
        'background-job-center__button--failed': unreadFailedCount > 0,
        'background-job-center__button--pulse': isPulsing,
      }"
      type="button"
      aria-label="문서 작업"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="togglePanel"
    >
      <span
        v-if="isPulsing"
        :key="rippleRunId"
        class="background-job-center__ripples"
        aria-hidden="true"
      >
        <span
          class="background-job-center__ripple background-job-center__ripple--one"
        />
        <span
          class="background-job-center__ripple background-job-center__ripple--two"
        />
        <span
          class="background-job-center__ripple background-job-center__ripple--three"
          @animationend="handleRippleAnimationEnd"
        />
      </span>
      <img
        class="background-job-center__button-icon"
        :src="documentQueueIcon"
        alt=""
        aria-hidden="true"
      />
      <span
        v-if="activeJobCount > 0"
        class="background-job-center__count"
        aria-label="진행 중인 문서 작업 수"
      >
        {{ activeJobCount }}
      </span>
      <span
        v-else-if="unreadFailedCount > 0"
        class="background-job-center__dot background-job-center__dot--error"
        aria-hidden="true"
      />
      <span
        v-else-if="unreadCompletedCount > 0"
        class="background-job-center__dot background-job-center__dot--success"
        aria-hidden="true"
      />
    </button>

    <Transition name="background-job-center__panel-transition">
      <section
        v-if="isOpen"
        class="background-job-center__panel"
        :style="panelStyle"
        role="dialog"
        aria-label="문서 작업"
      >
        <header class="background-job-center__panel-header">
          <div class="background-job-center__panel-title-wrap">
            <h2 class="background-job-center__panel-title">문서 작업</h2>
            <p class="background-job-center__panel-summary">
              {{ panelSummary }}
            </p>
          </div>
          <button
            v-if="finishedJobCount > 0"
            class="background-job-center__clear"
            type="button"
            @click="handleClearFinished"
          >
            정리
          </button>
        </header>

        <ul
          v-if="visibleJobs.length > 0"
          class="background-job-center__list"
        >
          <li
            v-for="job in visibleJobs"
            :key="job.id"
            class="background-job-center__item"
            :class="`background-job-center__item--${job.status}`"
          >
            <span
              class="background-job-center__status-icon"
              :class="`background-job-center__status-icon--${job.status}`"
              aria-hidden="true"
            >
              <img
                v-if="job.status === 'succeeded'"
                class="background-job-center__status-image"
                :src="checkIcon"
                alt=""
              />
              <img
                v-else-if="job.status === 'failed'"
                class="background-job-center__status-image"
                :src="errorIcon"
                alt=""
              />
            </span>

            <span class="background-job-center__item-body">
              <span class="background-job-center__item-main">
                <span class="background-job-center__item-title">
                  {{ job.documentTypeLabel }}
                </span>
                <span
                  class="background-job-center__status-label"
                  :class="`background-job-center__status-label--${job.status}`"
                >
                  {{ statusLabelByStatus[job.status] }}
                </span>
              </span>
              <span class="background-job-center__item-detail">
                {{ resolveJobDetail(job) }}
              </span>
              <span
                v-if="job.errorMessage"
                class="background-job-center__item-error"
              >
                {{ job.errorMessage }}
              </span>
              <span
                v-if="job.status === 'succeeded' || job.status === 'failed'"
                class="background-job-center__actions"
              >
                <button
                  v-if="job.status === 'succeeded'"
                  class="background-job-center__action"
                  type="button"
                  @click="handleOpenResult(job)"
                >
                  결과 보기
                </button>
                <button
                  v-if="job.status === 'failed' && store.canRetryJob(job.id)"
                  class="background-job-center__action"
                  type="button"
                  @click="handleRetry(job.id)"
                >
                  다시 시도
                </button>
                <button
                  class="background-job-center__action background-job-center__action--muted"
                  type="button"
                  @click="store.dismissJob(job.id)"
                >
                  닫기
                </button>
              </span>
            </span>
          </li>
        </ul>

        <div v-else class="background-job-center__empty">
          <img
            class="background-job-center__empty-icon"
            :src="documentIcon"
            alt=""
            aria-hidden="true"
          />
          <p class="background-job-center__empty-title">
            진행 중인 문서 작업이 없어요
          </p>
        </div>
      </section>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import checkIcon from "@fluentui/svg-icons/icons/checkmark_circle_20_filled.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_24_regular.svg";
import documentQueueIcon from "@fluentui/svg-icons/icons/document_queue_24_regular.svg";
import errorIcon from "@fluentui/svg-icons/icons/error_circle_20_filled.svg";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import type {
  BackgroundDocumentJob,
  BackgroundJobStatus,
} from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";
import { useBackgroundDocumentJobsStore } from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";

const statusLabelByStatus: Record<BackgroundJobStatus, string> = {
  queued: "준비 중",
  analyzing: "분석 중",
  generating: "생성 중",
  succeeded: "완료",
  failed: "실패",
};

const store = useBackgroundDocumentJobsStore();
const router = useRouter();

const rootRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const isPulsing = ref(false);
const panelStyle = ref<Record<string, string>>({});
const rippleRunId = ref(0);
let isUnmounted = false;

const MOBILE_PANEL_QUERY = "(max-width: 1023px)";
const MOBILE_PANEL_MARGIN = 12;
const MOBILE_PANEL_WIDTH = 352;

const visibleJobs = computed(() => store.visibleJobs);
const activeJobCount = computed(() => store.activeJobs.length);
const finishedJobCount = computed(() => store.finishedJobs.length);
const unreadCompletedCount = computed(() => store.unreadCompletedCount);
const unreadFailedCount = computed(() => store.unreadFailedCount);
const panelSummary = computed(() => {
  if (activeJobCount.value > 0) {
    return "완료되면 알림으로 알려드릴게요.";
  }

  if (finishedJobCount.value > 0) {
    return "최근 완료되거나 실패한 작업을 확인할 수 있어요.";
  }

  return "새 문서를 생성하면 이곳에 표시됩니다.";
});

function resolveJobDetail(job: BackgroundDocumentJob) {
  if (job.summary) {
    return job.summary;
  }

  if (job.photoSummary) {
    return `${job.photoSummary} 기준으로 문서를 처리하고 있어요.`;
  }

  return "문서를 처리하고 있어요.";
}

function openPanel() {
  updatePanelPosition();
  isOpen.value = true;
  store.markJobsRead();
}

function closePanel() {
  isOpen.value = false;
  panelStyle.value = {};
}

function togglePanel() {
  if (isOpen.value) {
    closePanel();
    return;
  }

  openPanel();
}

function handleClearFinished() {
  store.clearFinishedJobs();
}

function handleRetry(jobId: string) {
  store.retryJob(jobId);
}

async function handleOpenResult(job: BackgroundDocumentJob) {
  closePanel();
  await router.push(job.resultRoute);
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isOpen.value) return;

  const target = event.target;
  if (!(target instanceof Node)) return;

  if (rootRef.value?.contains(target)) {
    return;
  }

  closePanel();
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closePanel();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function updatePanelPosition() {
  if (typeof window === "undefined" || !rootRef.value) {
    panelStyle.value = {};
    return;
  }

  if (!window.matchMedia(MOBILE_PANEL_QUERY).matches) {
    panelStyle.value = {};
    return;
  }

  const rect = rootRef.value.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const maxWidth = Math.max(0, viewportWidth - MOBILE_PANEL_MARGIN * 2);
  const availableWidthToTrigger = Math.max(0, rect.right - MOBILE_PANEL_MARGIN);
  const width = Math.min(MOBILE_PANEL_WIDTH, maxWidth, availableWidthToTrigger);
  const left = clamp(
    rect.right - width,
    MOBILE_PANEL_MARGIN,
    viewportWidth - MOBILE_PANEL_MARGIN - width,
  );
  const top = rect.bottom + 8;
  const maxHeight = Math.max(176, viewportHeight - top - MOBILE_PANEL_MARGIN);

  panelStyle.value = {
    "--background-job-center-panel-left": `${left}px`,
    "--background-job-center-panel-top": `${top}px`,
    "--background-job-center-panel-width": `${width}px`,
    "--background-job-center-panel-max-height": `${maxHeight}px`,
  };
}

function handleViewportChange() {
  if (!isOpen.value) return;
  updatePanelPosition();
}

async function startRippleSequence() {
  isPulsing.value = false;
  await nextTick();

  if (isUnmounted) return;

  rippleRunId.value += 1;
  isPulsing.value = true;
}

function handleRippleAnimationEnd() {
  isPulsing.value = false;
}

watch(
  activeJobCount,
  (count, previousCount) => {
    const previous = previousCount ?? 0;

    if (count > previous) {
      void startRippleSequence();
    }
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("scroll", handleViewportChange, true);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
});

onUnmounted(() => {
  isUnmounted = true;
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleDocumentKeydown);
  window.removeEventListener("resize", handleViewportChange);
  window.removeEventListener("scroll", handleViewportChange, true);
  window.visualViewport?.removeEventListener("resize", handleViewportChange);
});
</script>

<style scoped>
.background-job-center {
  position: relative;
  flex: 0 0 auto;
}

.background-job-center__button {
  position: relative;
  overflow: visible;
  isolation: isolate;
  display: inline-flex;
  width: 2.2rem;
  height: 2.2rem;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, box-shadow 160ms ease,
    transform 160ms ease;
}

.background-job-center__button:hover,
.background-job-center__button[aria-expanded="true"] {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.16);
}

.background-job-center__button--active {
  border-color: rgba(33, 115, 70, 0.35);
  box-shadow: 0 0 0 3px rgba(33, 115, 70, 0.08);
}

.background-job-center__button--failed {
  border-color: rgba(178, 45, 45, 0.36);
}

.background-job-center__button--pulse {
  animation: background-job-center-ripple-button 900ms ease 1;
}

.background-job-center__ripples,
.background-job-center__ripple {
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.background-job-center__ripples {
  inset: 0;
  z-index: 0;
}

.background-job-center__ripple {
  inset: -0.72rem;
  border: 2px solid rgba(33, 115, 70, 0.36);
  opacity: 0;
  animation: background-job-center-ripple-ring 1000ms ease-out 1;
}

.background-job-center__ripple--two {
  animation-delay: 180ms;
}

.background-job-center__ripple--three {
  animation-delay: 360ms;
}

.background-job-center__button-icon {
  position: relative;
  z-index: 1;
  width: 1.1rem;
  height: 1.1rem;
  opacity: 0.76;
}

.background-job-center__count {
  position: absolute;
  z-index: 2;
  top: -0.22rem;
  right: -0.24rem;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.26rem;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #217346;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 760;
  line-height: 0.86rem;
  text-align: center;
  box-sizing: border-box;
}

.background-job-center__dot {
  position: absolute;
  z-index: 2;
  top: 0.12rem;
  right: 0.12rem;
  width: 0.48rem;
  height: 0.48rem;
  border: 2px solid #fff;
  border-radius: 999px;
}

.background-job-center__dot--success {
  background: #217346;
}

.background-job-center__dot--error {
  background: #b32d2d;
}

.background-job-center__panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 80;
  width: min(23rem, calc(100vw - 1.5rem));
  max-height: min(28rem, calc(100vh - 7rem));
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.85rem;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.16);
  box-sizing: border-box;
}

.background-job-center__panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.background-job-center__panel-title-wrap {
  min-width: 0;
}

.background-job-center__panel-title {
  margin: 0;
  color: var(--ink);
  font-size: 0.96rem;
  font-weight: 760;
  line-height: 1.25;
}

.background-job-center__panel-summary {
  margin: 0.22rem 0 0;
  color: var(--ink-muted);
  font-size: 0.76rem;
  line-height: 1.4;
}

.background-job-center__clear {
  flex: 0 0 auto;
  min-height: 1.8rem;
  padding: 0 0.56rem;
  border: 1px solid var(--outline-soft);
  border-radius: 6px;
  background: #fff;
  color: var(--ink-muted);
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
}

.background-job-center__clear:hover {
  background: #f3f4f6;
  color: var(--ink);
}

.background-job-center__list {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.48rem;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.background-job-center__item {
  display: flex;
  gap: 0.62rem;
  padding: 0.72rem;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  background: #fafafa;
}

.background-job-center__item--succeeded {
  background: #f6fbf8;
  border-color: rgba(33, 115, 70, 0.14);
}

.background-job-center__item--failed {
  background: #fff7f7;
  border-color: rgba(179, 45, 45, 0.14);
}

.background-job-center__status-icon {
  width: 1.16rem;
  height: 1.16rem;
  flex: 0 0 1.16rem;
  border-radius: 999px;
  margin-top: 0.08rem;
}

.background-job-center__status-icon--queued,
.background-job-center__status-icon--analyzing,
.background-job-center__status-icon--generating {
  border: 2px solid rgba(33, 115, 70, 0.2);
  border-top-color: #217346;
  animation: background-job-center-spin 900ms linear infinite;
  box-sizing: border-box;
}

.background-job-center__status-image {
  display: block;
  width: 100%;
  height: 100%;
}

.background-job-center__item-body {
  min-width: 0;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.3rem;
}

.background-job-center__item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  min-width: 0;
}

.background-job-center__item-title {
  min-width: 0;
  overflow: hidden;
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.background-job-center__status-label {
  flex: 0 0 auto;
  color: var(--ink-muted);
  font-size: 0.7rem;
  font-weight: 720;
}

.background-job-center__status-label--succeeded {
  color: #217346;
}

.background-job-center__status-label--failed {
  color: #b32d2d;
}

.background-job-center__item-detail,
.background-job-center__item-error {
  color: var(--ink-muted);
  font-size: 0.76rem;
  line-height: 1.45;
  word-break: keep-all;
}

.background-job-center__item-error {
  color: #9f2a2a;
}

.background-job-center__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  padding-top: 0.12rem;
}

.background-job-center__action {
  min-height: 1.8rem;
  padding: 0 0.62rem;
  border: 1px solid rgba(33, 115, 70, 0.24);
  border-radius: 6px;
  background: #fff;
  color: #1c5f3b;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.background-job-center__action:hover {
  background: #eef8f2;
}

.background-job-center__action--muted {
  border-color: var(--outline-soft);
  color: var(--ink-muted);
}

.background-job-center__action--muted:hover {
  background: #f3f4f6;
  color: var(--ink);
}

.background-job-center__empty {
  display: flex;
  min-height: 8rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.58rem;
  color: var(--ink-muted);
  text-align: center;
}

.background-job-center__empty-icon {
  width: 1.55rem;
  height: 1.55rem;
  opacity: 0.5;
}

.background-job-center__empty-title {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 650;
}

.background-job-center__panel-transition-enter-active,
.background-job-center__panel-transition-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.background-job-center__panel-transition-enter-from,
.background-job-center__panel-transition-leave-to {
  opacity: 0;
  transform: translateY(-0.24rem);
}

@keyframes background-job-center-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes background-job-center-ripple-button {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes background-job-center-ripple-ring {
  0% {
    opacity: 0.5;
    transform: scale(0.62);
  }
  70% {
    opacity: 0.16;
  }
  100% {
    opacity: 0;
    transform: scale(2.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .background-job-center__button--pulse,
  .background-job-center__ripple {
    animation: none;
  }

  .background-job-center__ripples {
    display: none;
  }
}

@media (max-width: 1023px) {
  .background-job-center__panel {
    position: fixed;
    top: var(--background-job-center-panel-top, 0.75rem);
    left: var(--background-job-center-panel-left, 0.75rem);
    right: auto;
    width: var(--background-job-center-panel-width, calc(100vw - 1.5rem));
    max-width: calc(100vw - 1.5rem);
    max-height: min(
      26rem,
      var(--background-job-center-panel-max-height, 26rem)
    );
  }
}
</style>
