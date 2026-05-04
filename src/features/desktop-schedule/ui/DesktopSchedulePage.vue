<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import { useDesktopScheduleViewModel } from "@/features/desktop-schedule/state/useDesktopScheduleViewModel";
import DesktopScheduleColorPalette from "@/features/desktop-schedule/ui/components/DesktopScheduleColorPalette.vue";
import DesktopScheduleContextMenu from "@/features/desktop-schedule/ui/components/DesktopScheduleContextMenu.vue";
import DesktopScheduleShell from "@/features/desktop-schedule/ui/components/DesktopScheduleShell.vue";
import "@/features/desktop-schedule/ui/styles/DesktopSchedulePage.css";

const {
  scheduleLoadStatus,
  scheduleLoadErrorMessage,
  scheduleToast,
  isScheduleReadOnly,
  scheduleVersions,
  selectedScheduleVersionId,
  scheduleVersionDisplayName,
  scheduleVersionModeLabel,
  scheduleVersionAccessLabel,
  suggestedDraftVersionName,
  canCreateDraftVersion,
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
  canUndoLocalHistory,
  canRedoLocalHistory,
  loadSchedule,
  clearSelection,
  syncChartScroll,
  setRowPanelWidth,
  setWorkTypeColumnWidth,
  undoLocalHistory,
  redoLocalHistory,
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
  selectScheduleVersion,
  createDraftVersionFromCurrent,
  renameScheduleVersion,
  deleteScheduleVersion,
} = useDesktopScheduleViewModel();

const shellHostRef = ref<HTMLElement | null>(null);
const shellViewportHeight = ref(640);
const chartViewportWidth = ref(0);
const shouldApplyInitialTimelineScroll = ref(scheduleLoadStatus.value !== "success");
let resizeObserver: ResizeObserver | null = null;

function syncShellViewport() {
  if (!shellHostRef.value) {
    return;
  }

  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight, 320);
  chartViewportWidth.value = Math.max(shellHostRef.value.clientWidth - rowPanelWidth.value, 0);
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
  void loadSchedule();
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

function handleHistoryShortcut(event: KeyboardEvent) {
  if (isEditableKeyboardTarget(event.target) || (!event.metaKey && !event.ctrlKey)) {
    return;
  }

  const key = event.key.toLowerCase();
  const isUndo = key === "z" && !event.shiftKey;
  const isRedo = (key === "z" && event.shiftKey) || key === "y";

  if (!isUndo && !isRedo) {
    return;
  }

  event.preventDefault();

  if (isUndo) {
    undoLocalHistory();
    return;
  }

  redoLocalHistory();
}

onMounted(() => {
  window.addEventListener("keydown", handleHistoryShortcut);

  if (shellHostRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncShellViewport();
    });
    resizeObserver.observe(shellHostRef.value);
    syncShellViewport();
  }

  if (scheduleLoadStatus.value === "idle") {
    void loadSchedule();
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleHistoryShortcut);
  resizeObserver?.disconnect();
  resizeObserver = null;
  closeContextMenu();
  closeColorPalette();
  cancelConnectionCreation();
});

watch(
  () => [scheduleLoadStatus.value, timeline.value, chartViewportWidth.value] as const,
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
  <main class="desktop-schedule-page">
    <DesktopAppHeader />

    <Transition name="desktop-schedule-toast">
      <div
        v-if="scheduleToast.visible"
        class="desktop-schedule-page__toast"
        role="status"
        aria-live="polite"
      >
        {{ scheduleToast.message }}
      </div>
    </Transition>

    <div class="desktop-schedule-page__shell">
      <section class="desktop-schedule-page__workspace">
        <div ref="shellHostRef" class="desktop-schedule-page__workspace-host">
          <div
            v-if="scheduleLoadStatus === 'idle' || scheduleLoadStatus === 'loading'"
            class="desktop-schedule-page__state"
          >
            <p class="desktop-schedule-page__state-title">공정표 데이터를 불러오는 중이에요.</p>
          </div>

          <div
            v-else-if="scheduleLoadStatus === 'error'"
            class="desktop-schedule-page__state"
          >
            <p class="desktop-schedule-page__state-title">공정표 데이터를 불러오지 못했어요.</p>
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
              :read-only="isScheduleReadOnly"
              :schedule-versions="scheduleVersions"
              :selected-schedule-version-id="selectedScheduleVersionId"
              :version-name="scheduleVersionDisplayName"
              :version-mode-label="scheduleVersionModeLabel"
              :version-access-label="scheduleVersionAccessLabel"
              :suggested-draft-version-name="suggestedDraftVersionName"
              :can-create-draft-version="canCreateDraftVersion"
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
              :can-undo="canUndoLocalHistory"
              :can-redo="canRedoLocalHistory"
              @scroll-sync="syncChartScroll"
              @row-panel-width-change="handleRowPanelWidthChange"
              @work-type-column-width-change="handleWorkTypeColumnWidthChange"
              @undo="undoLocalHistory"
              @redo="redoLocalHistory"
              @create-draft-version="createDraftVersionFromCurrent"
              @select-schedule-version="selectScheduleVersion"
              @rename-schedule-version="renameScheduleVersion"
              @delete-schedule-version="deleteScheduleVersion"
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
          </template>
        </div>
      </section>
    </div>
  </main>
</template>
