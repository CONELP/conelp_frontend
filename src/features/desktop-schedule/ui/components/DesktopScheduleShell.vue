<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

import type {
  DesktopScheduleShellLayout,
  DesktopScheduleTimelineLayout,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import DesktopScheduleChartBody from "@/features/desktop-schedule/ui/components/DesktopScheduleChartBody.vue";
import DesktopScheduleRowPanel from "@/features/desktop-schedule/ui/components/DesktopScheduleRowPanel.vue";
import DesktopScheduleTimelineHeader from "@/features/desktop-schedule/ui/components/DesktopScheduleTimelineHeader.vue";
import redoIcon from "@fluentui/svg-icons/icons/arrow_redo_20_regular.svg";
import undoIcon from "@fluentui/svg-icons/icons/arrow_undo_20_regular.svg";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleShell.css";

const SHELL_HEADER_HEIGHT = 84;
const SHELL_TOOLBAR_HEIGHT = 48;
const ROW_PANEL_MIN_WIDTH = 180;
const ROW_PANEL_MAX_WIDTH = 520;
const WIDTH_RESIZE_LISTENER_OPTIONS = true;

type ConnectionCreationState = {
  kind: "work-connection";
  sourceItemId: string;
};

const props = defineProps<{
  timeline: DesktopScheduleTimelineLayout;
  shellLayout: DesktopScheduleShellLayout;
  viewportHeight?: number;
  scrollTop: number;
  scrollLeft: number;
  rowPanelWidth: number;
  workTypeColumnWidth: number;
  interactionCancelVersion: number;
  selectedRowIds: string[];
  selectedItemIds: string[];
  selectedWorkConnectionIds: string[];
  selectedMilestoneIds: string[];
  connectionCreationState: ConnectionCreationState | null;
  editingDivisionId: number | null;
  editingWorkTypeId: number | null;
  editingSubWorkTypeId: number | null;
  editingItemId: string | null;
  editingMilestoneId: string | null;
  zoomIndex: number;
  zoomMax: number;
  zoomScale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  "scroll-sync": [position: { top: number; left: number }];
  "row-panel-width-change": [width: number];
  "work-type-column-width-change": [width: number];
  "clear-selection": [];
  "select-bars": [payload: { itemIds: string[]; rowIds: string[]; milestoneIds?: string[] }];
  "select-row": [rowId: string];
  "start-division-rename": [divisionId: number];
  "commit-division-rename": [payload: { divisionId: number; name: string }];
  "cancel-division-rename": [];
  "start-work-type-rename": [workTypeId: number];
  "commit-work-type-rename": [payload: { workTypeId: number; name: string }];
  "cancel-work-type-rename": [];
  "start-sub-work-type-rename": [subWorkTypeId: number];
  "commit-sub-work-type-rename": [payload: { subWorkTypeId: number; name: string }];
  "cancel-sub-work-type-rename": [];
  "reorder-divisions": [payload: { divisionIds: number[] }];
  "reorder-work-types": [payload: { divisionId: number; workTypeIds: number[] }];
  "delete-selection": [];
  "item-context-menu": [payload: { itemId: string; x: number; y: number }];
  "work-connection-context-menu": [payload: { workConnectionId: string; x: number; y: number }];
  "milestone-context-menu": [payload: { milestoneId: string; x: number; y: number }];
  "row-context-menu": [payload: { rowId: string; x: number; y: number }];
  "header-context-menu": [
    payload: {
      target:
        | { kind: "division-header"; divisionId: number; name: string }
        | { kind: "work-type-header"; divisionId: number; workTypeId: number; name: string }
        | {
            kind: "sub-work-type-header";
            workTypeId: number;
            subWorkTypeId: number;
            rowId: string;
            name: string;
          };
      x: number;
      y: number;
    },
  ];
  "canvas-context-menu": [payload: { x: number; y: number; rowId: string | null; date: string | null }];
  "cancel-connection-create": [];
  "complete-connection-create": [targetItemId: string];
  "start-item-rename": [itemId: string];
  "commit-item-rename": [payload: { itemId: string; name: string }];
  "cancel-item-rename": [];
  "start-milestone-rename": [milestoneId: string];
  "commit-milestone-rename": [payload: { milestoneId: string; label: string }];
  "cancel-milestone-rename": [];
  "milestone-activate": [payload: { date: string; milestoneId?: string }];
  "move-start": [
    payload:
      | { kind: "item"; itemId: string }
      | { kind: "summary"; rowId: string }
      | { kind: "milestone"; milestoneId: string },
  ];
  "move-preview": [payload: { deltaDays: number; deltaLanes: number }];
  "move-end": [];
  "resize-start": [
    payload:
      | { kind: "item"; itemId: string; edge: "left" | "right" }
      | { kind: "summary"; rowId: string; edge: "left" | "right" },
  ];
  "resize-preview": [payload: { deltaDays: number }];
  "resize-end": [];
  undo: [];
  redo: [];
  "zoom-in": [];
  "zoom-out": [];
  "zoom-change": [zoomIndex: number];
}>();

const hoveredRowId = ref<string | null>(null);
const hoveredDate = ref<string | null>(null);
const rowPanelResizeState = ref<{ startClientX: number; startWidth: number } | null>(null);

const shellHeight = computed(() => Math.max(props.viewportHeight ?? 640, 320));
const scaledShellHeaderHeight = computed(() =>
  Math.round(SHELL_HEADER_HEIGHT * Math.min(Math.max(props.zoomScale, 0.68), 1.46)),
);
const bodyViewportHeight = computed(() =>
  Math.max(shellHeight.value - scaledShellHeaderHeight.value - SHELL_TOOLBAR_HEIGHT, 200),
);
const zoomSliderValue = computed(() => Math.min(Math.max(props.zoomIndex, 0), props.zoomMax));
const zoomSliderProgress = computed(() =>
  props.zoomMax > 0 ? (zoomSliderValue.value / props.zoomMax) * 100 : 0,
);
const milestoneDates = computed(() =>
  Array.from(new Set(props.shellLayout.milestones.map((milestone) => milestone.date))),
);
const frameStyle = computed(() => ({
  gridTemplateColumns: `${props.rowPanelWidth}px minmax(0, 1fr)`,
}));
const shellStyle = computed(() => ({
  height: `${shellHeight.value}px`,
  "--schedule-zoom-scale": `${props.zoomScale}`,
  "--schedule-header-height": `${scaledShellHeaderHeight.value}px`,
  "--schedule-row-panel-width": `${props.rowPanelWidth}px`,
}));

function clampWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function handleRowPanelScroll(scrollTop: number) {
  emit("scroll-sync", {
    top: scrollTop,
    left: props.scrollLeft,
  });
}

function handleChartScroll(position: { top: number; left: number }) {
  emit("scroll-sync", position);
}

function handleHoverCell(payload: { rowId: string | null; date: string | null }) {
  hoveredRowId.value = payload.rowId;
  hoveredDate.value = payload.date;
}

function handleZoomSliderInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const nextZoomIndex = Math.min(Math.max(target.valueAsNumber, 0), props.zoomMax);
  emit("zoom-change", nextZoomIndex);
}

