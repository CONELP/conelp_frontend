<template>
  <div
    ref="containerRef"
    class="schedule-chart-body"
    :class="{
      'schedule-chart-body--grab': isSpacePressed && !panState,
      'schedule-chart-body--grabbing': !!panState,
      'schedule-chart-body--crosshair': !!connectionCreationState,
      'schedule-chart-body--locked':
        marqueeState || moveState || resizeState || panState,
      'schedule-chart-body--readonly': readOnly,
      'schedule-chart-body--execution-progress': executionProgressCompareVisible,
      'schedule-chart-body--execution-progress-active': executionProgressCompareVisible,
      'schedule-chart-body--execution-progress-leaving': executionProgressCompareLeaving,
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
      :class="{
        'schedule-chart-body__surface--ai-mode': isAiVerificationModeActive,
      }"
      :style="{
        width: `${timeline.chartWidth}px`,
        height: `${chartSurfaceHeight}px`,
      }"
    >
      <div
        v-for="day in timeline.days"
        :key="`day-column-${day.key}`"
        class="schedule-chart-body__day-column"
        :class="getDayColumnClass(day)"
        :style="{ left: `${day.left}px`, width: `${day.width}px`, height: `${chartSurfaceHeight}px` }"
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
          'schedule-chart-body__row--review-deleted': isReviewDeletedRow(row),
        }"
        :style="{ top: `${row.top}px`, height: `${row.height}px` }"
        @pointerdown="handleRowPointerDown(row, $event)"
        @contextmenu.prevent.stop="handleRowContextMenu(row, $event)"
      />

      <svg
        class="schedule-chart-body__vertical-grid"
        :width="timeline.chartWidth"
        :height="shellLayout.chartHeight"
        :viewBox="`0 0 ${timeline.chartWidth} ${shellLayout.chartHeight}`"
        :style="{ height: `${shellLayout.chartHeight}px` }"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          v-for="day in timeline.days"
          :key="`body-grid-${day.key}`"
          :x1="day.left + day.width"
          y1="0"
          :x2="day.left + day.width"
          :y2="shellLayout.chartHeight"
        />
      </svg>

      <div
        v-for="row in shellLayout.rows.filter((candidate) => candidate.kind === 'division')"
        :key="`division-grid-mask-${row.id}`"
        class="schedule-chart-body__division-grid-mask"
        :class="{
          'schedule-chart-body__division-grid-mask--selected': selectedRowIdSet.has(row.id),
        }"
        :style="{
          top: `${row.top}px`,
          width: `${timeline.chartWidth}px`,
          height: `${row.height}px`,
        }"
      />

      <div
        v-for="cell in divisionHolidayCells"
        :key="cell.key"
        class="schedule-chart-body__division-holiday-cell"
        :style="{
          left: `${cell.left}px`,
          top: `${cell.top}px`,
          width: `${cell.width}px`,
          height: `${cell.height}px`,
        }"
      />

      <svg
        class="schedule-chart-body__division-holiday-grid"
        :width="timeline.chartWidth"
        :height="chartSurfaceHeight"
        :viewBox="`0 0 ${timeline.chartWidth} ${chartSurfaceHeight}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <template
          v-for="cell in divisionHolidayCells"
          :key="`division-holiday-grid-${cell.key}`"
        >
          <line
            :x1="cell.left"
            :y1="cell.top"
            :x2="cell.left"
            :y2="cell.top + cell.height"
          />
          <line
            :x1="cell.left + cell.width"
            :y1="cell.top"
            :x2="cell.left + cell.width"
            :y2="cell.top + cell.height"
          />
        </template>
      </svg>

      <svg
        class="schedule-chart-body__row-grid"
        :width="timeline.chartWidth"
        :height="chartSurfaceHeight"
        :viewBox="`0 0 ${timeline.chartWidth} ${chartSurfaceHeight}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          v-for="row in shellLayout.rows"
          :key="`body-row-end-${row.id}`"
          class="schedule-chart-body__row-grid-line"
          x1="0"
          :y1="row.top + row.height"
          :x2="timeline.chartWidth"
          :y2="row.top + row.height"
        />
        <line
          v-for="row in workTypeDividerRows"
          :key="`body-work-type-end-${row.id}`"
          class="schedule-chart-body__row-grid-line schedule-chart-body__row-grid-line--strong"
          x1="0"
          :y1="row.top + row.height"
          :x2="timeline.chartWidth"
          :y2="row.top + row.height"
        />
        <line
          v-for="row in shellLayout.rows.filter((candidate) => candidate.kind === 'division')"
          :key="`body-division-start-${row.id}`"
          class="schedule-chart-body__row-grid-line schedule-chart-body__row-grid-line--strong"
          x1="0"
          :y1="row.top"
          :x2="timeline.chartWidth"
          :y2="row.top"
        />
        <line
          v-if="bottomSpacerHeight > 0"
          class="schedule-chart-body__row-grid-line schedule-chart-body__row-grid-line--strong"
          x1="0"
          :y1="shellLayout.chartHeight"
          :x2="timeline.chartWidth"
          :y2="shellLayout.chartHeight"
        />
      </svg>

      <div
        v-if="bottomSpacerStyle"
        class="schedule-chart-body__bottom-spacer"
        :style="bottomSpacerStyle"
      />

      <div
        v-for="day in bottomSpacerHolidayDays"
        :key="`bottom-spacer-holiday-${day.key}`"
        class="schedule-chart-body__bottom-spacer-holiday"
        :style="{
          left: `${day.left}px`,
          top: `${shellLayout.chartHeight}px`,
          width: `${day.width}px`,
          height: `${bottomSpacerHeight}px`,
        }"
      />

      <div
        v-for="day in holidayLabelDays"
        :key="`holiday-label-${day.key}`"
        class="schedule-chart-body__holiday-label-layer"
        :style="{
          left: `${day.left}px`,
          width: `${day.width}px`,
          height: `${chartSurfaceHeight}px`,
        }"
      >
        <span class="schedule-chart-body__day-column-holiday-label">
          {{ day.holidayName }}
        </span>
      </div>

      <div
        v-if="todayTimelineDay"
        class="schedule-chart-body__today-column-overlay"
        :style="{
          left: `${todayTimelineDay.left}px`,
          width: `${todayTimelineDay.width}px`,
          height: `${chartSurfaceHeight}px`,
        }"
      />

      <svg
        v-if="todayTimelineDay"
        class="schedule-chart-body__today-column-grid"
        :width="timeline.chartWidth"
        :height="chartSurfaceHeight"
        :viewBox="`0 0 ${timeline.chartWidth} ${chartSurfaceHeight}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          :x1="todayTimelineDay.left"
          y1="0"
          :x2="todayTimelineDay.left"
          :y2="chartSurfaceHeight"
        />
        <line
          :x1="todayTimelineDay.left + todayTimelineDay.width"
          y1="0"
          :x2="todayTimelineDay.left + todayTimelineDay.width"
          :y2="chartSurfaceHeight"
        />
      </svg>

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

      <div
        v-if="cellSelectionRangeStyle"
        :key="cellSelectionRangeKey"
        class="schedule-chart-body__cell-selection"
        :style="cellSelectionRangeStyle"
      />

      <div
        v-for="overlay in scheduleVersionReviewVisual?.baselineBarOverlays ?? []"
        :key="overlay.id"
        class="schedule-chart-body__review-bar-overlay"
        :style="{
          left: `${overlay.left}px`,
          top: `${overlay.top}px`,
          width: `${overlay.width}px`,
          height: `${overlay.height}px`,
        }"
        :title="overlay.name"
      >
        <span>{{ overlay.name }}</span>
      </div>

      <svg
        class="schedule-chart-body__connections"
        :width="timeline.chartWidth"
        :height="chartSurfaceHeight"
        :viewBox="`0 0 ${timeline.chartWidth} ${chartSurfaceHeight}`"
      >
        <g
          v-for="connection in scheduleVersionReviewVisual?.baselineConnectionOverlays ?? []"
          :key="connection.id"
          class="schedule-chart-body__review-connection"
        >
          <path
            :d="connection.path"
            fill="none"
            pointer-events="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <text
            v-if="connection.label"
            :x="connection.labelX"
            :y="connection.labelY"
            pointer-events="none"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="connectionLabelFontSize"
            font-weight="850"
            stroke="rgba(255,255,255,0.96)"
            :stroke-width="connectionLabelStrokeWidth"
            paint-order="stroke"
          >
            {{ connection.label }}
          </text>
        </g>

        <DesktopScheduleDraftConnectionLayer
          :path="draftConnectionPath"
          :connection-creation-state="connectionCreationState"
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
            :opacity="getConnectionOpacity(connection)"
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
          :aria-label="`마일스톤: ${getMilestoneTitleText(milestone)}`"
          :data-milestone-id="milestone.id"
          :title="getMilestoneTitleText(milestone)"
          role="button"
          tabindex="0"
          :style="{ left: `${milestone.left}px`, top: '0px', width: `${milestone.width}px`, height: `${chartSurfaceHeight}px` }"
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
          :aria-label="`마일스톤: ${getMilestoneTitleText(milestone)}`"
          :data-milestone-id="milestone.id"
          :title="getMilestoneTitleText(milestone)"
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
            :data-placeholder="DESKTOP_SCHEDULE_MILESTONE_LABEL_HINT_TEXT"
            spellcheck="false"
            @pointerdown.stop
            @click.stop
            @dblclick.stop
            @input="handleMilestoneRenameEditableInput"
            @blur="handleMilestoneRenameEditableBlur(milestone.id)"
            @keydown="handleRenameEditableKeyDown"
            @keydown.enter="handleMilestoneRenameEditableEnter"
            @keydown.escape.prevent="handleMilestoneRenameEditableEscape"
            @pointerenter="handleMilestonePointerEnter(milestone.id)"
            @pointerleave="handleMilestonePointerLeave(milestone.id, $event)"
            @contextmenu.prevent.stop="handleMilestoneContextMenu(milestone.id, $event)"
          />

          <span
            v-else
            class="schedule-chart-body__milestone-deadline-label"
            :class="{
              'schedule-chart-body__milestone-deadline-label--hint': isMilestoneLabelHint(milestone),
            }"
            @pointerdown.stop="handleMilestonePointerDown(milestone, $event)"
            @pointerenter="handleMilestonePointerEnter(milestone.id)"
            @pointerleave="handleMilestonePointerLeave(milestone.id, $event)"
            @contextmenu.prevent.stop="handleMilestoneContextMenu(milestone.id, $event)"
          >
            {{ getMilestoneTitleText(milestone) }}
          </span>
        </div>
      </template>

      <div
        v-for="milestone in scheduleVersionReviewVisual?.baselineMilestoneOverlays ?? []"
        :key="milestone.id"
        class="schedule-chart-body__review-milestone"
        :style="{
          left: `${milestone.left}px`,
          top: '0px',
          width: `${milestone.width}px`,
          height: `${chartSurfaceHeight}px`,
        }"
        :title="milestone.label"
      >
        <span
          class="schedule-chart-body__review-milestone-label"
          :style="{
            top: `${milestone.top}px`,
            width: `${milestone.labelWidth}px`,
            height: `${milestone.height}px`,
          }"
        >
          {{ milestone.label }}
        </span>
      </div>

      <div
        v-for="bar in shellLayout.bars"
        :key="bar.id"
        class="schedule-chart-body__bar"
        :class="[
          getBarClassList(bar),
          {
            'schedule-chart-body__bar--execution-progress':
              executionProgressCompareVisible && bar.kind === 'item',
          },
        ]"
        :style="getBarInlineStyle(bar)"
        @pointerdown="handleBarPointerDownWithExecutionProgress(bar, $event)"
        @pointerenter="handleBarPointerEnter(bar)"
        @pointerleave="handleBarPointerLeaveWithExecutionProgress(bar)"
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
          :data-placeholder="getItemNameHintText(bar)"
          spellcheck="false"
          @pointerdown.stop
          @click.stop
          @dblclick.stop
          @input="handleRenameEditableInput"
          @blur="handleRenameEditableBlur(bar.itemId)"
          @keydown="handleRenameEditableKeyDown"
          @keydown.enter="handleRenameEditableEnter"
          @keydown.escape.prevent="handleRenameEditableEscape"
        />

        <span
          v-else
          class="schedule-chart-body__item-title"
          :class="{
            'schedule-chart-body__item-title--hint': isItemNameHint(bar),
          }"
        >
          {{ getItemTitleText(bar) }}
        </span>

        <div
          v-if="bar.kind === 'item'"
          class="schedule-chart-body__execution-progress-overlay"
          :class="`schedule-chart-body__execution-progress-overlay--tone-${getExecutionProgressTone(bar)}`"
          aria-hidden="true"
        >
          <span
            class="schedule-chart-body__execution-progress-hit-area"
            :style="{
              left: `${-timeline.dayWidth * 3}px`,
              width: `${bar.width + timeline.dayWidth * 6}px`,
            }"
          />
          <span
            v-for="segment in getExecutionProgressPlanSegments(bar)"
            :key="segment.key"
            class="schedule-chart-body__execution-progress-day"
            :class="{
              'schedule-chart-body__execution-progress-day--done': segment.done,
              'schedule-chart-body__execution-progress-day--preview': segment.preview,
              'schedule-chart-body__execution-progress-day--start': segment.touchesStart,
              'schedule-chart-body__execution-progress-day--end': segment.touchesEnd,
            }"
            :style="{
              left: `${segment.left}px`,
              width: `${segment.width}px`,
            }"
          />
          <span
            v-for="segment in getExecutionProgressUnderflowSegments(bar)"
            :key="segment.key"
            class="schedule-chart-body__execution-progress-overflow-hatch schedule-chart-body__execution-progress-overflow-hatch--underflow"
            :class="{
              'schedule-chart-body__execution-progress-overflow-hatch--preview': segment.preview,
            }"
            :style="{
              left: `${segment.left}px`,
              width: `${segment.width}px`,
            }"
          />
          <span
            v-if="getExecutionProgressUnderflowOutline(bar)"
            class="schedule-chart-body__execution-progress-overflow-outline schedule-chart-body__execution-progress-overflow-outline--underflow"
            :style="{
              left: `${getExecutionProgressUnderflowOutline(bar)!.left}px`,
              width: `${getExecutionProgressUnderflowOutline(bar)!.width}px`,
            }"
          />
          <span
            v-for="segment in getExecutionProgressOverflowSegments(bar)"
            :key="segment.key"
            class="schedule-chart-body__execution-progress-overflow-hatch"
            :class="{
              'schedule-chart-body__execution-progress-overflow-hatch--preview': segment.preview,
            }"
            :style="{
              left: `${segment.left}px`,
              width: `${segment.width}px`,
            }"
          />
          <span
            v-if="getExecutionProgressOverflowOutline(bar)"
            class="schedule-chart-body__execution-progress-overflow-outline"
            :style="{
              left: `${getExecutionProgressOverflowOutline(bar)!.left}px`,
              width: `${getExecutionProgressOverflowOutline(bar)!.width}px`,
            }"
          />
        </div>

        <button
          v-if="!readOnly && !connectionCreationState && (bar.kind === 'item' || bar.kind === 'summary')"
          type="button"
          class="schedule-chart-body__resize-handle schedule-chart-body__resize-handle--left"
          :class="getResizeHandleClass(bar, 'left')"
          @pointerdown.stop="handleResizePointerDown(bar, 'left', $event)"
        />
        <button
          v-if="!readOnly && !connectionCreationState && (bar.kind === 'item' || bar.kind === 'summary')"
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

      <template v-if="isAiVerificationModeActive">
        <div
          v-for="bubble in aiVerificationBubbles"
          :key="`ai-bubble-${bubble.itemId}`"
          class="schedule-chart-body__ai-bubble"
          :style="{
            left: `${bubble.left}px`,
            top: `${bubble.top}px`,
            maxWidth: `${bubble.maxWidth}px`,
          }"
          role="note"
          aria-label="AI 검증 위반 내용"
        >
          <div class="schedule-chart-body__ai-bubble-arrow" aria-hidden="true" />
          <div class="schedule-chart-body__ai-bubble-body">{{ bubble.detail }}</div>
        </div>
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

