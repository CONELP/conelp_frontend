<script setup lang="ts">
import { computed, ref } from "vue";

import type {
  DesktopScheduleShellLayout,
  DesktopScheduleTimelineLayout,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import DesktopScheduleChartBody from "@/features/desktop-schedule/ui/components/DesktopScheduleChartBody.vue";
import DesktopScheduleRowPanel from "@/features/desktop-schedule/ui/components/DesktopScheduleRowPanel.vue";
import DesktopScheduleTimelineHeader from "@/features/desktop-schedule/ui/components/DesktopScheduleTimelineHeader.vue";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleShell.css";

const SHELL_HEADER_HEIGHT = 84;

type ConnectionCreationState = {
  kind: "dependency" | "link";
  sourceItemId: string;
};

const props = defineProps<{
  timeline: DesktopScheduleTimelineLayout;
  shellLayout: DesktopScheduleShellLayout;
  viewportHeight?: number;
  scrollTop: number;
  scrollLeft: number;
  selectedRowIds: string[];
  selectedItemIds: string[];
  selectedDependencyIds: string[];
  selectedLinkIds: string[];
  selectedMilestoneIds: string[];
  connectionCreationState: ConnectionCreationState | null;
  editingItemId: string | null;
  editingMilestoneId: string | null;
  zoomIndex: number;
  zoomMax: number;
  zoomScale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
}>();

const emit = defineEmits<{
  "scroll-sync": [position: { top: number; left: number }];
  "clear-selection": [];
  "select-bars": [payload: { itemIds: string[]; rowIds: string[]; milestoneIds?: string[] }];
  "select-row": [rowId: string];
  "delete-selection": [];
  "item-context-menu": [payload: { itemId: string; x: number; y: number }];
  "dependency-context-menu": [payload: { dependencyId: string; x: number; y: number }];
  "link-context-menu": [payload: { linkId: string; x: number; y: number }];
  "milestone-context-menu": [payload: { milestoneId: string; x: number; y: number }];
  "row-context-menu": [payload: { rowId: string; x: number; y: number }];
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
  "zoom-in": [];
  "zoom-out": [];
  "zoom-change": [zoomIndex: number];
}>();

const hoveredRowId = ref<string | null>(null);
const hoveredDate = ref<string | null>(null);

const shellHeight = computed(() => Math.max(props.viewportHeight ?? 640, 320));
const scaledShellHeaderHeight = computed(() =>
  Math.round(SHELL_HEADER_HEIGHT * Math.min(Math.max(props.zoomScale, 0.68), 1.46)),
);
const bodyViewportHeight = computed(() =>
  Math.max(shellHeight.value - scaledShellHeaderHeight.value, 200),
);
const zoomSliderValue = computed(() => Math.min(Math.max(props.zoomIndex, 0), props.zoomMax));
const zoomSliderProgress = computed(() =>
  props.zoomMax > 0 ? (zoomSliderValue.value / props.zoomMax) * 100 : 0,
);
const milestoneDates = computed(() =>
  Array.from(new Set(props.shellLayout.milestones.map((milestone) => milestone.date))),
);

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
</script>

<template>
  <div
    class="schedule-shell"
    :style="{
      height: `${shellHeight}px`,
      '--schedule-zoom-scale': `${zoomScale}`,
      '--schedule-header-height': `${scaledShellHeaderHeight}px`,
    }"
  >
    <div class="schedule-shell__frame">
      <div class="schedule-shell__left-column">
        <div class="schedule-shell__left-header">
          <span aria-hidden="true" />
        </div>

        <DesktopScheduleRowPanel
          :rows="shellLayout.rows"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          :hovered-row-id="hoveredRowId"
          :selected-row-ids="selectedRowIds"
          @scroll-top-change="handleRowPanelScroll"
          @select-row="emit('select-row', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
        />
      </div>

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
          :selected-row-ids="selectedRowIds"
          :selected-item-ids="selectedItemIds"
          :selected-dependency-ids="selectedDependencyIds"
          :selected-link-ids="selectedLinkIds"
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
          @dependency-context-menu="emit('dependency-context-menu', $event)"
          @link-context-menu="emit('link-context-menu', $event)"
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

        <div class="schedule-shell__actions" aria-label="공정표 확대 축소">
          <button
            type="button"
            class="schedule-shell__action"
            :disabled="!canZoomOut"
            aria-label="축소"
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
            @input="handleZoomSliderInput"
          />

          <button
            type="button"
            class="schedule-shell__action"
            :disabled="!canZoomIn"
            aria-label="확대"
            @click="emit('zoom-in')"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
