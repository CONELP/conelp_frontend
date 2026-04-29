<template>
  <div
    ref="containerRef"
    class="schedule-chart-body"
    :class="{
      'schedule-chart-body--grab': isSpacePressed && !panState,
      'schedule-chart-body--grabbing': !!panState,
      'schedule-chart-body--crosshair': !!connectionCreationState,
      'schedule-chart-body--locked': marqueeState || moveState || resizeState || panState,
    }"
    :style="{ height: `${viewportHeight}px` }"
    @scroll="handleScroll"
    @pointermove="handlePanePointerMove"
    @pointerleave="clearHoveredCell"
    @pointerdown.capture="handlePanePointerDownCapture"
    @pointerdown="handlePanePointerDown"
    @auxclick.prevent
    @contextmenu.prevent="handlePaneContextMenu"
  >
    <div
      class="schedule-chart-body__surface"
      :style="{ width: `${timeline.chartWidth}px`, height: `${shellLayout.chartHeight}px` }"
    >
      <div
        v-for="day in timeline.days"
        :key="`day-column-${day.key}`"
        class="schedule-chart-body__day-column"
        :class="getDayColumnClass(day)"
        :style="{ left: `${day.left}px`, width: `${day.width}px`, height: `${shellLayout.chartHeight}px` }"
      />

      <div
        v-for="row in shellLayout.rows"
        :key="`row-${row.id}`"
        class="schedule-chart-body__row"
        :class="{
          'schedule-chart-body__row--selected': selectedRowIdSet.has(row.id),
          'schedule-chart-body__row--division': row.kind === 'division',
          'schedule-chart-body__row--milestone': row.kind === 'milestone',
          'schedule-chart-body__row--parent': row.kind === 'parent-process',
        }"
        :style="{ top: `${row.top}px`, height: `${row.height}px` }"
        @pointerdown="handleRowPointerDown(row, $event)"
        @contextmenu.prevent.stop="handleRowContextMenu(row, $event)"
      />

      <div
        v-if="todayTimelineDay"
        class="schedule-chart-body__today-column-overlay"
        :style="{
          left: `${todayTimelineDay.left}px`,
          width: `${todayTimelineDay.width}px`,
          height: `${shellLayout.chartHeight}px`,
        }"
      />

      <div
        v-for="border in divisionTodayBorderStyles"
        :key="border.key"
        class="schedule-chart-body__today-division-border"
        :style="border.style"
      />

      <div
        v-if="hoveredDayOverlayStyle"
        class="schedule-chart-body__hover-day"
        :style="hoveredDayOverlayStyle"
      />

      <div
        v-if="hoveredRowOverlayStyle"
        class="schedule-chart-body__hover-row"
        :style="hoveredRowOverlayStyle"
      />

      <div
        v-if="hoveredIntersectionStyle"
        class="schedule-chart-body__hover-cell"
        :style="hoveredIntersectionStyle"
      />

      <svg
        class="schedule-chart-body__connections"
        :width="timeline.chartWidth"
        :height="shellLayout.chartHeight"
        :viewBox="`0 0 ${timeline.chartWidth} ${shellLayout.chartHeight}`"
      >
        <path
          v-if="previewConnectionPath"
          :d="previewConnectionPath"
          fill="none"
          pointer-events="none"
          :stroke="connectionCreationState?.kind === 'critical-path'
            ? connectionCreationState.colorHex ?? '#dc2626'
            : '#64748b'"
          :stroke-width="connectionCreationState?.kind === 'critical-path'
            ? 2.25
            : 2"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.9"
        />

        <g v-for="connection in shellLayout.connections" :key="connection.id">
          <path
            :d="connection.path"
            fill="none"
            stroke="transparent"
            stroke-width="12"
            pointer-events="stroke"
            class="schedule-chart-body__connection-hit"
            @pointerdown.stop
            @mouseenter="connection.kind === 'work-connection'
              ? handleWorkConnectionPointerEnter(connection.id)
              : handleCriticalPathPointerEnter(connection.pathId)"
            @mouseleave="connection.kind === 'work-connection'
              ? handleWorkConnectionPointerLeave(connection.id)
              : handleCriticalPathPointerLeave(connection.pathId)"
            @contextmenu="connection.kind === 'work-connection'
              ? handleWorkConnectionContextMenu(connection.id, $event)
              : handleCriticalPathContextMenu(connection.id, $event)"
          />

          <path
            v-if="connection.kind === 'critical-path' && isCriticalPathHighlighted(connection.id, connection.pathId)"
            :d="connection.path"
            fill="none"
            pointer-events="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            :stroke="toAlphaColor(connection.colorHex ?? '#cb3a31', 0.24)"
            stroke-width="8"
            opacity="1"
          />

          <path
            :d="connection.path"
            fill="none"
            pointer-events="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            :stroke="getConnectionStroke(connection)"
            :stroke-width="getRenderedConnectionStrokeWidth(connection.id, connection.kind, connection.pathId)"
            :opacity="connection.kind === 'critical-path'
              ? isCriticalPathHighlighted(connection.id, connection.pathId) ? 1 : 0.95
              : isWorkConnectionHighlighted(connection.id) ? 1 : 0.9"
          />

        </g>

        <template
          v-for="connection in shellLayout.connections"
          :key="`connection-label-${connection.id}`"
        >
          <text
            v-if="connection.label && connection.kind === 'work-connection'"
            :x="connection.labelX"
            :y="connection.labelY"
            pointer-events="none"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="connectionLabelFontSize"
            font-weight="800"
            stroke="rgba(255,255,255,0.96)"
            :stroke-width="connectionLabelStrokeWidth"
            paint-order="stroke"
            :fill="getConnectionLabelColor(connection)"
          >
            {{ connection.label }}
          </text>
        </template>
      </svg>

      <template
        v-for="milestone in shellLayout.milestones"
        :key="milestone.id"
      >
        <div
          class="schedule-chart-body__milestone-deadline"
          :class="{
            'schedule-chart-body__milestone-deadline--hovered': hoveredMilestoneId === milestone.id,
          }"
          :aria-label="`마일스톤: ${milestone.label}`"
          :data-milestone-id="milestone.id"
          :title="milestone.label"
          role="button"
          tabindex="0"
          :style="{ left: `${milestone.left}px`, top: '0px', width: `${milestone.width}px`, height: `${shellLayout.chartHeight}px` }"
          @pointerdown.stop
          @pointerenter="handleMilestonePointerEnter(milestone.id)"
          @pointerleave="handleMilestonePointerLeave(milestone.id, $event)"
          @click.stop
          @contextmenu.prevent.stop="handleMilestoneContextMenu(milestone.id, $event)"
        >
        </div>

        <div
          class="schedule-chart-body__milestone-cell"
          :class="{
            'schedule-chart-body__milestone-cell--hovered': hoveredMilestoneId === milestone.id,
            'schedule-chart-body__milestone-cell--selected': selectedMilestoneIdSet.has(milestone.id),
          }"
          :aria-label="`마일스톤: ${milestone.label}`"
          :data-milestone-id="milestone.id"
          :title="milestone.label"
          role="button"
          tabindex="0"
          :style="{ left: `${milestone.left}px`, top: `${milestone.top}px`, width: `${milestone.width}px`, height: `${milestone.height}px` }"
          @pointerdown="handleMilestonePointerDown(milestone, $event)"
          @pointerenter="handleMilestonePointerEnter(milestone.id)"
          @pointerleave="handleMilestonePointerLeave(milestone.id, $event)"
          @click.stop
          @contextmenu.prevent.stop="handleMilestoneContextMenu(milestone.id, $event)"
        >
          <span
            v-if="editingMilestoneId === milestone.id"
            :ref="setMilestoneRenameEditorRef"
            class="schedule-chart-body__milestone-deadline-label schedule-chart-body__milestone-deadline-label--editing"
            contenteditable="true"
            spellcheck="false"
            @pointerdown.stop
            @click.stop
            @dblclick.stop
            @input="handleMilestoneRenameEditableInput"
            @blur="handleMilestoneRenameEditableBlur(milestone.id)"
            @keydown.enter.prevent="handleMilestoneRenameEditableEnter"
            @keydown.escape.prevent="handleMilestoneRenameEditableEscape"
            @pointerenter="handleMilestonePointerEnter(milestone.id)"
            @pointerleave="handleMilestonePointerLeave(milestone.id, $event)"
            @contextmenu.prevent.stop="handleMilestoneContextMenu(milestone.id, $event)"
          />

          <span
            v-else
            class="schedule-chart-body__milestone-deadline-label"
            @pointerdown.stop="handleMilestonePointerDown(milestone, $event)"
            @pointerenter="handleMilestonePointerEnter(milestone.id)"
            @pointerleave="handleMilestonePointerLeave(milestone.id, $event)"
            @contextmenu.prevent.stop="handleMilestoneContextMenu(milestone.id, $event)"
          >
            {{ milestone.label }}
          </span>
        </div>
      </template>

      <div
        v-for="bar in shellLayout.bars"
        :key="bar.id"
        class="schedule-chart-body__bar"
        :class="getBarClassList(bar)"
        :style="getBarInlineStyle(bar)"
        @pointerdown="handleBarPointerDown(bar, $event)"
        @pointerenter="handleBarPointerEnter(bar)"
        @pointerleave="handleBarPointerLeave(bar)"
        @contextmenu.prevent.stop="handleBarContextMenu(bar, $event)"
      >
        <template v-if="bar.kind === 'summary'">
          <div
            v-for="(segment, index) in bar.rangeMismatchSegments ?? []"
            :key="`${bar.id}-segment-${index}`"
            class="schedule-chart-body__summary-mismatch"
            :style="{ left: `${segment.left}px`, width: `${segment.width}px` }"
          />
          <div class="schedule-chart-body__summary-title">
            <span>{{ bar.name }}</span>
          </div>
        </template>

        <span
          v-else-if="editingItemId === bar.itemId"
          :ref="setRenameEditorRef"
          class="schedule-chart-body__item-title schedule-chart-body__item-title--editing"
          contenteditable="true"
          spellcheck="false"
          @pointerdown.stop
          @click.stop
          @dblclick.stop
          @input="handleRenameEditableInput"
          @blur="handleRenameEditableBlur(bar.itemId)"
          @keydown.enter.prevent="handleRenameEditableEnter"
          @keydown.escape.prevent="handleRenameEditableEscape"
        />

        <span v-else class="schedule-chart-body__item-title">
          {{ bar.name }}
        </span>

        <button
          v-if="!connectionCreationState && (bar.kind === 'item' || bar.kind === 'summary')"
          type="button"
          class="schedule-chart-body__resize-handle schedule-chart-body__resize-handle--left"
          :class="getResizeHandleClass(bar, 'left')"
          @pointerdown.stop="handleResizePointerDown(bar, 'left', $event)"
        />
        <button
          v-if="!connectionCreationState && (bar.kind === 'item' || bar.kind === 'summary')"
          type="button"
          class="schedule-chart-body__resize-handle schedule-chart-body__resize-handle--right"
          :class="getResizeHandleClass(bar, 'right')"
          @pointerdown.stop="handleResizePointerDown(bar, 'right', $event)"
        />
      </div>

      <template
        v-for="bar in shellLayout.bars.filter((candidate) => candidate.kind === 'summary' && (candidate.overflowRangeSegments?.length ?? 0) > 0)"
        :key="`summary-overflow-${bar.id}`"
      >
        <div
          v-for="(segment, index) in bar.overflowRangeSegments"
          :key="`${bar.id}-overflow-${index}`"
          class="schedule-chart-body__summary-overflow"
          :style="{ left: `${segment.left}px`, top: `${bar.top}px`, width: `${segment.width}px`, height: `${bar.height}px` }"
        />
      </template>

      <div
        v-if="marqueeRectStyle"
        class="schedule-chart-body__marquee"
        :style="marqueeRectStyle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";