import { mixHexWithWhite, toAlphaColor } from "@/features/desktop-schedule/ui/components/desktop-schedule-color.utils";
import DesktopScheduleDraftConnectionLayer from "@/features/desktop-schedule/ui/components/DesktopScheduleDraftConnectionLayer.vue";
import type {
  DesktopScheduleBarLayout,
  DesktopScheduleConnectionLayout,
  DesktopScheduleShellLayout,
  DesktopScheduleTimelineLayout,
  DesktopScheduleVersionReviewState,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { DESKTOP_SCHEDULE_MILESTONE_LABEL_HINT_TEXT } from "@/features/desktop-schedule/services/desktop-schedule.service";

type MarqueeState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type PanState = {
  axis: "both" | "horizontal";
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

type DraftConnectionPoint = {
  x: number;
  y: number;
};

type HoveredCellState = {
  rowId: string | null;
  date: string | null;
};

type GridCellSelectionPoint = {
  rowId: string;
  date: string;
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
  readOnly: boolean;
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
  scheduleVersionReview: DesktopScheduleVersionReviewState;
  executionProgressCompareVisible: boolean;
  executionProgressCompareLeaving: boolean;
  isAiVerificationModeActive: boolean;
  aiVerificationFlaggedItemIds: string[];
  aiVerificationViolationDetailByItemId?: Record<string, string>;
  bottomSpacerHeight: number;
  zoomScale: number;
}>();

const emit = defineEmits<{
  "scroll-change": [position: { top: number; left: number }];
  "clear-selection": [];
  "toggle-row-collapse": [rowId: string];
  "select-bars": [payload: { itemIds: string[]; rowIds: string[]; milestoneIds?: string[] }];
  "select-row": [rowId: string];
  "delete-selection": [];
  "readonly-edit-attempt": [];
  "item-context-menu": [payload: { itemId: string; x: number; y: number }];
  "work-connection-context-menu": [payload: { workConnectionId: string; x: number; y: number }];
  "critical-path-context-menu": [payload: { criticalPathId: string; x: number; y: number }];
  "milestone-context-menu": [payload: { milestoneId: string; x: number; y: number }];
  "row-context-menu": [payload: { rowId: string; x: number; y: number }];
  "canvas-context-menu": [payload: { x: number; y: number; rowId: string | null; date: string | null }];
  "cancel-connection-create": [];
  "complete-connection-create": [targetItemId: string];
  "toggle-ai-verification-flag": [itemId: string];
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
  "move-draft": [payload: { deltaDays: number; deltaLanes: number }];
  "move-end": [];
  "resize-start": [payload: { kind: "item"; itemId: string; edge: "left" | "right" } | { kind: "summary"; rowId: string; edge: "left" | "right" }];
  "resize-draft": [payload: { deltaDays: number }];
  "resize-end": [];
  "hover-cell": [payload: HoveredCellState];
  "cell-selection-change": [payload: GridCellSelectionPoint | null];
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
const draftConnectionPoint = ref<DraftConnectionPoint | null>(null);
const hoveredCell = ref<HoveredCellState>({ rowId: null, date: null });
const cellSelectionAnchor = ref<GridCellSelectionPoint | null>(null);
const cellSelectionFocus = ref<GridCellSelectionPoint | null>(null);
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
const ITEM_NAME_HINT_FALLBACK_TEXT = "작업명";
const SCROLL_SYNC_EPSILON = 0.01;
const REVIEW_DELETED_ROW_ID_PREFIX = "review-deleted-row:";

const selectedItemIdSet = computed(() => new Set(props.selectedItemIds));
const selectedRowIdSet = computed(() => new Set(props.selectedRowIds));
const selectedWorkConnectionIdSet = computed(() => new Set(props.selectedWorkConnectionIds));
const selectedMilestoneIdSet = computed(() => new Set(props.selectedMilestoneIds));
const selectedCriticalPathIdSet = computed(() => new Set(props.selectedCriticalPathIds ?? []));
const aiVerificationFlaggedItemIdSet = computed(
  () => new Set(props.aiVerificationFlaggedItemIds),
);
const aiVerificationBubbles = computed(() => {
  if (!props.isAiVerificationModeActive) return [];
  const detailByItemId = props.aiVerificationViolationDetailByItemId ?? {};
  return props.shellLayout.bars
    .filter(
      (bar) =>
        bar.kind === "item" &&
        aiVerificationFlaggedItemIdSet.value.has(bar.itemId) &&
        detailByItemId[bar.itemId],
    )
    .map((bar) => ({
      itemId: bar.itemId,
      detail: detailByItemId[bar.itemId]!,
      left: bar.left + bar.width / 2,
      top: bar.top + bar.height + 6,
      maxWidth: Math.max(220, Math.min(360, bar.width + 160)),
    }));
});
const chartSurfaceHeight = computed(() =>
  props.shellLayout.chartHeight + Math.max(0, props.bottomSpacerHeight),
);
const bottomSpacerStyle = computed(() => {
  const height = Math.max(0, props.bottomSpacerHeight);

  if (height <= 0) {
    return null;
  }

  return {
    top: `${props.shellLayout.chartHeight}px`,
    width: `${props.timeline.chartWidth}px`,
    height: `${height}px`,
  };
});
const scheduleVersionReviewVisual = computed(() =>
  props.scheduleVersionReview.open && props.scheduleVersionReview.status === "success"
    ? props.scheduleVersionReview.summary?.visual ?? null
    : null,
);

function isReviewDeletedRow(row: DesktopScheduleShellLayout["rows"][number]) {
  return row.id.startsWith(REVIEW_DELETED_ROW_ID_PREFIX);
}

const timelineDayByDate = computed(
  () => new Map(props.timeline.days.map((day) => [day.date, day] as const)),
);
const holidayTimelineDays = computed(() => props.timeline.days.filter((day) => day.isHoliday));
const holidayLabelDays = computed(() =>
  holidayTimelineDays.value.filter((day) => day.holidayName),
);
const bottomSpacerHolidayDays = computed(() =>
  props.bottomSpacerHeight > 0 ? holidayTimelineDays.value : [],
);
const divisionHolidayCells = computed(() => {
  const divisionRows = props.shellLayout.rows.filter((row) => row.kind === "division");

  return divisionRows.flatMap((row) =>
    holidayTimelineDays.value.map((day) => ({
      key: `${row.id}:${day.key}`,
      left: day.left,
      top: row.top,
      width: day.width,
      height: row.height,
    })),
  );
});
const workTypeDividerRows = computed(() =>
  props.shellLayout.rows.filter((row, index, rows) => {
    if (row.kind !== "child-process") {
      return false;
    }

    const nextRow = rows[index + 1];

    if (!nextRow || nextRow.kind !== "child-process") {
      return false;
    }

    const isSameDivision =
      (row.divisionId ?? null) === (nextRow.divisionId ?? null) &&
      (row.division ?? "") === (nextRow.division ?? "");
    const isSameWorkType =
      (row.workTypeId ?? null) === (nextRow.workTypeId ?? null) &&
      (row.workType ?? "") === (nextRow.workType ?? "");

    return isSameDivision && !isSameWorkType;
  }),
);
const shellRowById = computed(
  () => new Map(props.shellLayout.rows.map((row) => [row.id, row] as const)),
);
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
const cellSelectionRangeStyle = computed(() => {
  if (!cellSelectionAnchor.value || !cellSelectionFocus.value) {
    return null;
  }

  const rangeBounds = getCellRangeBounds(cellSelectionAnchor.value, cellSelectionFocus.value);
  if (!rangeBounds) {
    return null;
  }

  return {
    left: `${rangeBounds.left}px`,
    top: `${rangeBounds.top}px`,
    width: `${rangeBounds.right - rangeBounds.left}px`,
    height: `${rangeBounds.bottom - rangeBounds.top}px`,
  };
});
const cellSelectionRangeKey = computed(() => {
  if (!cellSelectionAnchor.value || !cellSelectionFocus.value) {
    return "cell-selection-empty";
  }

  return [
    cellSelectionAnchor.value.rowId,
    cellSelectionAnchor.value.date,
    cellSelectionFocus.value.rowId,
    cellSelectionFocus.value.date,
  ].join(":");
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
const normalizedZoomScale = computed(() => Math.min(Math.max(props.zoomScale, 0.5), 1.46));
const connectionLabelFontSize = computed(() => Math.round(14 * normalizedZoomScale.value));
const connectionLabelStrokeWidth = computed(() => Math.max(2.25, 3.5 * normalizedZoomScale.value));

function buildRoundedOrthogonalDraftPath(
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

const draftConnectionPath = computed(() => {
  if (!connectionSourceBar.value || !draftConnectionPoint.value) {
    return null;
  }

  const sourceX = connectionSourceBar.value.left + connectionSourceBar.value.width;
  const sourceY = connectionSourceBar.value.top + connectionSourceBar.value.height / 2;
  const targetX = draftConnectionPoint.value.x;
  const targetY = draftConnectionPoint.value.y;

  if (sourceY === targetY) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  if (targetX >= sourceX + 24) {
    const bendX = sourceX + Math.max((targetX - sourceX) / 2, 28);
    return buildRoundedOrthogonalDraftPath([
      { x: sourceX, y: sourceY },
      { x: bendX, y: sourceY },
      { x: bendX, y: targetY },
      { x: targetX, y: targetY },
    ]);
  }

  const bendX = Math.max(sourceX, targetX) + 36;
  return buildRoundedOrthogonalDraftPath([
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
    !isSelectableGridRow(hoveredShellRow.value)
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

function syncContainerScrollFromProps() {
  const element = containerRef.value;
  if (!element) {
    return;
  }

  const topDiff = Math.abs(element.scrollTop - props.scrollTop);
  const leftDiff = Math.abs(element.scrollLeft - props.scrollLeft);
  if (topDiff < SCROLL_SYNC_EPSILON && leftDiff < SCROLL_SYNC_EPSILON) {
    return;
  }

  syncingFromProp = true;
  element.scrollTop = props.scrollTop;
  element.scrollLeft = props.scrollLeft;
  requestAnimationFrame(() => {
    syncingFromProp = false;
  });
}

function diffActualDateToDayIndex(bar: DesktopScheduleBarLayout, date: string) {
  const [barYear, barMonth, barDay] = bar.startDate.split("-").map(Number);
  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(barYear ?? 1970, (barMonth ?? 1) - 1, barDay ?? 1);
  const target = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function getExecutionProgressCompletedDayIndexSet(bar: DesktopScheduleBarLayout) {
  const indexes = new Set<number>();
  for (const date of bar.actualDates ?? []) {
    indexes.add(diffActualDateToDayIndex(bar, date));
  }
  return indexes;
}

function getExecutionProgressTone(bar: DesktopScheduleBarLayout): "green" | "yellow" | "red" {
  const completedDayIndexes = getExecutionProgressCompletedDayIndexSet(bar);
  if (completedDayIndexes.size === 0) {
    return "green";
  }

  const plannedDayCount = Math.max(Math.ceil(bar.width / props.timeline.dayWidth), 1);

  let minDayIndex = Number.POSITIVE_INFINITY;
  let maxDayIndex = Number.NEGATIVE_INFINITY;
  for (const dayIndex of completedDayIndexes) {
    if (dayIndex < minDayIndex) minDayIndex = dayIndex;
    if (dayIndex > maxDayIndex) maxDayIndex = dayIndex;
  }

  const span = maxDayIndex - minDayIndex + 1;
  if (span > plannedDayCount) {
    return "red";
  }
  if (minDayIndex >= 3) {
    return "red";
  }
  if (minDayIndex > 0) {
    return "yellow";
  }
  return "green";
}

function getExecutionProgressPlanSegments(bar: DesktopScheduleBarLayout) {
  const completedDayIndexes = getExecutionProgressCompletedDayIndexSet(bar);

  return props.timeline.days
    .map((day) => {
      const segmentLeft = Math.max(day.left, bar.left);
      const segmentRight = Math.min(day.left + day.width, bar.left + bar.width);

      if (segmentRight <= segmentLeft) {
        return null;
      }

      const segmentOffsetLeft = segmentLeft - bar.left;
      const dayIndex = Math.max(Math.round(segmentOffsetLeft / props.timeline.dayWidth), 0);

      return {
        key: `${bar.itemId}:${day.key}`,
        left: segmentOffsetLeft,
        width: segmentRight - segmentLeft,
        done: completedDayIndexes.has(dayIndex),
        preview: false,
        touchesStart: segmentOffsetLeft <= 0.5,
        touchesEnd: segmentRight >= bar.left + bar.width - 0.5,
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => segment !== null);
}

function getExecutionProgressUnderflowSegments(bar: DesktopScheduleBarLayout) {
  const completedDayIndexes = getExecutionProgressCompletedDayIndexSet(bar);
  const underflowDayIndexes = Array.from(completedDayIndexes)
    .filter((dayIndex) => dayIndex < 0)
    .sort((first, second) => first - second);
  const segments: Array<{ start: number; end: number }> = [];

  underflowDayIndexes.forEach((dayIndex) => {
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && dayIndex === lastSegment.end + 1) {
      lastSegment.end = dayIndex;
      return;
    }

    segments.push({ start: dayIndex, end: dayIndex });
  });

  return segments.map((segment) => ({
    key: `${bar.itemId}:underflow:${segment.start}-${segment.end}`,
    left: segment.start * props.timeline.dayWidth,
    width: (segment.end - segment.start + 1) * props.timeline.dayWidth,
    preview: false,
  }));
}

function getExecutionProgressUnderflowOutline(bar: DesktopScheduleBarLayout) {
  const underflowSegments = getExecutionProgressUnderflowSegments(bar);

  if (underflowSegments.length === 0) {
    return null;
  }

  const left = Math.min(...underflowSegments.map((segment) => segment.left));

  return {
    left,
    width: -left,
  };
}

function getExecutionProgressOverflowSegments(bar: DesktopScheduleBarLayout) {
  const completedDayIndexes = getExecutionProgressCompletedDayIndexSet(bar);
  const plannedDayCount = Math.ceil(bar.width / props.timeline.dayWidth);
  const overflowDayIndexes = Array.from(completedDayIndexes)
    .filter((dayIndex) => dayIndex >= plannedDayCount)
    .sort((first, second) => first - second);
  const segments: Array<{ start: number; end: number }> = [];

  overflowDayIndexes.forEach((dayIndex) => {
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && dayIndex === lastSegment.end + 1) {
      lastSegment.end = dayIndex;
      return;
    }

    segments.push({ start: dayIndex, end: dayIndex });
  });

  return segments.map((segment) => ({
    key: `${bar.itemId}:overflow:${segment.start}-${segment.end}`,
    left: segment.start * props.timeline.dayWidth,
    width: (segment.end - segment.start + 1) * props.timeline.dayWidth,
    preview: false,
  }));
}

function getExecutionProgressOverflowOutline(bar: DesktopScheduleBarLayout) {
  const overflowSegments = getExecutionProgressOverflowSegments(bar);

  if (overflowSegments.length === 0) {
    return null;
  }

  const right = Math.max(...overflowSegments.map((segment) => segment.left + segment.width));

  return {
    left: bar.width,
    width: right - bar.width,
  };
}

function handleBarPointerDownWithExecutionProgress(
  bar: DesktopScheduleBarLayout,
  event: PointerEvent,
) {
  if (
    props.isAiVerificationModeActive &&
    bar.kind === "item" &&
    event.button === 0
  ) {
    event.preventDefault();
    event.stopPropagation();
    emit("toggle-ai-verification-flag", bar.itemId);
    return;
  }

  handleBarPointerDown(bar, event);
}

function handleBarPointerLeaveWithExecutionProgress(bar: DesktopScheduleBarLayout) {
  handleBarPointerLeave(bar);
}

watch(() => [props.scrollTop, props.scrollLeft] as const, syncContainerScrollFromProps);

watch(
  () => props.connectionCreationState,
  (nextConnectionCreationState) => {
    if (!nextConnectionCreationState || !connectionSourceBar.value) {
      draftConnectionPoint.value = null;
      hoveredConnectionTargetItemId.value = null;
      return;
    }

    draftConnectionPoint.value = {
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

function getTimelineDayAtContentX(contentX: number) {
  const dayIndex = Math.floor(contentX / props.timeline.dayWidth);
  return props.timeline.days[dayIndex] ?? null;
}

function getRowIdAtContentY(contentY: number) {
  const row = props.shellLayout.rows.find(
    (candidate) => contentY >= candidate.top && contentY < candidate.top + candidate.height,
  );
  return row?.id ?? null;
}

function getShellRowAtContentY(contentY: number) {
  return (
    props.shellLayout.rows.find(
      (candidate) => contentY >= candidate.top && contentY < candidate.top + candidate.height,
    ) ?? null
  );
}

function isSelectableGridRow(row: DesktopScheduleShellLayout["rows"][number]) {
  return (
    row.kind === "child-process" ||
    row.kind === "parent-process" ||
    row.kind === "milestone"
  );
}

function getSelectableCellAtContentPoint(point: { x: number; y: number }) {
  const day = getTimelineDayAtContentX(point.x);
  const row = getShellRowAtContentY(point.y);

  if (!day || !row || !isSelectableGridRow(row)) {
    return null;
  }

  return {
    rowId: row.id,
    date: day.date,
  };
}

function getCellRangeBounds(
  anchor: GridCellSelectionPoint,
  focus: GridCellSelectionPoint,
) {
  const anchorRow = shellRowById.value.get(anchor.rowId);
  const focusRow = shellRowById.value.get(focus.rowId);
  const anchorDay = timelineDayByDate.value.get(anchor.date);
  const focusDay = timelineDayByDate.value.get(focus.date);

  if (!anchorRow || !focusRow || !anchorDay || !focusDay) {
    return null;
  }

  return {
    left: Math.min(anchorDay.left, focusDay.left),
    right: Math.max(anchorDay.left + anchorDay.width, focusDay.left + focusDay.width),
    top: Math.min(anchorRow.top, focusRow.top),
    bottom: Math.max(anchorRow.top + anchorRow.height, focusRow.top + focusRow.height),
  };
}

function doRectsIntersect(
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number },
) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

function getEntityIdsInCellRangeBounds(
  rangeBounds: { left: number; right: number; top: number; bottom: number },
) {
  const selectedItemIds = props.shellLayout.bars
    .filter((bar) => {
      if (bar.kind !== "item") {
        return false;
      }

      return doRectsIntersect(
        {
          left: bar.left,
          right: bar.left + bar.width,
          top: bar.top,
          bottom: bar.top + bar.height,
        },
        rangeBounds,
      );
    })
    .map((bar) => bar.itemId);

  const selectedMilestoneIds = props.shellLayout.milestones
    .filter((milestone) => {
      const markerBounds = {
        left: milestone.left,
        right: milestone.left + milestone.width,
        top: milestone.top,
        bottom: milestone.top + milestone.height,
      };
      const markerCenter = milestone.left + milestone.width / 2;
      const labelBounds = {
        left: markerCenter - milestone.labelWidth,
        right: markerCenter,
        top: milestone.top,
        bottom: milestone.top + milestone.height,
      };

      return (
        doRectsIntersect(markerBounds, rangeBounds) ||
        doRectsIntersect(labelBounds, rangeBounds)
      );
    })
    .map((milestone) => milestone.id);

  return {
    itemIds: selectedItemIds,
    milestoneIds: selectedMilestoneIds,
  };
}

function selectBarsInCellRange(focusCell: GridCellSelectionPoint) {
  const anchorCell = cellSelectionAnchor.value ?? focusCell;
  const rangeBounds = getCellRangeBounds(anchorCell, focusCell);

  cellSelectionAnchor.value = anchorCell;
  cellSelectionFocus.value = focusCell;
  emit("cell-selection-change", focusCell);

  if (!rangeBounds) {
    emit("select-bars", {
      itemIds: [],
      rowIds: [],
    });
    return;
  }

  const selectedEntities = getEntityIdsInCellRangeBounds(rangeBounds);

  emit("select-bars", {
    itemIds: selectedEntities.itemIds,
    rowIds: [],
    milestoneIds: selectedEntities.milestoneIds,
  });
}

function selectSingleCell(cell: GridCellSelectionPoint) {
  const rangeBounds = getCellRangeBounds(cell, cell);
  const selectedEntities = rangeBounds
    ? getEntityIdsInCellRangeBounds(rangeBounds)
    : { itemIds: [], milestoneIds: [] };

  cellSelectionAnchor.value = cell;
  cellSelectionFocus.value = cell;
  emit("cell-selection-change", cell);
  emit("select-bars", {
    itemIds: selectedEntities.itemIds,
    rowIds: [],
    milestoneIds: selectedEntities.milestoneIds,
  });
}

function clearCellSelection() {
  cellSelectionAnchor.value = null;
  cellSelectionFocus.value = null;
  emit("cell-selection-change", null);
}

function selectCellAtContentPoint(point: { x: number; y: number }) {
  const cell = getSelectableCellAtContentPoint(point);

  if (!cell) {
    clearCellSelection();
    emit("clear-selection");
    return;
  }

  selectSingleCell(cell);
}

function extendCellSelectionAtContentPoint(point: { x: number; y: number }) {
  const cell = getSelectableCellAtContentPoint(point);

  if (!cell) {
    return;
  }

  selectBarsInCellRange(cell);
}

function selectBarsInMarquee() {
  if (!marqueeState.value) {
    return;
  }

  clearCellSelection();

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

function startPanSession(event: PointerEvent, axis: PanState["axis"] = "both") {
  const element = containerRef.value;
  if (!element) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  panState.value = {
    axis,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startScrollLeft: element.scrollLeft,
    startScrollTop: element.scrollTop,
  };
}

function handlePanePointerDownCapture(event: PointerEvent) {
  if (event.button === 1) {
    startPanSession(event, "horizontal");
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

  if (event.shiftKey) {
    event.preventDefault();
    extendCellSelectionAtContentPoint(point);
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

  if (props.readOnly) {
    if (props.connectionCreationState) {
      emit("cancel-connection-create");
      emit("readonly-edit-attempt");
      return;
    }

    if (bar.kind === "item") {
      const now = Date.now();
      const previousPointerDown = lastItemPointerDown;
      const isSameBarDoublePress =
        previousPointerDown?.itemId === bar.itemId &&
        now - previousPointerDown.timestamp <= ITEM_RENAME_DOUBLE_CLICK_WINDOW_MS;

      lastItemPointerDown = {
        itemId: bar.itemId,
        timestamp: now,
      };

      if (isSameBarDoublePress) {
        lastItemPointerDown = null;
        emit("readonly-edit-attempt");
        return;
      }

      const nextItemIds = event.shiftKey
        ? selectedItemIdSet.value.has(bar.itemId)
          ? props.selectedItemIds.filter((itemId) => itemId !== bar.itemId)
          : [...props.selectedItemIds, bar.itemId]
        : [bar.itemId];

      emit("select-bars", {
        itemIds: nextItemIds,
        rowIds: [],
      });
      return;
    }

    lastItemPointerDown = null;
    emit("select-bars", {
      itemIds: [],
      rowIds: [bar.rowId],
    });
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

    const point = getContentPoint(event);
    const targetCell = point ? getSelectableCellAtContentPoint(point) : null;

    if (
      cellSelectionAnchor.value &&
      targetCell &&
      props.selectedItemIds.length === 0 &&
      props.selectedRowIds.length === 0
    ) {
      selectBarsInCellRange(targetCell);
      return;
    }

    const nextItemIds = selectedItemIdSet.value.has(bar.itemId)
      ? props.selectedItemIds.filter((itemId) => itemId !== bar.itemId)
      : [...props.selectedItemIds, bar.itemId];

    emit("select-bars", {
      itemIds: nextItemIds,
      rowIds: [],
    });
    return;
  }

  const point = getContentPoint(event);
  const targetCell = point ? getSelectableCellAtContentPoint(point) : null;
  if (targetCell) {
    cellSelectionAnchor.value = targetCell;
    cellSelectionFocus.value = targetCell;
    emit("cell-selection-change", targetCell);
  } else {
    clearCellSelection();
  }

  if (bar.kind === "item") {
    if (isItemNameHint(bar)) {
      event.preventDefault();
      lastItemPointerDown = null;
      emit("start-item-rename", bar.itemId);
      return;
    }

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

function isItemNameHint(bar: DesktopScheduleBarLayout) {
  return bar.kind === "item" && bar.name.trim().length === 0;
}

function getItemTitleText(bar: DesktopScheduleBarLayout) {
  return isItemNameHint(bar) ? getItemNameHintText(bar) : bar.name;
}

function getItemNameHintText(bar: DesktopScheduleBarLayout) {
  const row = shellRowById.value.get(bar.rowId);
  return row?.subWorkType?.trim() || row?.name.trim() || ITEM_NAME_HINT_FALLBACK_TEXT;
}

function isMilestoneLabelHint(milestone: DesktopScheduleShellLayout["milestones"][number]) {
  return milestone.label.trim().length === 0;
}

function getMilestoneTitleText(milestone: DesktopScheduleShellLayout["milestones"][number]) {
  return isMilestoneLabelHint(milestone)
    ? DESKTOP_SCHEDULE_MILESTONE_LABEL_HINT_TEXT
    : milestone.label;
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
  if (props.readOnly) {
    emit("readonly-edit-attempt");
    return;
  }

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

function notifyReadOnlyContextMenuAttempt(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  emit("readonly-edit-attempt");
}

function handlePaneContextMenu(event: MouseEvent) {
  if (props.readOnly) {
    notifyReadOnlyContextMenuAttempt(event);
    return;
  }

  const point = getContentPoint(event);
  const targetCell = point ? getSelectableCellAtContentPoint(point) : null;
  if (targetCell) {
    selectSingleCell(targetCell);
  } else {
    clearCellSelection();
  }

  emit("canvas-context-menu", {
    x: event.clientX,
    y: event.clientY,
    rowId: point ? getRowIdAtContentY(point.y) : null,
    date: point ? getDateAtContentX(point.x) : null,
  });
}

function handleRowContextMenu(row: DesktopScheduleShellLayout["rows"][number], event: MouseEvent) {
  if (isReviewDeletedRow(row)) {
    return;
  }

  if (props.readOnly) {
    notifyReadOnlyContextMenuAttempt(event);
    return;
  }

  if (row.kind === "division") {
    return;
  }

  if (row.kind === "milestone" || row.kind === "child-process") {
    const point = getContentPoint(event);
    const targetCell = point ? getSelectableCellAtContentPoint(point) : null;
    if (targetCell) {
      selectSingleCell(targetCell);
    } else {
      clearCellSelection();
    }
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
  if (isReviewDeletedRow(row)) {
    event.stopPropagation();
    return;
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

  if (!props.readOnly && isMilestoneLabelHint(milestone)) {
    event.preventDefault();
    lastMilestonePointerDown = null;
    emit("start-milestone-rename", milestone.id);
    return;
  }

  if (props.readOnly) {
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
      emit("readonly-edit-attempt");
      return;
    }

    emit("select-bars", {
      itemIds: [],
      rowIds: [],
      milestoneIds: [milestone.id],
    });
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
  if (props.readOnly) {
    notifyReadOnlyContextMenuAttempt(event);
    return;
  }

  hoveredMilestoneId.value = milestoneId;
  emit("milestone-context-menu", {
    milestoneId,
    x: event.clientX,
    y: event.clientY,
  });
}

function handleBarContextMenu(bar: DesktopScheduleBarLayout, event: MouseEvent) {
  if (props.readOnly) {
    notifyReadOnlyContextMenuAttempt(event);
    return;
  }

  if (bar.kind === "summary") {
    emit("row-context-menu", {
      rowId: bar.rowId,
      x: event.clientX,
      y: event.clientY,
    });
    return;
  }

  const point = getContentPoint(event);
  const targetCell = point ? getSelectableCellAtContentPoint(point) : null;
  if (targetCell) {
    cellSelectionAnchor.value = targetCell;
    cellSelectionFocus.value = targetCell;
    emit("cell-selection-change", targetCell);
  } else {
    clearCellSelection();
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

function isComposingKeyboardEvent(event: KeyboardEvent) {
  return event.isComposing || event.keyCode === 229;
}

function handleRenameEditableEnter(event: KeyboardEvent) {
  if (isComposingKeyboardEvent(event)) {
    return;
  }

  event.preventDefault();
  shouldCommitRenameOnBlur.value = true;
  renameEditorRef.value?.blur();
}

function handleRenameEditableEscape() {
  shouldCommitRenameOnBlur.value = false;
  renameEditorRef.value?.blur();
}

function selectEditableContents(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
}

function handleRenameEditableKeyDown(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "a") {
    return;
  }

  const editor = event.currentTarget;

  if (!(editor instanceof HTMLElement)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectEditableContents(editor);
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

function handleMilestoneRenameEditableEnter(event: KeyboardEvent) {
  if (isComposingKeyboardEvent(event)) {
    return;
  }

  event.preventDefault();
  shouldCommitMilestoneRenameOnBlur.value = true;
  milestoneRenameEditorRef.value?.blur();
}

function handleMilestoneRenameEditableEscape() {
  shouldCommitMilestoneRenameOnBlur.value = false;
  milestoneRenameEditorRef.value?.blur();
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
    "schedule-chart-body__bar--item-editing": !props.readOnly && props.editingItemId === bar.itemId,
    "schedule-chart-body__bar--holiday-off": bar.appearance === "holiday-off",
    "schedule-chart-body__bar--connection-source":
      !props.readOnly &&
      !!props.connectionCreationState &&
      bar.itemId === props.connectionCreationState.sourceItemId,
    "schedule-chart-body__bar--connection-target":
      !props.readOnly &&
      !!props.connectionCreationState &&
      hoveredConnectionTargetItemId.value === bar.itemId,
    "schedule-chart-body__bar--ai-flagged":
      props.isAiVerificationModeActive &&
      aiVerificationFlaggedItemIdSet.value.has(bar.itemId),
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
  if (day.isHoliday) {
    return "schedule-chart-body__day-column--holiday";
  }

  if (day.isToday) {
    return "schedule-chart-body__day-column--today";
  }

  return "";
}

function getConnectionStroke(connection: DesktopScheduleConnectionLayout) {
  if (
    props.readOnly &&
    connection.kind === "work-connection" &&
    !isWorkConnectionHighlighted(connection.id)
  ) {
    return "#9ca3af";
  }

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
  if (
    props.readOnly &&
    connection.kind === "work-connection" &&
    !isWorkConnectionHighlighted(connection.id)
  ) {
    return "#6b7280";
  }

  return connection.colorHex ?? "#64748b";
}

function getConnectionOpacity(connection: DesktopScheduleConnectionLayout) {
  if (connection.kind === "critical-path") {
    return isCriticalPathHighlighted(connection.id, connection.pathId) ? 1 : 0.95;
  }

  if (!props.readOnly) {
    return isWorkConnectionHighlighted(connection.id) ? 1 : 0.9;
  }

  return isWorkConnectionHighlighted(connection.id) ? 0.92 : 0.46;
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
    return props.readOnly ? 2.4 : 3;
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

  return props.readOnly && kind === "work-connection" ? 1.55 : getConnectionStrokeWidth(kind);
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

  if (props.readOnly) {
    emit("readonly-edit-attempt");
    return;
  }

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

  if (props.readOnly) {
    emit("readonly-edit-attempt");
    return;
  }

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
      draftConnectionPoint.value = point;
    }
  }

  if (panState.value) {
    const element = containerRef.value;
    if (!element) {
      return;
    }

    element.scrollLeft =
      panState.value.startScrollLeft - (event.clientX - panState.value.startClientX);
    if (panState.value.axis === "both") {
      element.scrollTop =
        panState.value.startScrollTop - (event.clientY - panState.value.startClientY);
    }
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

    emit("move-draft", {
      deltaDays: Math.round(deltaX / props.timeline.dayWidth),
      deltaLanes: Math.round(deltaY / moveState.value.laneStep),
    });
    return;
  }

  if (resizeState.value) {
    emit("resize-draft", {
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
      selectCellAtContentPoint({
        x: marqueeState.value.currentX,
        y: marqueeState.value.currentY,
      });
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
      if (props.readOnly) {
        emit("readonly-edit-attempt");
        return;
      }
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

  void nextTick(() => {
    syncContainerScrollFromProps();
  });
});

onUnmounted(() => {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
});
</script>

<style scoped src="./styles/DesktopScheduleChartBody.css"></style>
