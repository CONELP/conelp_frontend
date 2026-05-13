<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import DailyReportEditorPanel from "@/features/document-conversion-demo/ui/components/DailyReportEditorPanel.vue";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import { useDesktopScheduleViewModel } from "@/features/desktop-schedule/state/useDesktopScheduleViewModel";
import DesktopScheduleColorPalette from "@/features/desktop-schedule/ui/components/DesktopScheduleColorPalette.vue";
import DesktopScheduleContextMenu from "@/features/desktop-schedule/ui/components/DesktopScheduleContextMenu.vue";
import DesktopScheduleShell from "@/features/desktop-schedule/ui/components/DesktopScheduleShell.vue";
import "@/features/desktop-schedule/ui/styles/DesktopSchedulePage.css";

const DAILY_REPORT_LAYOUT_STORAGE_KEY = "conelp.dailyReportWrite.layoutRatio.v1";
const DAILY_REPORT_DEFAULT_SCHEDULE_RATIO = 0.67;
const DAILY_REPORT_MIN_SCHEDULE_WIDTH = 520;
const DAILY_REPORT_MIN_PANEL_WIDTH = 304;
const DAILY_REPORT_SPLITTER_WIDTH = 10;

type LayoutResizeState = {
  pointerId: number;
  layoutLeft: number;
  layoutWidth: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredScheduleRatio() {
  if (typeof window === "undefined") {
    return DAILY_REPORT_DEFAULT_SCHEDULE_RATIO;
  }

  const storedValue = window.localStorage.getItem(DAILY_REPORT_LAYOUT_STORAGE_KEY);
  const parsedValue = storedValue === null ? Number.NaN : Number.parseFloat(storedValue);

  return Number.isFinite(parsedValue)
    ? clampNumber(parsedValue, 0.35, 0.82)
    : DAILY_REPORT_DEFAULT_SCHEDULE_RATIO;
}

const {
  scheduleLoadStatus,
  scheduleLoadErrorMessage,
  scheduleToast,
  scheduleVersions,
  selectedScheduleVersionId,
  scheduleVersionReviewState,
  scheduleVersionPromotionState,
  selectionState,
  contextMenuState,
  contextMenuItems,
  colorPaletteState,
  connectionCreationState,
  renamingDivisionId,
  renamingWorkTypeId,
  renamingSubWorkTypeId,
  renamingItemId,
  renamingMilestoneId,
  timeline,
  shellLayout,
  rowPanelWidth,
  workTypeColumnWidth,
  chartScrollTop,
  chartScrollLeft,
  interactionCancelVersion,
  zoomScale,
  currentZoomIndex,
  maxZoomIndex,
  canZoomIn,
  canZoomOut,
  loadSchedule,
  clearSelection,
  syncChartScroll,
  setRowPanelWidth,
  setWorkTypeColumnWidth,
  selectBars,
  selectRows,
  deleteSelection,
  startDivisionRename,
  commitDivisionRename,
  cancelDivisionRename,
  startWorkTypeRename,
  commitWorkTypeRename,
  cancelWorkTypeRename,
  startSubWorkTypeRename,
  commitSubWorkTypeRename,
  cancelSubWorkTypeRename,
  reorderReferenceDivisions,
  reorderReferenceWorkTypes,
  openItemContextMenu,
  openWorkConnectionContextMenu,
  openMilestoneContextMenu,
  openRowContextMenu,
  openScheduleHeaderContextMenu,
  openCanvasContextMenu,
  executeContextMenuCommand,
  closeContextMenu,
  closeColorPalette,
  applyColorSelection,
  startItemRename,
  commitItemRename,
  cancelItemRename,
  startMilestoneRename,
  commitMilestoneRename,
  cancelMilestoneRename,
  cancelConnectionCreation,
  completeConnectionCreation,
  activateMilestone,
  startMoveSession,
  previewMoveSession,
  endMoveSession,
  startResizeSession,
  previewResizeSession,
  endResizeSession,
  setZoomIndex,
  zoomIn,
  zoomOut,
  notifyReadOnlyScheduleAction,
} = useDesktopScheduleViewModel();

const layoutRef = ref<HTMLElement | null>(null);
const shellHostRef = ref<HTMLElement | null>(null);
const shellViewportHeight = ref(640);
const chartViewportWidth = ref(0);
const layoutContentWidth = ref(0);
const scheduleColumnRatio = ref(readStoredScheduleRatio());
const layoutResizeState = ref<LayoutResizeState | null>(null);
const shouldApplyInitialTimelineScroll = ref(
  scheduleLoadStatus.value !== "success",
);
const isBaselineScheduleLoadInFlight = ref(false);
let resizeObserver: ResizeObserver | null = null;

const isScheduleRefreshing = computed(
  () =>
    scheduleLoadStatus.value === "loading" &&
    selectedScheduleVersionId.value !== null,
);
const baselineScheduleVersionId = computed(
  () => scheduleVersions.value.find((version) => version.isMain)?.id ?? null,
);
const effectiveScheduleColumnRatio = computed(() =>
  clampScheduleRatio(scheduleColumnRatio.value, layoutContentWidth.value),
);
const layoutStyle = computed(() => {
  if (layoutContentWidth.value <= 0) {
    return {};
  }

  const availableWidth = Math.max(layoutContentWidth.value - DAILY_REPORT_SPLITTER_WIDTH, 0);
  const scheduleColumnWidth = Math.round(availableWidth * effectiveScheduleColumnRatio.value);
  const panelColumnWidth = Math.max(availableWidth - scheduleColumnWidth, 0);

  return {
    "--daily-report-schedule-column": `${scheduleColumnWidth}px`,
    "--daily-report-panel-column": `${panelColumnWidth}px`,
    "--daily-report-splitter-width": `${DAILY_REPORT_SPLITTER_WIDTH}px`,
  };
});

function getElementContentWidth(element: HTMLElement) {
  const elementStyle = window.getComputedStyle(element);
  const horizontalPadding =
    Number.parseFloat(elementStyle.paddingLeft) + Number.parseFloat(elementStyle.paddingRight);

  return Math.max(element.clientWidth - horizontalPadding, 0);
}

function clampScheduleRatio(ratio: number, contentWidth = layoutContentWidth.value) {
  const availableWidth = Math.max(contentWidth - DAILY_REPORT_SPLITTER_WIDTH, 1);
  const minRatio = DAILY_REPORT_MIN_SCHEDULE_WIDTH / availableWidth;
  const maxRatio = 1 - DAILY_REPORT_MIN_PANEL_WIDTH / availableWidth;

  if (minRatio > maxRatio) {
    return clampNumber(ratio, 0.45, 0.72);
  }

  return clampNumber(ratio, minRatio, maxRatio);
}

function syncLayoutContentWidth() {
  if (!layoutRef.value) {
    return;
  }

  layoutContentWidth.value = getElementContentWidth(layoutRef.value);
}

function syncShellViewport() {
  if (!shellHostRef.value) {
    return;
  }

  const hostStyle = window.getComputedStyle(shellHostRef.value);
  const verticalPadding =
    Number.parseFloat(hostStyle.paddingTop) + Number.parseFloat(hostStyle.paddingBottom);
  const horizontalPadding =
    Number.parseFloat(hostStyle.paddingLeft) + Number.parseFloat(hostStyle.paddingRight);

  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight - verticalPadding, 320);
  chartViewportWidth.value = Math.max(
    shellHostRef.value.clientWidth - horizontalPadding - rowPanelWidth.value,
    0,
  );
}