import type {
  DesktopScheduleBarLayout,
  DesktopScheduleConnectionLayout,
  DesktopScheduleShellLayout,
  DesktopScheduleTimelineLayout,
} from "@/features/desktop-schedule/model/desktop-schedule.types";

type MarqueeState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type PanState = {
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
};

type MoveState = {
  target: "item" | "summary" | "milestone";
  rowId: string | null;
  startClientX: number;
  startClientY: number;
  laneStep: number;
  didDrag: boolean;
};

type ResizeState = {
  startClientX: number;
  edge: "left" | "right";
};

type PreviewConnectionPoint = {
  x: number;
  y: number;
};

type HoveredCellState = {
  rowId: string | null;
  date: string | null;
};

type ConnectionCreationState = {
  kind: "work-connection" | "critical-path";
  sourceItemId: string;
  pathId?: number;
  colorHex?: string;
};

const props = defineProps<{
  timeline: DesktopScheduleTimelineLayout;
  shellLayout: DesktopScheduleShellLayout;
  viewportHeight: number;
  scrollTop: number;
  scrollLeft: number;
  interactionCancelVersion: number;
  selectedRowIds: string[];
  selectedItemIds: string[];
  selectedWorkConnectionIds: string[];
  selectedMilestoneIds: string[];
  selectedCriticalPathIds?: string[];
  connectionCreationState: ConnectionCreationState | null;
  editingItemId: string | null;
  editingMilestoneId: string | null;
  zoomScale: number;
}>();

