<template>
  <div
    class="schedule-chart"
    :style="{
      width: `${timeline.chartWidth}px`,
      height: `${shellLayout.chartHeight}px`,
    }"
  >
    <div
      v-for="day in timeline.days"
      :key="day.key"
      class="schedule-chart__day"
      :class="{
        'schedule-chart__day--today': day.isToday,
        'schedule-chart__day--holiday': day.isHoliday,
      }"
      :style="{
        left: `${day.left}px`,
        width: `${day.width}px`,
      }"
    />

    <div
      v-for="row in shellLayout.rows"
      :key="row.id"
      class="schedule-chart__row"
      :class="{
        'schedule-chart__row--parent': row.kind === 'parent-process',
        'schedule-chart__row--milestone': row.kind === 'milestone',
      }"
      :style="{
        top: `${row.top}px`,
        height: `${row.height}px`,
      }"
    />

    <svg
      class="schedule-chart__connections"
      :width="timeline.chartWidth"
      :height="shellLayout.chartHeight"
      aria-hidden="true"
    >
      <g
        v-for="connection in shellLayout.connections"
        :key="connection.id"
        class="schedule-chart__connection"
      >
        <path
          class="schedule-chart__connection-path"
          :class="`schedule-chart__connection-path--${connection.kind}`"
          :style="{ '--connection-color': connection.colorHex ?? '#878787' }"
          :d="connection.path"
        />
        <text
          v-if="connection.label"
          class="schedule-chart__connection-label"
          :x="connection.labelX"
          :y="connection.labelY"
        >
          {{ connection.label }}
        </text>
      </g>
    </svg>

    <div
      v-for="milestone in shellLayout.milestones"
      :key="milestone.id"
      class="schedule-chart__milestone"
      :style="{
        left: `${milestone.left}px`,
        top: `${milestone.top}px`,
        width: `${milestone.width}px`,
        height: `${milestone.height}px`,
      }"
    >
      <span class="schedule-chart__milestone-marker" aria-hidden="true" />
      <span class="schedule-chart__milestone-label">{{ milestone.label }}</span>
    </div>

    <div
      v-for="bar in shellLayout.bars"
      :key="bar.id"
      class="schedule-chart__bar"
      :class="{
        'schedule-chart__bar--summary': bar.kind === 'summary',
        'schedule-chart__bar--item': bar.kind === 'item',
        'schedule-chart__bar--holiday-off': bar.appearance === 'holiday-off' && bar.kind === 'item',
      }"
      :style="getBarStyle(bar)"
      :title="`${bar.name} · ${bar.startDate} ~ ${bar.endDate}`"
    >
      <span class="schedule-chart__bar-label">{{ bar.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  DesktopScheduleBarLayout,
  DesktopScheduleShellLayout,
  DesktopScheduleTimelineLayout,
} from "@/features/desktop-schedule/model/desktop-schedule.types";

defineProps<{
  timeline: DesktopScheduleTimelineLayout;
  shellLayout: DesktopScheduleShellLayout;
}>();

function getBarStyle(bar: DesktopScheduleBarLayout) {
  const baseColor = bar.kind === "summary" ? "#111111" : bar.colorHex ?? "#9ca3af";

  return {
    left: `${bar.left}px`,
    top: `${bar.top}px`,
    width: `${bar.width}px`,
    height: `${bar.height}px`,
    "--bar-color": baseColor,
  };
}
</script>

<style scoped src="./styles/DesktopScheduleChart.css"></style>
