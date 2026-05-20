<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import DailyReportEditorPanel from "@/features/document-conversion/ui/components/DailyReportEditorPanel.vue";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import { useDesktopScheduleViewModel } from "@/features/desktop-schedule/state/useDesktopScheduleViewModel";
import DesktopScheduleColorPalette from "@/features/desktop-schedule/ui/components/DesktopScheduleColorPalette.vue";
import DesktopScheduleContextMenu from "@/features/desktop-schedule/ui/components/DesktopScheduleContextMenu.vue";
import DesktopScheduleShell from "@/features/desktop-schedule/ui/components/DesktopScheduleShell.vue";
import { analyticsClient } from "@/shared/analytics/analytics-stub";
import "@/features/desktop-schedule/ui/styles/DesktopSchedulePage.css";

const DAILY_REPORT_PANEL_WIDTH_STORAGE_KEY = "conelp.schedule.dailyReportPanelWidth.v1";
const DAILY_REPORT_PANEL_DEFAULT_WIDTH = 464;
const DAILY_REPORT_PANEL_MIN_WIDTH = 336;
const DAILY_REPORT_PANEL_MAX_WIDTH = 640;
const DAILY_REPORT_PANEL_SPLITTER_WIDTH = 10;
const DAILY_REPORT_MIN_WORKSPACE_WIDTH = 640;
const DAILY_REPORT_PANEL_TOP_OFFSET = 48;

type DailyReportPanelResizeState = {
  pointerId: number;
  startClientX: number;
  startWidth: number;
};

type ScheduleGridCell = {
  rowId: string;
  date: string;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredDailyReportPanelWidth() {
  if (typeof window === "undefined") {
    return DAILY_REPORT_PANEL_DEFAULT_WIDTH;
  }

  const storedValue = window.localStorage.getItem(
    DAILY_REPORT_PANEL_WIDTH_STORAGE_KEY,
  );
  const parsedValue =
    storedValue === null ? Number.NaN : Number.parseFloat(storedValue);

  return Number.isFinite(parsedValue)
    ? clampNumber(
        parsedValue,
        DAILY_REPORT_PANEL_MIN_WIDTH,
        DAILY_REPORT_PANEL_MAX_WIDTH,
      )
    : DAILY_REPORT_PANEL_DEFAULT_WIDTH;
}

const scheduleVm = useDesktopScheduleViewModel();
const {
  load,
  access,
  version,
  importFlow,
  selection,
  contextMenu,
  colorPalette,
  rename,
  reference,
  layout,
  scroll,
  history,
  connection,
  milestone,
  interaction,
  zoom,
  aiVerification,
  dailyReport,
  clipboard,
} = scheduleVm;

const shellLayoutRef = ref<HTMLElement | null>(null);
const shellHostRef = ref<HTMLElement | null>(null);
const shellViewportHeight = ref(640);
const chartViewportWidth = ref(0);
const selectedScheduleCell = ref<ScheduleGridCell | null>(null);
const isDailyReportPanelOpen = ref(true);
const dailyReportPanelWidth = ref(readStoredDailyReportPanelWidth());
const dailyReportPanelResizeState = ref<DailyReportPanelResizeState | null>(null);
const shouldApplyInitialTimelineScroll = ref(
  load.status !== "success",
);
let resizeObserver: ResizeObserver | null = null;

const isScheduleRefreshing = computed(
  () =>
    load.status === "loading" &&
    version.selectedId !== null,
);
const showDailyReportEditor = computed(
  () => access.isCurrentMainScheduleVersionSelected && isDailyReportPanelOpen.value,
);
const scheduleShellStyle = computed(() => ({
  "--desktop-schedule-daily-report-panel-width": showDailyReportEditor.value
    ? `${dailyReportPanelWidth.value}px`
    : "0px",
  "--desktop-schedule-daily-report-splitter-width": showDailyReportEditor.value
    ? `${DAILY_REPORT_PANEL_SPLITTER_WIDTH}px`
    : "0px",
  "--desktop-schedule-daily-report-panel-top-offset": `${DAILY_REPORT_PANEL_TOP_OFFSET}px`,
}));

function syncShellViewport() {
  if (!shellHostRef.value) {
    return;
  }

  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight, 320);
  chartViewportWidth.value = Math.max(
    shellHostRef.value.clientWidth - layout.rowPanelWidth,
    0,
  );
}