const emit = defineEmits<{
  "scroll-change": [position: { top: number; left: number }];
  "clear-selection": [];
  "toggle-row-collapse": [rowId: string];
  "select-bars": [payload: { itemIds: string[]; rowIds: string[]; milestoneIds?: string[] }];
  "select-row": [rowId: string];
  "delete-selection": [];
  "item-context-menu": [payload: { itemId: string; x: number; y: number }];
  "work-connection-context-menu": [payload: { workConnectionId: string; x: number; y: number }];
  "critical-path-context-menu": [payload: { criticalPathId: string; x: number; y: number }];
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
  "resize-start": [payload: { kind: "item"; itemId: string; edge: "left" | "right" } | { kind: "summary"; rowId: string; edge: "left" | "right" }];
  "resize-preview": [payload: { deltaDays: number }];
  "resize-end": [];
  "hover-cell": [payload: HoveredCellState];
}>();

const containerRef = ref<HTMLElement | null>(null);
const marqueeState = ref<MarqueeState | null>(null);
const panState = ref<PanState | null>(null);
const moveState = ref<MoveState | null>(null);
const resizeState = ref<ResizeState | null>(null);
const isSpacePressed = ref(false);
const hoveredWorkConnectionId = ref<string | null>(null);
const hoveredCriticalPathPathId = ref<number | null>(null);
const hoveredMilestoneId = ref<string | null>(null);
const hoveredConnectionTargetItemId = ref<string | null>(null);
const previewConnectionPoint = ref<PreviewConnectionPoint | null>(null);
const hoveredCell = ref<HoveredCellState>({ rowId: null, date: null });
const renameEditorRef = ref<HTMLElement | null>(null);
const milestoneRenameEditorRef = ref<HTMLElement | null>(null);
const renameDraft = ref("");
const milestoneRenameDraft = ref("");
const shouldCommitRenameOnBlur = ref(true);
const shouldCommitMilestoneRenameOnBlur = ref(true);
let lastItemPointerDown:
  | {
      itemId: string;
      timestamp: number;
    }
  | null = null;
let lastMilestonePointerDown:
  | {
      milestoneId: string;
      timestamp: number;
    }
  | null = null;
let syncingFromProp = false;
const LANE_GAP = 6;
const DRAG_ACTIVATION_THRESHOLD = 4;
const ITEM_RENAME_DOUBLE_CLICK_WINDOW_MS = 320;

const selectedItemIdSet = computed(() => new Set(props.selectedItemIds));
const selectedRowIdSet = computed(() => new Set(props.selectedRowIds));
const selectedWorkConnectionIdSet = computed(() => new Set(props.selectedWorkConnectionIds));
const selectedMilestoneIdSet = computed(() => new Set(props.selectedMilestoneIds));
const selectedCriticalPathIdSet = computed(() => new Set(props.selectedCriticalPathIds ?? []));
const selectedCriticalPathPathIdSet = computed(() => {
  const pathIds = new Set<number>();

  props.shellLayout.connections.forEach((connection) => {
    if (
      connection.kind === "critical-path" &&
      selectedCriticalPathIdSet.value.has(connection.id)
    ) {
      pathIds.add(connection.pathId);
    }
  });

  return pathIds;
});
const criticalPathColorsByItemId = computed(() => {
  const colorsByItemId = new Map<string, string[]>();

  props.shellLayout.connections.forEach((connection) => {
    if (connection.kind !== "critical-path" || !connection.colorHex) {
      return;
    }

    [connection.sourceItemId, connection.targetItemId].forEach((itemId) => {
      const colors = colorsByItemId.get(itemId) ?? [];
      if (!colors.includes(connection.colorHex!)) {
        colors.push(connection.colorHex!);
      }
      colorsByItemId.set(itemId, colors);
    });
  });

  return colorsByItemId;
});
const highlightedCriticalPathColorsByItemId = computed(() => {
  const colorsByItemId = new Map<string, string[]>();

  props.shellLayout.connections.forEach((connection) => {
    if (
      connection.kind !== "critical-path" ||
      !connection.colorHex ||
      !isCriticalPathHighlighted(connection.id, connection.pathId)
    ) {
      return;
    }

    [connection.sourceItemId, connection.targetItemId].forEach((itemId) => {
      const colors = colorsByItemId.get(itemId) ?? [];
      if (!colors.includes(connection.colorHex!)) {
        colors.push(connection.colorHex!);
      }
      colorsByItemId.set(itemId, colors);
    });
  });

  return colorsByItemId;
});
const connectionSourceBar = computed(() =>
  props.connectionCreationState?.sourceItemId
    ? props.shellLayout.bars.find(
        (bar) => bar.kind === "item" && bar.itemId === props.connectionCreationState?.sourceItemId,
      ) ?? null
    : null,
);
const hoveredTimelineDay = computed(() =>
  hoveredCell.value.date
    ? props.timeline.days.find((day) => day.date === hoveredCell.value.date) ?? null
    : null,
);
const todayTimelineDay = computed(() => props.timeline.days.find((day) => day.isToday) ?? null);
const divisionTodayBorderStyles = computed(() => {
  const today = todayTimelineDay.value;

  if (!today) {
    return [];
  }

  return props.shellLayout.rows
    .filter((row) => row.kind === "division")
    .map((row) => {
      const leftOffset = today.left > 0 ? 1 : 0;

      return {
        key: `today-division-border-${row.id}`,
        style: {
          left: `${today.left - leftOffset}px`,
          top: `${row.top}px`,
          width: `${today.width + leftOffset}px`,
          height: `${row.height}px`,
        },
      };
    });
});
const hoveredShellRow = computed(() =>
  hoveredCell.value.rowId
    ? props.shellLayout.rows.find((row) => row.id === hoveredCell.value.rowId) ?? null
    : null,
);
const editingItemBar = computed(() =>
  props.editingItemId
    ? props.shellLayout.bars.find(
        (bar) => bar.kind === "item" && bar.itemId === props.editingItemId,
      ) ?? null
    : null,
);
const editingMilestone = computed(() =>
  props.editingMilestoneId
    ? props.shellLayout.milestones.find((milestone) => milestone.id === props.editingMilestoneId) ??
      null
    : null,
);
const normalizedZoomScale = computed(() => Math.min(Math.max(props.zoomScale, 0.68), 1.46));
const connectionLabelFontSize = computed(() => Math.round(14 * normalizedZoomScale.value));
const connectionLabelStrokeWidth = computed(() => Math.max(2.25, 3.5 * normalizedZoomScale.value));