function syncDailyReportLayout() {
  syncLayoutContentWidth();
  syncShellViewport();
}

function persistScheduleColumnRatio() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DAILY_REPORT_LAYOUT_STORAGE_KEY,
    effectiveScheduleColumnRatio.value.toFixed(4),
  );
}

function handleLayoutResizeMove(event: PointerEvent) {
  const resizeState = layoutResizeState.value;

  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }

  const availableWidth = Math.max(resizeState.layoutWidth - DAILY_REPORT_SPLITTER_WIDTH, 1);
  const nextScheduleWidth = event.clientX - resizeState.layoutLeft - DAILY_REPORT_SPLITTER_WIDTH / 2;
  const nextRatio = clampScheduleRatio(nextScheduleWidth / availableWidth, resizeState.layoutWidth);
  scheduleColumnRatio.value = nextRatio;
  requestAnimationFrame(syncShellViewport);
}

function endLayoutResize(event: PointerEvent) {
  const resizeState = layoutResizeState.value;

  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }

  layoutResizeState.value = null;
  persistScheduleColumnRatio();
  window.removeEventListener("pointermove", handleLayoutResizeMove, true);
  window.removeEventListener("pointerup", endLayoutResize, true);
  window.removeEventListener("pointercancel", endLayoutResize, true);
  requestAnimationFrame(syncShellViewport);
}

