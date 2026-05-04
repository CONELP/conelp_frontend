<script setup lang="ts">
import type { DesktopScheduleTimelineLayout } from "@/features/desktop-schedule/model/desktop-schedule.types";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleTimelineHeader.css";

const props = defineProps<{
  timeline: DesktopScheduleTimelineLayout;
  scrollLeft: number;
  hoveredDate?: string | null;
}>();

function getDayCellClass(day: DesktopScheduleTimelineLayout["days"][number]) {
  return {
    "schedule-timeline-header__day--weekend": day.isWeekend,
    "schedule-timeline-header__day--today": !day.isWeekend && day.isToday,
    "schedule-timeline-header__day--hovered": day.date === props.hoveredDate,
  };
}
</script>

<template>
  <div class="schedule-timeline-header">
    <div
      class="schedule-timeline-header__canvas"
      :style="{
        width: `${timeline.chartWidth}px`,
        transform: `translateX(-${scrollLeft}px)`,
      }"
    >
      <div
        v-for="group in timeline.monthGroups"
        :key="group.key"
        class="schedule-timeline-header__month"
        :style="{ left: `${group.left}px`, width: `${group.width}px` }"
      >
        {{ group.label }}
      </div>

      <div
        v-for="group in timeline.weekGroups"
        :key="group.key"
        class="schedule-timeline-header__week"
        :style="{ left: `${group.left}px`, width: `${group.width}px` }"
      >
        {{ group.label }}
      </div>

      <div
        v-for="day in timeline.days"
        :key="day.key"
        class="schedule-timeline-header__day"
        :class="getDayCellClass(day)"
        :style="{ left: `${day.left}px`, width: `${day.width}px` }"
      >
        <span>{{ day.dayOfMonth }}</span>
        <small>{{ day.dayName }}</small>
      </div>

      <svg
        class="schedule-timeline-header__day-grid"
        :width="timeline.chartWidth"
        height="100%"
        :viewBox="`0 0 ${timeline.chartWidth} 100`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          v-for="day in timeline.days"
          :key="`day-grid-${day.key}`"
          :x1="day.left + day.width"
          y1="0"
          :x2="day.left + day.width"
          y2="100"
        />
      </svg>

      <div class="schedule-timeline-header__date-bottom-line" aria-hidden="true" />
    </div>
  </div>
</template>