function removeRowPanelResizeListeners() {
  document.removeEventListener(
    "pointermove",
    handleRowPanelResizePointerMove,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
  document.removeEventListener(
    "pointerup",
    handleRowPanelResizePointerUp,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
}

function handleRowPanelResizePointerMove(event: PointerEvent) {
  const resizeState = rowPanelResizeState.value;
  if (!resizeState) {
    return;
  }

  if (event.buttons === 0) {
    handleRowPanelResizePointerUp();
    return;
  }

  event.preventDefault();
  emit(
    "row-panel-width-change",
    clampWidth(
      resizeState.startWidth + event.clientX - resizeState.startClientX,
      ROW_PANEL_MIN_WIDTH,
      ROW_PANEL_MAX_WIDTH,
    ),
  );
}

function handleRowPanelResizePointerUp() {
  rowPanelResizeState.value = null;
  removeRowPanelResizeListeners();
}

function startRowPanelResize(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  rowPanelResizeState.value = {
    startClientX: event.clientX,
    startWidth: props.rowPanelWidth,
  };
  document.addEventListener(
    "pointermove",
    handleRowPanelResizePointerMove,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
  document.addEventListener(
    "pointerup",
    handleRowPanelResizePointerUp,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
}

onUnmounted(() => {
  removeRowPanelResizeListeners();
});
</script>

<template>
  <div
    class="schedule-shell"
    :class="{ 'schedule-shell--resizing': rowPanelResizeState }"
    :style="shellStyle"
  >
    <div class="schedule-shell__toolbar" aria-label="공정표 도구">
      <div class="schedule-shell__actions" aria-label="작업 되돌리기">
        <button
          type="button"
          class="schedule-shell__action schedule-shell__action--history"
          :disabled="!canUndo"
          aria-label="되돌리기"
          title="되돌리기 (Ctrl/Cmd+Z)"
          @click="emit('undo')"
        >
          <img class="schedule-shell__action-icon" :src="undoIcon" alt="" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="schedule-shell__action schedule-shell__action--history"
          :disabled="!canRedo"
          aria-label="다시 실행"
          title="다시 실행 (Ctrl/Cmd+Shift+Z 또는 Ctrl/Cmd+Y)"
          @click="emit('redo')"
        >
          <img class="schedule-shell__action-icon" :src="redoIcon" alt="" aria-hidden="true" />
        </button>
      </div>

      <div class="schedule-shell__toolbar-spacer" aria-hidden="true" />

      <div class="schedule-shell__actions schedule-shell__actions--zoom" aria-label="공정표 확대 축소">
        <button
          type="button"
          class="schedule-shell__action"
          :disabled="!canZoomOut"
          aria-label="축소"
          title="축소"
          @click="emit('zoom-out')"
        >
          -
        </button>

        <input
          class="schedule-shell__zoom-slider"
          type="range"
          min="0"
          :max="zoomMax"
          step="1"
          :value="zoomSliderValue"
          :style="{ '--zoom-progress': `${zoomSliderProgress}%` }"
          aria-label="확대 축소"
          title="확대 축소"
          @input="handleZoomSliderInput"
        />

        <button
          type="button"
          class="schedule-shell__action"
          :disabled="!canZoomIn"
          aria-label="확대"
          title="확대"
          @click="emit('zoom-in')"
        >
          +
        </button>
      </div>
    </div>

    <div class="schedule-shell__frame" :style="frameStyle">
      <div class="schedule-shell__left-column">
        <div class="schedule-shell__left-header">
          <span aria-hidden="true" />
        </div>

        <DesktopScheduleRowPanel
          :rows="shellLayout.rows"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          :work-type-column-width="workTypeColumnWidth"
          :hovered-row-id="hoveredRowId"
          :selected-row-ids="selectedRowIds"
          :editing-division-id="editingDivisionId"
          :editing-work-type-id="editingWorkTypeId"
          :editing-sub-work-type-id="editingSubWorkTypeId"
          @scroll-top-change="handleRowPanelScroll"
          @select-row="emit('select-row', $event)"
          @start-division-rename="emit('start-division-rename', $event)"
          @commit-division-rename="emit('commit-division-rename', $event)"
          @cancel-division-rename="emit('cancel-division-rename')"
          @start-work-type-rename="emit('start-work-type-rename', $event)"
          @commit-work-type-rename="emit('commit-work-type-rename', $event)"
          @cancel-work-type-rename="emit('cancel-work-type-rename')"
          @start-sub-work-type-rename="emit('start-sub-work-type-rename', $event)"
          @commit-sub-work-type-rename="emit('commit-sub-work-type-rename', $event)"
          @cancel-sub-work-type-rename="emit('cancel-sub-work-type-rename')"
          @reorder-divisions="emit('reorder-divisions', $event)"
          @reorder-work-types="emit('reorder-work-types', $event)"
          @work-type-column-width-change="emit('work-type-column-width-change', $event)"
          @header-context-menu="emit('header-context-menu', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
        />
      </div>

      <button
        type="button"
        class="schedule-shell__left-resize-handle"
        aria-label="공정표 왼쪽 영역 너비 조절"
        title="드래그해서 왼쪽 영역 너비 조절"
        @pointerdown="startRowPanelResize"
      />

      <div class="schedule-shell__main">
        <div class="schedule-shell__timeline-pane">
          <DesktopScheduleTimelineHeader
            :timeline="timeline"
            :scroll-left="scrollLeft"
            :milestone-dates="milestoneDates"
            :hovered-date="hoveredDate"
          />
        </div>

        <DesktopScheduleChartBody
          :timeline="timeline"
          :shell-layout="shellLayout"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          :scroll-left="scrollLeft"
          :interaction-cancel-version="interactionCancelVersion"
          :selected-row-ids="selectedRowIds"
          :selected-item-ids="selectedItemIds"
          :selected-work-connection-ids="selectedWorkConnectionIds"
          :selected-milestone-ids="selectedMilestoneIds"
          :connection-creation-state="connectionCreationState"
          :editing-item-id="editingItemId"
          :editing-milestone-id="editingMilestoneId"
          :zoom-scale="zoomScale"
          @scroll-change="handleChartScroll"
          @clear-selection="emit('clear-selection')"
          @select-bars="emit('select-bars', $event)"
          @select-row="emit('select-row', $event)"
          @delete-selection="emit('delete-selection')"
          @item-context-menu="emit('item-context-menu', $event)"
          @work-connection-context-menu="emit('work-connection-context-menu', $event)"
          @milestone-context-menu="emit('milestone-context-menu', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
          @canvas-context-menu="emit('canvas-context-menu', $event)"
          @cancel-connection-create="emit('cancel-connection-create')"
          @complete-connection-create="emit('complete-connection-create', $event)"
          @start-item-rename="emit('start-item-rename', $event)"
          @commit-item-rename="emit('commit-item-rename', $event)"
          @cancel-item-rename="emit('cancel-item-rename')"
          @start-milestone-rename="emit('start-milestone-rename', $event)"
          @commit-milestone-rename="emit('commit-milestone-rename', $event)"
          @cancel-milestone-rename="emit('cancel-milestone-rename')"
          @milestone-activate="emit('milestone-activate', $event)"
          @move-start="emit('move-start', $event)"
          @move-preview="emit('move-preview', $event)"
          @move-end="emit('move-end')"
          @resize-start="emit('resize-start', $event)"
          @resize-preview="emit('resize-preview', $event)"
          @resize-end="emit('resize-end')"
          @hover-cell="handleHoverCell"
        />

      </div>
    </div>
  </div>
</template>