function startLayoutResize(event: PointerEvent) {
  if (!layoutRef.value) {
    return;
  }

  event.preventDefault();
  const layoutRect = layoutRef.value.getBoundingClientRect();
  const layoutStyleDeclaration = window.getComputedStyle(layoutRef.value);
  const paddingLeft = Number.parseFloat(layoutStyleDeclaration.paddingLeft);

  layoutResizeState.value = {
    pointerId: event.pointerId,
    layoutLeft: layoutRect.left + paddingLeft,
    layoutWidth: layoutContentWidth.value || getElementContentWidth(layoutRef.value),
  };

  window.addEventListener("pointermove", handleLayoutResizeMove, true);
  window.addEventListener("pointerup", endLayoutResize, true);
  window.addEventListener("pointercancel", endLayoutResize, true);
}

function handleRowPanelWidthChange(width: number) {
  setRowPanelWidth(width);
  syncShellViewport();
}

function handleWorkTypeColumnWidthChange(width: number) {
  setWorkTypeColumnWidth(width);
}

function handleZoomIn() {
  zoomIn(chartViewportWidth.value);
}

function handleZoomOut() {
  zoomOut(chartViewportWidth.value);
}

function handleZoomChange(zoomIndex: number) {
  setZoomIndex(zoomIndex, chartViewportWidth.value);
}

function handleScheduleReload() {
  shouldApplyInitialTimelineScroll.value = true;
  void loadBaselineSchedule();
}

async function ensureBaselineScheduleSelected() {
  const baselineId = baselineScheduleVersionId.value;

  if (
    baselineId === null ||
    selectedScheduleVersionId.value === baselineId ||
    isBaselineScheduleLoadInFlight.value
  ) {
    return;
  }

  isBaselineScheduleLoadInFlight.value = true;

  try {
    shouldApplyInitialTimelineScroll.value = true;
    await loadSchedule({ scheduleVersionId: baselineId });
  } finally {
    isBaselineScheduleLoadInFlight.value = false;
  }
}

async function loadBaselineSchedule() {
  await loadSchedule();
  await ensureBaselineScheduleSelected();
}

onMounted(() => {
  if (shellHostRef.value || layoutRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncDailyReportLayout();
    });
    if (layoutRef.value) {
      resizeObserver.observe(layoutRef.value);
    }
    if (shellHostRef.value) {
      resizeObserver.observe(shellHostRef.value);
    }
    syncDailyReportLayout();
  }

  if (scheduleLoadStatus.value === "idle") {
    void loadBaselineSchedule();
  } else {
    void ensureBaselineScheduleSelected();
  }
});

onUnmounted(() => {
  window.removeEventListener("pointermove", handleLayoutResizeMove, true);
  window.removeEventListener("pointerup", endLayoutResize, true);
  window.removeEventListener("pointercancel", endLayoutResize, true);
  resizeObserver?.disconnect();
  resizeObserver = null;
  closeContextMenu();
  closeColorPalette();
  cancelConnectionCreation();
});

watch(
  () =>
    [
      scheduleLoadStatus.value,
      baselineScheduleVersionId.value,
      selectedScheduleVersionId.value,
    ] as const,
  ([nextScheduleLoadStatus]) => {
    if (nextScheduleLoadStatus !== "success") {
      return;
    }

    void ensureBaselineScheduleSelected();
  },
);