function handleRowPanelWidthChange(width: number) {
  layout.setRowPanelWidth(width);
  syncShellViewport();
}

function handleWorkTypeColumnWidthChange(width: number) {
  layout.setWorkTypeColumnWidth(width);
}

function handleZoomIn() {
  zoom.zoomIn(chartViewportWidth.value);
}

function handleZoomOut() {
  zoom.zoomOut(chartViewportWidth.value);
}

function handleZoomChange(zoomIndex: number) {
  zoom.setIndex(zoomIndex, chartViewportWidth.value);
}

function handleScheduleCellSelectionChange(cell: ScheduleGridCell | null) {
  selectedScheduleCell.value = cell;
}

function requestInitialTimelineScroll() {
  shouldApplyInitialTimelineScroll.value = true;
}

function handleScheduleReload() {
  requestInitialTimelineScroll();
  void load.schedule();
}

watch(() => version.selectedId, (next, prev) => {
  if (next !== prev) {
    requestInitialTimelineScroll();
  }
});

function handleToggleDailyReportPanel() {
  if (!access.isCurrentMainScheduleVersionSelected) {
    return;
  }

  isDailyReportPanelOpen.value = !isDailyReportPanelOpen.value;
  analyticsClient.trackAction("schedule", "toggle_daily_report_panel", "success", {
    active: isDailyReportPanelOpen.value,
  });
}

function handleDailyReportDateChange(payload: {
  source: "calendar" | "nav" | "today";
  unit: "date" | "day" | "month";
  direction: "current" | "next" | "previous";
}) {
  analyticsClient.trackAction("schedule", "change_daily_report_date", "success", {
    source: payload.source,
    change_unit: payload.unit,
    change_direction: payload.direction,
  });
}

function getDailyReportPanelMaxWidth() {
  const shellWidth = shellLayoutRef.value?.clientWidth ?? 0;

  if (shellWidth <= 0) {
    return DAILY_REPORT_PANEL_MAX_WIDTH;
  }

  return Math.min(
    DAILY_REPORT_PANEL_MAX_WIDTH,
    Math.max(
      DAILY_REPORT_PANEL_MIN_WIDTH,
      shellWidth -
        DAILY_REPORT_MIN_WORKSPACE_WIDTH -
        DAILY_REPORT_PANEL_SPLITTER_WIDTH,
    ),
  );
}

function clampDailyReportPanelWidth(width: number) {
  return clampNumber(
    width,
    DAILY_REPORT_PANEL_MIN_WIDTH,
    getDailyReportPanelMaxWidth(),
  );
}

function persistDailyReportPanelWidth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DAILY_REPORT_PANEL_WIDTH_STORAGE_KEY,
    String(Math.round(dailyReportPanelWidth.value)),
  );
}

function handleDailyReportPanelResizeMove(event: PointerEvent) {
  const resizeState = dailyReportPanelResizeState.value;

  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }

  const dragDelta = event.clientX - resizeState.startClientX;
  dailyReportPanelWidth.value = clampDailyReportPanelWidth(
    resizeState.startWidth - dragDelta,
  );
  requestAnimationFrame(syncShellViewport);
}

function endDailyReportPanelResize(event: PointerEvent) {
  const resizeState = dailyReportPanelResizeState.value;

  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }

  dailyReportPanelResizeState.value = null;
  persistDailyReportPanelWidth();
  window.removeEventListener("pointermove", handleDailyReportPanelResizeMove, true);
  window.removeEventListener("pointerup", endDailyReportPanelResize, true);
  window.removeEventListener("pointercancel", endDailyReportPanelResize, true);
  requestAnimationFrame(syncShellViewport);
}

function startDailyReportPanelResize(event: PointerEvent) {
  if (!showDailyReportEditor.value) {
    return;
  }

  event.preventDefault();
  dailyReportPanelResizeState.value = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startWidth: dailyReportPanelWidth.value,
  };

  window.addEventListener("pointermove", handleDailyReportPanelResizeMove, true);
  window.addEventListener("pointerup", endDailyReportPanelResize, true);
  window.addEventListener("pointercancel", endDailyReportPanelResize, true);
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function getScheduleShortcutKey(event: KeyboardEvent) {
  switch (event.code) {
    case "KeyC":
      return "c";
    case "KeyX":
      return "x";
    case "KeyV":
      return "v";
    case "KeyZ":
      return "z";
    case "KeyY":
      return "y";
    default:
      return event.key.toLowerCase();
  }
}