function buildRoundedOrthogonalPreviewPath(
  points: Array<{ x: number; y: number }>,
  cornerRadius = 10,
) {
  if (points.length <= 1) {
    return null;
  }

  const segments = [`M ${points[0]!.x} ${points[0]!.y}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const next = points[index + 1]!;
    const previousDistance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const nextDistance = Math.hypot(next.x - current.x, next.y - current.y);
    const radius = Math.min(cornerRadius, previousDistance / 2, nextDistance / 2);

    if (radius <= 0) {
      segments.push(`L ${current.x} ${current.y}`);
      continue;
    }

    if (previous.y === current.y && current.x === next.x) {
      const beforeX = current.x - Math.sign(current.x - previous.x) * radius;
      const afterY = current.y + Math.sign(next.y - current.y) * radius;
      segments.push(`L ${beforeX} ${current.y}`);
      segments.push(`Q ${current.x} ${current.y} ${current.x} ${afterY}`);
      continue;
    }

    if (previous.x === current.x && current.y === next.y) {
      const beforeY = current.y - Math.sign(current.y - previous.y) * radius;
      const afterX = current.x + Math.sign(next.x - current.x) * radius;
      segments.push(`L ${current.x} ${beforeY}`);
      segments.push(`Q ${current.x} ${current.y} ${afterX} ${current.y}`);
      continue;
    }

    segments.push(`L ${current.x} ${current.y}`);
  }

  const lastPoint = points[points.length - 1]!;
  segments.push(`L ${lastPoint.x} ${lastPoint.y}`);

  return segments.join(" ");
}

const previewConnectionPath = computed(() => {
  if (!connectionSourceBar.value || !previewConnectionPoint.value) {
    return null;
  }

  const sourceX = connectionSourceBar.value.left + connectionSourceBar.value.width;
  const sourceY = connectionSourceBar.value.top + connectionSourceBar.value.height / 2;
  const targetX = previewConnectionPoint.value.x;
  const targetY = previewConnectionPoint.value.y;

  if (sourceY === targetY) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  if (targetX >= sourceX + 24) {
    const bendX = sourceX + Math.max((targetX - sourceX) / 2, 28);
    return buildRoundedOrthogonalPreviewPath([
      { x: sourceX, y: sourceY },
      { x: bendX, y: sourceY },
      { x: bendX, y: targetY },
      { x: targetX, y: targetY },
    ]);
  }

  const bendX = Math.max(sourceX, targetX) + 36;
  return buildRoundedOrthogonalPreviewPath([
    { x: sourceX, y: sourceY },
    { x: bendX, y: sourceY },
    { x: bendX, y: targetY },
    { x: targetX, y: targetY },
  ]);
});

const marqueeRectStyle = computed(() => {
  if (!marqueeState.value) {
    return null;
  }

  const left = Math.min(marqueeState.value.startX, marqueeState.value.currentX);
  const top = Math.min(marqueeState.value.startY, marqueeState.value.currentY);
  const width = Math.abs(marqueeState.value.currentX - marqueeState.value.startX);
  const height = Math.abs(marqueeState.value.currentY - marqueeState.value.startY);

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

const hoveredDayOverlayStyle = computed(() => {
  if (!hoveredTimelineDay.value) {
    return null;
  }

  return {
    left: `${hoveredTimelineDay.value.left}px`,
    width: `${hoveredTimelineDay.value.width}px`,
    height: `${props.shellLayout.chartHeight}px`,
  };
});

const hoveredRowOverlayStyle = computed(() => {
  if (!hoveredShellRow.value) {
    return null;
  }

  return {
    top: `${hoveredShellRow.value.top}px`,
    height: `${hoveredShellRow.value.height}px`,
    width: `${props.timeline.chartWidth}px`,
  };
});

const hoveredIntersectionStyle = computed(() => {
  if (
    !hoveredTimelineDay.value ||
    !hoveredShellRow.value ||
    hoveredShellRow.value.kind !== "child-process"
  ) {
    return null;
  }

  return {
    left: `${hoveredTimelineDay.value.left}px`,
    top: `${hoveredShellRow.value.top}px`,
    width: `${hoveredTimelineDay.value.width}px`,
    height: `${hoveredShellRow.value.height}px`,
  };
});

watch(
  () => [props.scrollTop, props.scrollLeft] as const,
  ([nextScrollTop, nextScrollLeft]) => {
    const element = containerRef.value;
    if (!element) {
      return;
    }

    const topDiff = Math.abs(element.scrollTop - nextScrollTop);
    const leftDiff = Math.abs(element.scrollLeft - nextScrollLeft);
    if (topDiff < 1 && leftDiff < 1) {
      return;
    }

    syncingFromProp = true;
    element.scrollTop = nextScrollTop;
    element.scrollLeft = nextScrollLeft;
  },
);

watch(
  () => props.connectionCreationState,
  (nextConnectionCreationState) => {
    if (!nextConnectionCreationState || !connectionSourceBar.value) {
      previewConnectionPoint.value = null;
      hoveredConnectionTargetItemId.value = null;
      return;
    }

    previewConnectionPoint.value = {
      x: connectionSourceBar.value.left + connectionSourceBar.value.width,
      y: connectionSourceBar.value.top + connectionSourceBar.value.height / 2,
    };
  },
);

watch(
  () => props.editingItemId,
  async () => {
    shouldCommitRenameOnBlur.value = true;
    renameDraft.value = editingItemBar.value?.name ?? "";

    if (!props.editingItemId) {
      return;
    }

    await nextTick();
    requestAnimationFrame(() => {
      const editor = renameEditorRef.value;

      if (!editor) {
        return;
      }

      editor.textContent = renameDraft.value;
      editor.focus();

      const selection = window.getSelection();
      if (!selection) {
        return;
      }

      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  },
  { immediate: true },
);

watch(
  () => props.editingMilestoneId,
  async () => {
    shouldCommitMilestoneRenameOnBlur.value = true;
    milestoneRenameDraft.value = editingMilestone.value?.label ?? "";

    if (!props.editingMilestoneId) {
      return;
    }

    await nextTick();
    requestAnimationFrame(() => {
      const editor = milestoneRenameEditorRef.value;

      if (!editor) {
        return;
      }

      editor.textContent = milestoneRenameDraft.value;
      editor.focus();

      const selection = window.getSelection();
      if (!selection) {
        return;
      }

      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  },
  { immediate: true },
);

watch(
  () => props.interactionCancelVersion,
  () => {
    panState.value = null;
    moveState.value = null;
    resizeState.value = null;
    marqueeState.value = null;
  },
);

function setRenameEditorRef(
  element: Element | ComponentPublicInstance | null,
  _refs?: Record<string, unknown>,
) {
  renameEditorRef.value = element instanceof HTMLElement ? element : null;
}

function setMilestoneRenameEditorRef(
  element: Element | ComponentPublicInstance | null,
  _refs?: Record<string, unknown>,
) {
  milestoneRenameEditorRef.value = element instanceof HTMLElement ? element : null;
}

function getContentPoint(event: PointerEvent | MouseEvent) {
  const element = containerRef.value;
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left + element.scrollLeft,
    y: event.clientY - rect.top + element.scrollTop,
  };
}

function getDateAtContentX(contentX: number) {
  const dayIndex = Math.floor(contentX / props.timeline.dayWidth);
  return props.timeline.days[dayIndex]?.date ?? null;
}

function getRowIdAtContentY(contentY: number) {
  const row = props.shellLayout.rows.find(
    (candidate) => contentY >= candidate.top && contentY < candidate.top + candidate.height,
  );
  return row?.id ?? null;
}

function selectBarsInMarquee() {
  if (!marqueeState.value) {
    return;
  }

  const left = Math.min(marqueeState.value.startX, marqueeState.value.currentX);
  const right = Math.max(marqueeState.value.startX, marqueeState.value.currentX);
  const top = Math.min(marqueeState.value.startY, marqueeState.value.currentY);
  const bottom = Math.max(marqueeState.value.startY, marqueeState.value.currentY);

  const selectedBars = props.shellLayout.bars.filter((bar) => {
    const barRight = bar.left + bar.width;
    const barBottom = bar.top + bar.height;
    return bar.left < right && barRight > left && bar.top < bottom && barBottom > top;
  });
  const selectedMilestones = props.shellLayout.milestones.filter((milestone) => {
    const chipRight = milestone.left + milestone.width / 2;
    const chipLeft = chipRight - milestone.labelWidth;
    const chipTop = milestone.top;
    const chipBottom = milestone.top + milestone.height;
    return chipLeft < right && chipRight > left && chipTop < bottom && chipBottom > top;
  });

  emit("select-bars", {
    itemIds: selectedBars.filter((bar) => bar.kind === "item").map((bar) => bar.itemId),
    rowIds: selectedBars.filter((bar) => bar.kind === "summary").map((bar) => bar.rowId),
    milestoneIds: selectedMilestones.map((milestone) => milestone.id),
  });
}

function handleScroll(event: Event) {
  if (syncingFromProp) {
    syncingFromProp = false;
    return;
  }

  const target = event.target as HTMLElement;
  emit("scroll-change", {
    top: target.scrollTop,
    left: target.scrollLeft,
  });
}

function updateHoveredCell(nextHoveredCell: HoveredCellState) {
  if (
    hoveredCell.value.rowId === nextHoveredCell.rowId &&
    hoveredCell.value.date === nextHoveredCell.date
  ) {
    return;
  }

  hoveredCell.value = nextHoveredCell;
  emit("hover-cell", nextHoveredCell);
}

function clearHoveredCell() {
  updateHoveredCell({ rowId: null, date: null });
}

function handlePanePointerMove(event: PointerEvent) {
  const point = getContentPoint(event);
  if (!point) {
    clearHoveredCell();
    return;
  }

  updateHoveredCell({
    rowId: getRowIdAtContentY(point.y),
    date: getDateAtContentX(point.x),
  });
}

function startPanSession(event: PointerEvent) {
  const element = containerRef.value;
  if (!element) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  panState.value = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    startScrollLeft: element.scrollLeft,
    startScrollTop: element.scrollTop,
  };
}

function handlePanePointerDownCapture(event: PointerEvent) {
  if (event.button === 1) {
    startPanSession(event);
  }
}

function handlePanePointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }

  if (props.editingItemId) {
    return;
  }

  if (props.connectionCreationState) {
    emit("cancel-connection-create");
    return;
  }

  const point = getContentPoint(event);
  if (!point) {
    return;
  }

  if (isSpacePressed.value) {
    startPanSession(event);
    return;
  }

  marqueeState.value = {
    startX: point.x,
    startY: point.y,
    currentX: point.x,
    currentY: point.y,
  };
}

function handleBarPointerDown(bar: DesktopScheduleBarLayout, event: PointerEvent) {
  if (event.button !== 0 || isSpacePressed.value) {
    return;
  }

  event.stopPropagation();

  if (props.editingItemId) {
    return;
  }

  if (props.connectionCreationState) {
    lastItemPointerDown = null;

    if (bar.kind !== "item") {
      emit("cancel-connection-create");
      return;
    }

    if (
      props.connectionCreationState.kind === "critical-path" &&
      connectionSourceBar.value &&
      bar.left <= connectionSourceBar.value.left
    ) {
      emit("cancel-connection-create");
      return;
    }

    if (bar.itemId === props.connectionCreationState.sourceItemId) {
      emit("cancel-connection-create");
    } else {
      emit("complete-connection-create", bar.itemId);
    }
    return;
  }

  if (bar.kind === "item" && event.shiftKey) {
    event.preventDefault();
    lastItemPointerDown = null;

    const nextItemIds = selectedItemIdSet.value.has(bar.itemId)
      ? props.selectedItemIds.filter((itemId) => itemId !== bar.itemId)
      : [...props.selectedItemIds, bar.itemId];

    emit("select-bars", {
      itemIds: nextItemIds,
      rowIds: [],
    });
    return;
  }

  if (bar.kind === "item") {
    const now = Date.now();
    const isSameBarDoublePress =
      lastItemPointerDown?.itemId === bar.itemId &&
      now - lastItemPointerDown.timestamp <= ITEM_RENAME_DOUBLE_CLICK_WINDOW_MS;

    lastItemPointerDown = {
      itemId: bar.itemId,
      timestamp: now,
    };

    if (isSameBarDoublePress) {
      lastItemPointerDown = null;
      emit("start-item-rename", bar.itemId);
      return;
    }
  } else {
    lastItemPointerDown = null;
  }

  if (bar.kind === "summary") {
    emit("move-start", { kind: "summary", rowId: bar.rowId });
    moveState.value = {
      target: "summary",
      rowId: bar.rowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      laneStep: bar.height + LANE_GAP,
      didDrag: false,
    };
    return;
  }

  emit("move-start", { kind: "item", itemId: bar.itemId });
  moveState.value = {
    target: "item",
    rowId: null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    laneStep: bar.height + LANE_GAP,
    didDrag: false,
  };
}

function handleBarPointerEnter(bar: DesktopScheduleBarLayout) {
  if (
    !props.connectionCreationState ||
    bar.kind !== "item" ||
    bar.itemId === props.connectionCreationState.sourceItemId ||
    (props.connectionCreationState.kind === "critical-path" &&
      connectionSourceBar.value !== null &&
      bar.left <= connectionSourceBar.value.left)
  ) {
    hoveredConnectionTargetItemId.value = null;
    return;
  }

  hoveredConnectionTargetItemId.value = bar.itemId;
}

function handleBarPointerLeave(bar: DesktopScheduleBarLayout) {
  if (hoveredConnectionTargetItemId.value === bar.itemId) {
    hoveredConnectionTargetItemId.value = null;
  }
}

function handleResizePointerDown(
  bar: DesktopScheduleBarLayout,
  edge: "left" | "right",
  event: PointerEvent,
) {
  if (props.connectionCreationState || event.button !== 0 || isSpacePressed.value) {
    return;
  }

  event.stopPropagation();

  if (bar.kind === "summary") {
    emit("resize-start", { kind: "summary", rowId: bar.rowId, edge });
  } else {
    emit("resize-start", { kind: "item", itemId: bar.itemId, edge });
  }

  resizeState.value = {
    startClientX: event.clientX,
    edge,
  };
}

function handlePaneContextMenu(event: MouseEvent) {
  const point = getContentPoint(event);
  emit("canvas-context-menu", {
    x: event.clientX,
    y: event.clientY,
    rowId: point ? getRowIdAtContentY(point.y) : null,
    date: point ? getDateAtContentX(point.x) : null,
  });
}

function handleRowContextMenu(row: DesktopScheduleShellLayout["rows"][number], event: MouseEvent) {
  if (row.kind === "division") {
    return;
  }

  if (row.kind === "milestone" || row.kind === "child-process") {
    const point = getContentPoint(event);
    emit("canvas-context-menu", {
      x: event.clientX,
      y: event.clientY,
      rowId: row.id,
      date: point ? getDateAtContentX(point.x) : null,
    });
    return;
  }

  emit("row-context-menu", {
    rowId: row.id,
    x: event.clientX,
    y: event.clientY,
  });
}

function handleRowPointerDown(row: DesktopScheduleShellLayout["rows"][number], event: PointerEvent) {
  if (
    event.button === 0 &&
    row.kind === "child-process" &&
    !isSpacePressed.value &&
    !props.editingItemId &&
    !props.connectionCreationState
  ) {
    event.stopPropagation();
    emit("select-row", row.id);
    return;
  }

  if (row.kind === "milestone") {
    event.stopPropagation();
  }

  if (row.kind === "division" && !isSpacePressed.value) {
    event.stopPropagation();
  }
}

function getMilestoneIdFromTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  return element?.closest<HTMLElement>("[data-milestone-id]")?.dataset.milestoneId ?? null;
}

function handleMilestonePointerDown(
  milestone: DesktopScheduleShellLayout["milestones"][number],
  event: PointerEvent,
) {
  event.stopPropagation();

  if (event.button !== 0 || isSpacePressed.value || props.editingMilestoneId) {
    return;
  }

  if (props.connectionCreationState) {
    emit("cancel-connection-create");
    return;
  }

  const now = Date.now();
  const isSameMilestoneDoublePress =
    lastMilestonePointerDown?.milestoneId === milestone.id &&
    now - lastMilestonePointerDown.timestamp <= ITEM_RENAME_DOUBLE_CLICK_WINDOW_MS;

  lastMilestonePointerDown = {
    milestoneId: milestone.id,
    timestamp: now,
  };

  if (isSameMilestoneDoublePress) {
    lastMilestonePointerDown = null;
    emit("start-milestone-rename", milestone.id);
    return;
  }

  emit("move-start", { kind: "milestone", milestoneId: milestone.id });
  moveState.value = {
    target: "milestone",
    rowId: null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    laneStep: milestone.height + LANE_GAP,
    didDrag: false,
  };
}

function handleMilestonePointerEnter(milestoneId: string) {
  hoveredMilestoneId.value = milestoneId;
}

function handleMilestonePointerLeave(milestoneId: string, event: PointerEvent) {
  if (getMilestoneIdFromTarget(event.relatedTarget) === milestoneId) {
    return;
  }

  if (hoveredMilestoneId.value === milestoneId) {
    hoveredMilestoneId.value = null;
  }
}

function handleMilestoneContextMenu(milestoneId: string, event: MouseEvent) {
  hoveredMilestoneId.value = milestoneId;
  emit("milestone-context-menu", {
    milestoneId,
    x: event.clientX,
    y: event.clientY,
  });
}

function handleBarContextMenu(bar: DesktopScheduleBarLayout, event: MouseEvent) {
  if (bar.kind === "summary") {
    emit("row-context-menu", {
      rowId: bar.rowId,
      x: event.clientX,
      y: event.clientY,
    });
    return;
  }

  emit("item-context-menu", {
    itemId: bar.itemId,
    x: event.clientX,
    y: event.clientY,
  });
}

function handleRenameEditableInput(event: Event) {
  const target = event.target as HTMLElement | null;
  renameDraft.value = target?.textContent?.replace(/\n/g, "") ?? "";
}

function handleRenameEditableBlur(itemId: string) {
  if (shouldCommitRenameOnBlur.value) {
    emit("commit-item-rename", {
      itemId,
      name: renameDraft.value,
    });
  } else {
    emit("cancel-item-rename");
  }

  shouldCommitRenameOnBlur.value = true;
}

function handleRenameEditableEnter() {
  shouldCommitRenameOnBlur.value = true;
  renameEditorRef.value?.blur();
}

function handleRenameEditableEscape() {
  shouldCommitRenameOnBlur.value = false;
  renameEditorRef.value?.blur();
}

function handleMilestoneRenameEditableInput(event: Event) {
  const target = event.target as HTMLElement | null;
  milestoneRenameDraft.value = target?.textContent?.replace(/\n/g, "") ?? "";
}

function handleMilestoneRenameEditableBlur(milestoneId: string) {
  if (shouldCommitMilestoneRenameOnBlur.value) {
    emit("commit-milestone-rename", {
      milestoneId,
      label: milestoneRenameDraft.value,
    });
  } else {
    emit("cancel-milestone-rename");
  }

  shouldCommitMilestoneRenameOnBlur.value = true;
}

function handleMilestoneRenameEditableEnter() {
  shouldCommitMilestoneRenameOnBlur.value = true;
  milestoneRenameEditorRef.value?.blur();
}

function handleMilestoneRenameEditableEscape() {
  shouldCommitMilestoneRenameOnBlur.value = false;
  milestoneRenameEditorRef.value?.blur();
}

function normalizeHexColor(colorHex: string) {
  const sanitized = colorHex.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(sanitized)) {
    return sanitized
      .split("")
      .map((character) => `${character}${character}`)
      .join("");
  }

  return /^[0-9a-fA-F]{6}$/.test(sanitized) ? sanitized : null;
}

function toAlphaColor(colorHex: string, alpha: number) {
  const normalizedHex = normalizeHexColor(colorHex);
  if (!normalizedHex) {
    return colorHex;
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function mixHexWithWhite(colorHex: string, colorWeight: number) {
  const normalizedHex = normalizeHexColor(colorHex);
  if (!normalizedHex) {
    return colorHex;
  }

  const clampedWeight = Math.min(Math.max(colorWeight, 0), 1);
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  const mixedRed = Math.round(255 - (255 - red) * clampedWeight);
  const mixedGreen = Math.round(255 - (255 - green) * clampedWeight);
  const mixedBlue = Math.round(255 - (255 - blue) * clampedWeight);

  return `rgb(${mixedRed}, ${mixedGreen}, ${mixedBlue})`;
}

function getBarInlineStyle(bar: DesktopScheduleBarLayout) {
  const hasFocusedBorder =
    (bar.kind === "summary" && selectedRowIdSet.value.has(bar.rowId)) ||
    (bar.kind === "item" &&
      (selectedItemIdSet.value.has(bar.itemId) ||
        props.editingItemId === bar.itemId ||
        (!!props.connectionCreationState &&
          (bar.itemId === props.connectionCreationState.sourceItemId ||
            hoveredConnectionTargetItemId.value === bar.itemId))));
  const style: Record<string, string> = {
    left: `${bar.left}px`,
    top: `${bar.top}px`,
    width: `${bar.width}px`,
    height: `${bar.height}px`,
  };

  if (bar.colorHex) {
    style["--schedule-bar-accent-color"] = mixHexWithWhite(bar.colorHex, 0.62);
    style["--schedule-bar-focus-shadow"] = toAlphaColor(bar.colorHex, 0.18);
    style.backgroundColor = mixHexWithWhite(bar.colorHex, 0.24);
    style.borderColor = mixHexWithWhite(bar.colorHex, hasFocusedBorder ? 0.62 : 0.46);
  } else {
    style["--schedule-bar-accent-color"] = "#64748b";
    style["--schedule-bar-focus-shadow"] = "rgba(71, 85, 105, 0.18)";
  }

  if (bar.kind === "item") {
    const criticalPathColors = criticalPathColorsByItemId.value.get(bar.itemId) ?? [];
    const highlightedCriticalPathColors =
      highlightedCriticalPathColorsByItemId.value.get(bar.itemId) ?? [];
    if (criticalPathColors.length > 0) {
      const [primaryColor, secondaryColor] = criticalPathColors;
      const [highlightedPrimaryColor, highlightedSecondaryColor] = highlightedCriticalPathColors;
      const hasHighlightedCriticalPath = highlightedCriticalPathColors.length > 0;
      const basePrimaryColor = highlightedPrimaryColor ?? primaryColor;
      const baseSecondaryColor = highlightedSecondaryColor ?? secondaryColor;
      const nextShadowLayers = selectedItemIdSet.value.has(bar.itemId)
        ? [
            "0 0 0 1px rgba(15,23,42,0.18)",
            `0 0 0 4px ${toAlphaColor(basePrimaryColor!, hasHighlightedCriticalPath ? 0.7 : 0.52)}`,
            `0 0 18px ${toAlphaColor(basePrimaryColor!, hasHighlightedCriticalPath ? 0.42 : 0.3)}`,
            `0 12px 24px ${toAlphaColor(basePrimaryColor!, hasHighlightedCriticalPath ? 0.34 : 0.24)}`,
          ]
        : [
            `0 0 0 ${hasHighlightedCriticalPath ? 3 : 2}px ${toAlphaColor(basePrimaryColor!, hasHighlightedCriticalPath ? 0.9 : 0.72)}`,
            `0 0 ${hasHighlightedCriticalPath ? 24 : 16}px ${toAlphaColor(basePrimaryColor!, hasHighlightedCriticalPath ? 0.38 : 0.28)}`,
            `0 12px ${hasHighlightedCriticalPath ? 28 : 22}px ${toAlphaColor(basePrimaryColor!, hasHighlightedCriticalPath ? 0.3 : 0.22)}`,
          ];

      if (baseSecondaryColor) {
        nextShadowLayers.push(
          `0 0 0 ${selectedItemIdSet.value.has(bar.itemId) ? 7 : 5}px ${toAlphaColor(
            baseSecondaryColor,
            hasHighlightedCriticalPath ? 0.4 : 0.28,
          )}`,
          `0 0 ${hasHighlightedCriticalPath ? 28 : 22}px ${toAlphaColor(baseSecondaryColor, hasHighlightedCriticalPath ? 0.24 : 0.18)}`,
        );
      }

      style.boxShadow = nextShadowLayers.join(", ");
    }
  }

  return style;
}

function getBarClassList(bar: DesktopScheduleBarLayout) {
  if (bar.kind === "summary") {
    return {
      "schedule-chart-body__bar--summary": true,
      "schedule-chart-body__bar--summary-selected": selectedRowIdSet.value.has(bar.rowId),
    };
  }

  return {
    "schedule-chart-body__bar--item": true,
    "schedule-chart-body__bar--item-selected": selectedItemIdSet.value.has(bar.itemId),
    "schedule-chart-body__bar--item-editing": props.editingItemId === bar.itemId,
    "schedule-chart-body__bar--holiday-off": bar.appearance === "holiday-off",
    "schedule-chart-body__bar--connection-source":
      !!props.connectionCreationState && bar.itemId === props.connectionCreationState.sourceItemId,
    "schedule-chart-body__bar--connection-target":
      !!props.connectionCreationState && hoveredConnectionTargetItemId.value === bar.itemId,
  };
}

function getResizeHandleClass(bar: DesktopScheduleBarLayout, _edge: "left" | "right") {
  return {
    "schedule-chart-body__resize-handle--visible":
      bar.kind === "summary" ||
      (bar.kind === "item" && selectedItemIdSet.value.has(bar.itemId)),
  };
}

function getDayColumnClass(day: DesktopScheduleTimelineLayout["days"][number]) {
  if (day.isWeekend) {
    return "schedule-chart-body__day-column--weekend";
  }

  if (day.isToday) {
    return "schedule-chart-body__day-column--today";
  }

  return "";
}

function getConnectionStroke(connection: DesktopScheduleConnectionLayout) {
  return connection.colorHex ?? "#64748b";
}

function getConnectionStrokeWidth(kind: DesktopScheduleConnectionLayout["kind"]) {
  if (kind === "work-connection") {
    return 2;
  }

  if (kind === "critical-path") {
    return 2.25;
  }

  return 1.25;
}

function getConnectionLabelColor(connection: DesktopScheduleConnectionLayout) {
  return connection.colorHex ?? "#64748b";
}

function isWorkConnectionHighlighted(connectionId: string) {
  return (
    hoveredWorkConnectionId.value === connectionId ||
    selectedWorkConnectionIdSet.value.has(connectionId)
  );
}

function getRenderedConnectionStrokeWidth(
  connectionId: string,
  kind: DesktopScheduleConnectionLayout["kind"],
  pathId?: number,
) {
  if (kind === "work-connection" && isWorkConnectionHighlighted(connectionId)) {
    return 3;
  }

  if (
    kind === "critical-path" &&
    pathId !== undefined &&
    isCriticalPathHighlighted(connectionId, pathId)
  ) {
    return 3.25;
  }

  if (
    kind === "critical-path" &&
    pathId !== undefined &&
    hoveredCriticalPathPathId.value === pathId
  ) {
    return 3.75;
  }

  return getConnectionStrokeWidth(kind);
}

function handleWorkConnectionPointerEnter(workConnectionId: string) {
  hoveredWorkConnectionId.value = workConnectionId;
}

function handleWorkConnectionPointerLeave(workConnectionId: string) {
  if (hoveredWorkConnectionId.value === workConnectionId) {
    hoveredWorkConnectionId.value = null;
  }
}

function handleWorkConnectionContextMenu(workConnectionId: string, event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  hoveredWorkConnectionId.value = workConnectionId;
  emit("work-connection-context-menu", {
    workConnectionId,
    x: event.clientX,
    y: event.clientY,
  });
}

function isCriticalPathHighlighted(connectionId: string, pathId: number) {
  return (
    selectedCriticalPathIdSet.value.has(connectionId) ||
    selectedCriticalPathPathIdSet.value.has(pathId) ||
    hoveredCriticalPathPathId.value === pathId
  );
}

function handleCriticalPathPointerEnter(pathId: number) {
  hoveredCriticalPathPathId.value = pathId;
}

function handleCriticalPathPointerLeave(pathId: number) {
  if (hoveredCriticalPathPathId.value === pathId) {
    hoveredCriticalPathPathId.value = null;
  }
}

function handleCriticalPathContextMenu(criticalPathId: string, event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  const criticalPathConnection = props.shellLayout.connections.find(
    (connection) => connection.kind === "critical-path" && connection.id === criticalPathId,
  );
  hoveredCriticalPathPathId.value = criticalPathConnection?.pathId ?? null;
  emit("critical-path-context-menu", {
    criticalPathId,
    x: event.clientX,
    y: event.clientY,
  });
}

function handlePointerMove(event: PointerEvent) {
  if (props.connectionCreationState) {
    const point = getContentPoint(event);
    if (point) {
      previewConnectionPoint.value = point;
    }
  }

  if (panState.value) {
    const element = containerRef.value;
    if (!element) {
      return;
    }

    element.scrollLeft =
      panState.value.startScrollLeft - (event.clientX - panState.value.startClientX);
    element.scrollTop =
      panState.value.startScrollTop - (event.clientY - panState.value.startClientY);
    emit("scroll-change", {
      top: element.scrollTop,
      left: element.scrollLeft,
    });
    return;
  }

  if (moveState.value) {
    const deltaX = event.clientX - moveState.value.startClientX;
    const deltaY = event.clientY - moveState.value.startClientY;
    const didDrag =
      Math.abs(deltaX) >= DRAG_ACTIVATION_THRESHOLD ||
      Math.abs(deltaY) >= DRAG_ACTIVATION_THRESHOLD;

    if (didDrag && !moveState.value.didDrag) {
      moveState.value = {
        ...moveState.value,
        didDrag: true,
      };
    }

    emit("move-preview", {
      deltaDays: Math.round(deltaX / props.timeline.dayWidth),
      deltaLanes: Math.round(deltaY / moveState.value.laneStep),
    });
    return;
  }

  if (resizeState.value) {
    emit("resize-preview", {
      deltaDays: Math.round((event.clientX - resizeState.value.startClientX) / props.timeline.dayWidth),
    });
    return;
  }

  if (marqueeState.value) {
    const point = getContentPoint(event);
    if (!point) {
      return;
    }

    marqueeState.value = {
      ...marqueeState.value,
      currentX: point.x,
      currentY: point.y,
    };
    selectBarsInMarquee();
  }
}

function handlePointerUp() {
  if (panState.value) {
    panState.value = null;
    return;
  }

  if (moveState.value) {
    if (moveState.value.target === "summary" && !moveState.value.didDrag && moveState.value.rowId) {
      emit("toggle-row-collapse", moveState.value.rowId);
    }
    emit("move-end");
    moveState.value = null;
    return;
  }

  if (resizeState.value) {
    emit("resize-end");
    resizeState.value = null;
    return;
  }

  if (marqueeState.value) {
    const width = Math.abs(marqueeState.value.currentX - marqueeState.value.startX);
    const height = Math.abs(marqueeState.value.currentY - marqueeState.value.startY);

    if (width < 4 && height < 4) {
      emit("clear-selection");
    } else {
      selectBarsInMarquee();
    }

    marqueeState.value = null;
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (
    target &&
    (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)
  ) {
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    if (
      props.selectedRowIds.length > 0 ||
      props.selectedItemIds.length > 0 ||
      props.selectedWorkConnectionIds.length > 0 ||
      props.selectedMilestoneIds.length > 0
    ) {
      event.preventDefault();
      emit("delete-selection");
    }
    return;
  }

  if (event.key === "Escape" && props.connectionCreationState) {
    emit("cancel-connection-create");
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    isSpacePressed.value = true;
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.code === "Space") {
    isSpacePressed.value = false;
  }
}

onMounted(() => {
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
});
</script>

<style scoped src="./styles/DesktopScheduleChartBody.css"></style>