watch(
  () =>
    [
      scheduleLoadStatus.value,
      timeline.value,
      chartViewportWidth.value,
    ] as const,
  async ([nextScheduleLoadStatus, nextTimeline, nextChartViewportWidth]) => {
    if (
      nextScheduleLoadStatus !== "success" ||
      !shouldApplyInitialTimelineScroll.value ||
      nextChartViewportWidth <= 0
    ) {
      return;
    }

    await nextTick();
    syncChartScroll({
      top: 0,
      left: desktopScheduleService.getInitialScrollLeftForYesterday(
        nextTimeline,
        nextChartViewportWidth,
      ),
    });
    shouldApplyInitialTimelineScroll.value = false;
  },
  { immediate: true },
);

</script>

<template>
  <main class="daily-report-write-page">
    <DesktopAppHeader />

    <Transition name="desktop-schedule-toast">
      <div
        v-if="scheduleToast.visible"
        class="desktop-schedule-page__toast"
        :class="`desktop-schedule-page__toast--${scheduleToast.tone}`"
        role="status"
        aria-live="polite"
      >
        {{ scheduleToast.message }}
      </div>
    </Transition>

    <section
      ref="layoutRef"
      class="daily-report-write-layout"
      :class="{ 'daily-report-write-layout--resizing': layoutResizeState }"
      :style="layoutStyle"
    >
      <section
        ref="shellHostRef"
        class="daily-report-write-schedule"
        aria-label="공정표"
      >
        <div
          v-if="
            scheduleLoadStatus === 'idle' ||
            (scheduleLoadStatus === 'loading' && !isScheduleRefreshing)
          "
          class="desktop-schedule-page__state"
        >
          <p class="desktop-schedule-page__state-title">
            공정표 데이터를 불러오는 중이에요.
          </p>
        </div>

        <div
          v-else-if="scheduleLoadStatus === 'error'"
          class="desktop-schedule-page__state"
        >
          <p class="desktop-schedule-page__state-title">
            공정표 데이터를 불러오지 못했어요.
          </p>
          <p class="desktop-schedule-page__state-description">
            {{ scheduleLoadErrorMessage }}
          </p>
          <button
            type="button"
            class="desktop-schedule-page__state-action"
            @click="handleScheduleReload"
          >
            다시 불러오기
          </button>
        </div>

        <template v-else>
          <DesktopScheduleShell
            :timeline="timeline"
            :shell-layout="shellLayout"
            :read-only="true"
            reference-only
            :schedule-versions="scheduleVersions"
            :selected-schedule-version-id="selectedScheduleVersionId"
            version-name="기준 공정표"
            version-mode-label="기준 공정표"
            version-access-label="읽기 전용"
            suggested-draft-version-name=""
            :can-create-draft-version="false"
            :can-compare-schedule-version="false"
            :can-promote-schedule-version="false"
            :schedule-version-review="scheduleVersionReviewState"
            :schedule-version-promotion="scheduleVersionPromotionState"
            :viewport-height="shellViewportHeight"
            :scroll-top="chartScrollTop"
            :scroll-left="chartScrollLeft"
            :interaction-cancel-version="interactionCancelVersion"
            :selected-row-ids="selectionState.rowIds"
            :selected-item-ids="selectionState.itemIds"
            :selected-work-connection-ids="selectionState.workConnectionIds"
            :selected-milestone-ids="selectionState.milestoneIds"
            :connection-creation-state="connectionCreationState"
            :row-panel-width="rowPanelWidth"
            :work-type-column-width="workTypeColumnWidth"
            :editing-division-id="renamingDivisionId"
            :editing-work-type-id="renamingWorkTypeId"
            :editing-sub-work-type-id="renamingSubWorkTypeId"
            :editing-item-id="renamingItemId"
            :editing-milestone-id="renamingMilestoneId"
            :zoom-index="currentZoomIndex"
            :zoom-max="maxZoomIndex"
            :zoom-scale="zoomScale"
            :can-zoom-in="canZoomIn"
            :can-zoom-out="canZoomOut"
            :can-undo="false"
            :can-redo="false"
            @scroll-sync="syncChartScroll"
            @row-panel-width-change="handleRowPanelWidthChange"
            @work-type-column-width-change="handleWorkTypeColumnWidthChange"
            @readonly-edit-attempt="notifyReadOnlyScheduleAction"
            @clear-selection="clearSelection"
            @select-bars="selectBars"
            @select-row="(rowId: string) => selectRows({ rowIds: [rowId] })"
            @start-division-rename="startDivisionRename"
            @commit-division-rename="commitDivisionRename"
            @cancel-division-rename="cancelDivisionRename"
            @start-work-type-rename="startWorkTypeRename"
            @commit-work-type-rename="commitWorkTypeRename"
            @cancel-work-type-rename="cancelWorkTypeRename"
            @start-sub-work-type-rename="startSubWorkTypeRename"
            @commit-sub-work-type-rename="commitSubWorkTypeRename"
            @cancel-sub-work-type-rename="cancelSubWorkTypeRename"
            @reorder-divisions="reorderReferenceDivisions"
            @reorder-work-types="reorderReferenceWorkTypes"
            @delete-selection="deleteSelection"
            @item-context-menu="openItemContextMenu"
            @work-connection-context-menu="openWorkConnectionContextMenu"
            @milestone-context-menu="openMilestoneContextMenu"
            @row-context-menu="openRowContextMenu"
            @header-context-menu="openScheduleHeaderContextMenu"
            @canvas-context-menu="openCanvasContextMenu"
            @cancel-connection-create="cancelConnectionCreation"
            @complete-connection-create="completeConnectionCreation"
            @start-item-rename="startItemRename"
            @commit-item-rename="commitItemRename"
            @cancel-item-rename="cancelItemRename"
            @start-milestone-rename="startMilestoneRename"
            @commit-milestone-rename="commitMilestoneRename"
            @cancel-milestone-rename="cancelMilestoneRename"
            @milestone-activate="activateMilestone"
            @move-start="startMoveSession"
            @move-preview="previewMoveSession"
            @move-end="endMoveSession"
            @resize-start="startResizeSession"
            @resize-preview="previewResizeSession"
            @resize-end="endResizeSession"
            @zoom-in="handleZoomIn"
            @zoom-out="handleZoomOut"
            @zoom-change="handleZoomChange"
          />

          <DesktopScheduleContextMenu
            :open="contextMenuState.open"
            :x="contextMenuState.x"
            :y="contextMenuState.y"
            :items="contextMenuItems"
            @close="closeContextMenu"
            @select="executeContextMenuCommand"
          />

          <DesktopScheduleColorPalette
            :open="colorPaletteState.open"
            :x="colorPaletteState.x"
            :y="colorPaletteState.y"
            :selected-color="colorPaletteState.selectedColor"
            @close="closeColorPalette"
            @select="applyColorSelection"
          />

          <Transition name="desktop-schedule-refresh">
            <div
              v-if="isScheduleRefreshing"
              class="desktop-schedule-page__refresh-overlay"
              role="status"
              aria-live="polite"
            >
              <div class="desktop-schedule-page__refresh-card">
                <span
                  class="desktop-schedule-page__refresh-indicator"
                  aria-hidden="true"
                />
                <span>공정표를 불러오는 중이에요.</span>
              </div>
            </div>
          </Transition>
        </template>
      </section>

      <button
        type="button"
        class="daily-report-write-splitter"
        aria-label="공정표와 작업 작성 영역 너비 조절"
        title="드래그해서 영역 너비 조절"
        @pointerdown="startLayoutResize"
      >
        <span class="daily-report-write-splitter__line" aria-hidden="true" />
      </button>

      <DailyReportEditorPanel class="daily-report-write-editor-panel" />
    </section>
  </main>
</template>

<style scoped src="./styles/DailyReportWritePage.css"></style>