function claimScheduleShortcut(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function handleScheduleShortcut(event: KeyboardEvent) {
  if (
    isEditableKeyboardTarget(event.target) ||
    (!event.metaKey && !event.ctrlKey)
  ) {
    return;
  }

  const key = getScheduleShortcutKey(event);
  const isCopy = key === "c" && !event.shiftKey && !event.altKey;
  const isCut = key === "x" && !event.shiftKey && !event.altKey;
  const isPaste = key === "v" && !event.shiftKey && !event.altKey;
  const isUndo = key === "z" && !event.shiftKey;
  const isRedo = (key === "z" && event.shiftKey) || key === "y";

  if (!isCopy && !isCut && !isPaste && !isUndo && !isRedo) {
    return;
  }

  if (isCopy || isCut) {
    if (
      selection.state.itemIds.length === 0 &&
      selection.state.milestoneIds.length === 0
    ) {
      return;
    }

    claimScheduleShortcut(event);
    if (isCut) {
      clipboard.cutItems();
      return;
    }

    clipboard.copyItems();
    return;
  }

  if (isPaste) {
    if (!selectedScheduleCell.value) {
      return;
    }

    claimScheduleShortcut(event);
    void clipboard.pasteItemsToCell(selectedScheduleCell.value);
    return;
  }

  claimScheduleShortcut(event);

  if (isUndo) {
    history.undo();
    return;
  }

  history.redo();
}

onMounted(() => {
  window.addEventListener("keydown", handleScheduleShortcut);

  if (shellHostRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncShellViewport();
    });
    resizeObserver.observe(shellHostRef.value);
    syncShellViewport();
  }

  if (load.status === "idle") {
    void load.schedule();
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleScheduleShortcut);
  window.removeEventListener("pointermove", handleDailyReportPanelResizeMove, true);
  window.removeEventListener("pointerup", endDailyReportPanelResize, true);
  window.removeEventListener("pointercancel", endDailyReportPanelResize, true);
  resizeObserver?.disconnect();
  resizeObserver = null;
  contextMenu.close();
  colorPalette.close();
  connection.cancelCreation();
});

watch(
  () =>
    [
      load.status,
      chartViewportWidth.value,
      showDailyReportEditor.value,
    ] as const,
  async ([nextScheduleLoadStatus, nextChartViewportWidth]) => {
    if (
      nextScheduleLoadStatus !== "success" ||
      !shouldApplyInitialTimelineScroll.value ||
      nextChartViewportWidth <= 0
    ) {
      return;
    }

    await nextTick();
    if (
      load.status !== "success" ||
      !shouldApplyInitialTimelineScroll.value ||
      chartViewportWidth.value <= 0
    ) {
      return;
    }

    scroll.syncChart({
      top: 0,
      left: desktopScheduleService.getInitialScrollLeftForToday(
        layout.timeline,
        chartViewportWidth.value,
      ),
    });
    shouldApplyInitialTimelineScroll.value = false;
  },
  { immediate: true },
);

watch(
  () => [
    access.isReadOnly,
    showDailyReportEditor.value,
    dailyReportPanelWidth.value,
    layout.rowPanelWidth,
  ],
  async () => {
    await nextTick();
    syncShellViewport();
  },
  { immediate: true },
);
</script>

