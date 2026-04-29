<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import { useDesktopScheduleViewModel } from "@/features/desktop-schedule/state/useDesktopScheduleViewModel";
import DesktopScheduleColorPalette from "@/features/desktop-schedule/ui/components/DesktopScheduleColorPalette.vue";
import DesktopScheduleContextMenu from "@/features/desktop-schedule/ui/components/DesktopScheduleContextMenu.vue";
import DesktopScheduleShell from "@/features/desktop-schedule/ui/components/DesktopScheduleShell.vue";
import "@/features/desktop-schedule/ui/styles/DesktopSchedulePage.css";

const ROW_PANEL_WIDTH = 220;

const {
  selectionState,
  contextMenuState,
  contextMenuItems,
  colorPaletteState,
  connectionCreationState,
  renamingItemId,
  renamingMilestoneId,
  timeline,
  shellLayout,
  chartScrollTop,
  chartScrollLeft,
  interactionCancelVersion,
  zoomScale,
  currentZoomIndex,
  maxZoomIndex,
  canZoomIn,
  canZoomOut,
  clearSelection,
  syncChartScroll,
  selectBars,
  selectRows,
  deleteSelection,
  openItemContextMenu,
  openWorkConnectionContextMenu,
  openMilestoneContextMenu,
  openRowContextMenu,
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
} = useDesktopScheduleViewModel();

const shellHostRef = ref<HTMLElement | null>(null);
const shellViewportHeight = ref(640);
const chartViewportWidth = ref(0);
const shouldApplyInitialTimelineScroll = ref(true);
let resizeObserver: ResizeObserver | null = null;

function syncShellViewport() {
  if (!shellHostRef.value) {
    return;
  }

  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight, 320);
  chartViewportWidth.value = Math.max(shellHostRef.value.clientWidth - ROW_PANEL_WIDTH, 0);
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

onMounted(() => {
  if (shellHostRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncShellViewport();
    });
    resizeObserver.observe(shellHostRef.value);
    syncShellViewport();
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

watch(
  () => [timeline.value, chartViewportWidth.value] as const,
  async ([nextTimeline, nextChartViewportWidth]) => {
    if (!shouldApplyInitialTimelineScroll.value || nextChartViewportWidth <= 0) {
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

    <div class="desktop-schedule-page__shell">
      <section class="desktop-schedule-page__workspace">
        <div ref="shellHostRef" class="desktop-schedule-page__workspace-host">
          <DesktopScheduleShell
            :timeline="timeline"
            :shell-layout="shellLayout"
            :viewport-height="shellViewportHeight"
            :scroll-top="chartScrollTop"
            :scroll-left="chartScrollLeft"
            :interaction-cancel-version="interactionCancelVersion"
            :selected-row-ids="selectionState.rowIds"
            :selected-item-ids="selectionState.itemIds"
            :selected-work-connection-ids="selectionState.workConnectionIds"
            :selected-milestone-ids="selectionState.milestoneIds"
            :connection-creation-state="connectionCreationState"
            :editing-item-id="renamingItemId"
            :editing-milestone-id="renamingMilestoneId"
            :zoom-index="currentZoomIndex"
            :zoom-max="maxZoomIndex"
            :zoom-scale="zoomScale"
            :can-zoom-in="canZoomIn"
            :can-zoom-out="canZoomOut"
            @scroll-sync="syncChartScroll"
            @clear-selection="clearSelection"
            @select-bars="selectBars"
            @select-row="(rowId) => selectRows({ rowIds: [rowId] })"
            @delete-selection="deleteSelection"
            @item-context-menu="openItemContextMenu"
            @work-connection-context-menu="openWorkConnectionContextMenu"
            @milestone-context-menu="openMilestoneContextMenu"
            @row-context-menu="openRowContextMenu"
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
        </div>
      </section>
    </div>
  </main>
</template>