<template>
  <main class="desktop-schedule-page">
    <DesktopAppHeader />

    <Transition name="desktop-schedule-toast">
      <div
        v-if="load.toast.visible"
        class="desktop-schedule-page__toast"
        :class="`desktop-schedule-page__toast--${load.toast.tone}`"
        role="status"
        aria-live="polite"
      >
        {{ load.toast.message }}
      </div>
    </Transition>

    <div
      ref="shellLayoutRef"
      class="desktop-schedule-page__shell"
      :class="{
        'desktop-schedule-page__shell--with-daily-report-panel': access.isCurrentMainScheduleVersionSelected,
        'desktop-schedule-page__shell--panel-open': showDailyReportEditor,
        'desktop-schedule-page__shell--panel-resizing': dailyReportPanelResizeState,
      }"
      :style="scheduleShellStyle"
    >
      <section class="desktop-schedule-page__workspace">
        <div ref="shellHostRef" class="desktop-schedule-page__workspace-host">
          <div
            v-if="
              load.status === 'idle' ||
              (load.status === 'loading' && !isScheduleRefreshing)
            "
            class="desktop-schedule-page__state"
          >
            <p class="desktop-schedule-page__state-title">
              공정표 데이터를 불러오는 중이에요.
            </p>
          </div>

          <div
            v-else-if="load.status === 'error'"
            class="desktop-schedule-page__state"
          >
            <p class="desktop-schedule-page__state-title">
              공정표 데이터를 불러오지 못했어요.
            </p>
            <p class="desktop-schedule-page__state-description">
              {{ load.errorMessage }}
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
              :timeline="layout.timeline"
              :shell-layout="layout.shell"
              :read-only="access.isReadOnly"
              :schedule-versions="version.versions"
              :past-main-schedule-versions="version.pastMainVersions"
              :selected-schedule-version-id="version.selectedId"
              :version-name="version.displayName"
              :version-mode-label="version.modeLabel"
              :version-access-label="version.accessLabel"
              :suggested-draft-version-name="version.suggestedDraftName"
              :can-create-draft-version="version.canCreateDraft"
              :can-compare-schedule-version="version.canCompare"
              :can-promote-schedule-version="version.canPromote"
              :schedule-version-review="version.reviewState"
              :schedule-version-promotion="version.promotionState"
              :schedule-import-dialog="importFlow.state"
              :is-ai-verification-mode-active="aiVerification.isActive"
              :ai-verification-flagged-item-ids="aiVerification.flaggedItemIds"
              :viewport-height="shellViewportHeight"
              :scroll-top="scroll.top"
              :scroll-left="scroll.left"
              :interaction-cancel-version="interaction.cancelVersion"
              :selected-row-ids="selection.state.rowIds"
              :selected-item-ids="selection.state.itemIds"
              :selected-work-connection-ids="selection.state.workConnectionIds"
              :selected-milestone-ids="selection.state.milestoneIds"
              :connection-creation-state="connection.creationState"
              :row-panel-width="layout.rowPanelWidth"
              :work-type-column-width="layout.workTypeColumnWidth"
              :editing-division-id="rename.divisionId"
              :editing-work-type-id="rename.workTypeId"
              :editing-sub-work-type-id="rename.subWorkTypeId"
              :editing-item-id="rename.itemId"
              :editing-milestone-id="rename.milestoneId"
              :zoom-index="zoom.currentIndex"
              :zoom-max="zoom.maxIndex"
              :zoom-scale="zoom.scale"
              :can-zoom-in="zoom.canZoomIn"
              :can-zoom-out="zoom.canZoomOut"
              :can-undo="history.canUndo"
              :can-redo="history.canRedo"
              :history-syncing="history.isSyncing"
              :panel-open="showDailyReportEditor"
              :show-panel-toggle="access.isCurrentMainScheduleVersionSelected"
              panel-toggle-open-label="패널 숨기기"
              panel-toggle-closed-label="패널 보기"
              @scroll-sync="scroll.syncChart"
              @row-panel-width-change="handleRowPanelWidthChange"
              @work-type-column-width-change="handleWorkTypeColumnWidthChange"
              @toggle-panel="handleToggleDailyReportPanel"
              @undo="history.undo"
              @redo="history.redo"
              @create-draft-version="version.createDraftFromCurrent"
              @open-import-dialog="importFlow.open"
              @close-import-dialog="importFlow.close"
              @import-dialog-file-change="importFlow.setFile"
              @import-dialog-start-date-change="importFlow.setStartDate"
              @import-dialog-end-date-change="importFlow.setEndDate"
              @import-dialog-submit="importFlow.submit"
              @toggle-ai-verification="aiVerification.toggleMode"
              @toggle-ai-verification-flag="aiVerification.toggleFlag"
              @export-schedule-excel="version.exportAsExcel"
              @select-schedule-version="version.select"
              @cell-selection-change="handleScheduleCellSelectionChange"
              @rename-schedule-version="version.renameDraft"
              @delete-schedule-version="version.deleteDraft"
              @open-schedule-version-review="version.openReview"
              @close-schedule-version-review="version.closeReview"
              @request-schedule-version-promotion="
                version.requestPromotion
              "
              @confirm-schedule-version-promotion="
                version.confirmPromotion
              "
              @close-schedule-version-promotion="
                version.closePromotionDialog
              "
              @readonly-edit-attempt="access.notifyReadOnlyAction"
              @clear-selection="selection.clear"
              @select-bars="selection.selectBars"
              @select-row="(rowId: string) => selection.selectRows({ rowIds: [rowId] })"
              @start-division-rename="reference.startDivisionRename"
              @commit-division-rename="reference.commitDivisionRename"
              @cancel-division-rename="reference.cancelDivisionRename"
              @start-work-type-rename="reference.startWorkTypeRename"
              @commit-work-type-rename="reference.commitWorkTypeRename"
              @cancel-work-type-rename="reference.cancelWorkTypeRename"
              @start-sub-work-type-rename="reference.startSubWorkTypeRename"
              @commit-sub-work-type-rename="reference.commitSubWorkTypeRename"
              @cancel-sub-work-type-rename="reference.cancelSubWorkTypeRename"
              @create-division-reference="reference.createDivision"
              @reorder-divisions="reference.reorderDivisions"
              @reorder-work-types="reference.reorderWorkTypes"
              @reorder-sub-work-types="reference.reorderSubWorkTypes"
              @delete-selection="selection.deleteSelection"
              @item-context-menu="contextMenu.openItem"
              @work-connection-context-menu="contextMenu.openWorkConnection"
              @milestone-context-menu="contextMenu.openMilestone"
              @row-context-menu="contextMenu.openRow"
              @header-context-menu="contextMenu.openHeader"
              @canvas-context-menu="contextMenu.openCanvas"
              @cancel-connection-create="connection.cancelCreation"
              @complete-connection-create="connection.completeCreation"
              @start-item-rename="rename.startItem"
              @commit-item-rename="rename.commitItem"
              @cancel-item-rename="rename.cancelItem"
              @start-milestone-rename="rename.startMilestone"
              @commit-milestone-rename="rename.commitMilestone"
              @cancel-milestone-rename="rename.cancelMilestone"
              @milestone-activate="milestone.activate"
              @move-start="interaction.startMove"
              @move-draft="interaction.draftMove"
              @move-end="interaction.endMove"
              @resize-start="interaction.startResize"
              @resize-draft="interaction.draftResize"
              @resize-end="interaction.endResize"
              @zoom-in="handleZoomIn"
              @zoom-out="handleZoomOut"
              @zoom-change="handleZoomChange"
            />

            <DesktopScheduleContextMenu
              :open="contextMenu.state.open"
              :x="contextMenu.state.x"
              :y="contextMenu.state.y"
              :items="contextMenu.items"
              @close="contextMenu.close"
              @select="contextMenu.execute"
            />

            <DesktopScheduleColorPalette
              :open="colorPalette.state.open"
              :x="colorPalette.state.x"
              :y="colorPalette.state.y"
              :selected-color="colorPalette.state.selectedColor"
              @close="colorPalette.close"
              @select="colorPalette.apply"
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
        </div>
      </section>

      <Transition name="desktop-schedule-daily-report-splitter">
        <button
          v-if="showDailyReportEditor"
          type="button"
          class="desktop-schedule-page__daily-report-splitter"
          aria-label="공정표와 공사일보 작성 패널 너비 조절"
          title="드래그해서 공사일보 작성 패널 너비 조절"
          @pointerdown="startDailyReportPanelResize"
        >
          <span
            class="desktop-schedule-page__daily-report-splitter-line"
            aria-hidden="true"
          />
        </button>
      </Transition>

      <Transition name="desktop-schedule-daily-report-panel">
        <DailyReportEditorPanel
          v-show="showDailyReportEditor"
          class="desktop-schedule-page__daily-report-panel"
          @report-date-change="handleDailyReportDateChange"
        />
      </Transition>
    </div>
  </main>
</template>
