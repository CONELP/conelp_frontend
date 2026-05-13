<template>
  <main class="dashboard-page">
    <DesktopAppHeader />

    <div class="dashboard-shell dashboard-body">
      <section class="dashboard-row dashboard-row--status">
        <div class="dashboard-status-grid">
          <article class="dashboard-panel dashboard-panel--status-chart">
            <div class="dashboard-panel__topline dashboard-panel__topline--progress">
              <div class="dashboard-panel__heading-group">
                <h2 class="dashboard-panel__title">
                  {{ activeComparisonChart.title }}
                </h2>
              </div>

              <div class="dashboard-chart-tabs">
                <button
                  v-for="tab in progressChartTabs"
                  :key="tab.id"
                  type="button"
                  class="dashboard-chart-tabs__button"
                  :class="{ 'dashboard-chart-tabs__button--active': activeProgressChartId === tab.id }"
                  :aria-pressed="activeProgressChartId === tab.id"
                  @click="selectProgressChart(tab.id)"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>

            <div class="dashboard-line-chart dashboard-line-chart--expanded">
              <ProgressComparisonChart :chart="activeComparisonChart" />
            </div>

            <div class="dashboard-line-chart__summary dashboard-line-chart__summary--expanded">
              <p class="dashboard-line-chart__summary-item dashboard-line-chart__summary-item--planned">
                <span>계획 공정률</span>
                <strong>{{ formatPercent(getLatestValue(activeComparisonChart.plannedSeries)) }}</strong>
              </p>
              <p class="dashboard-line-chart__summary-item dashboard-line-chart__summary-item--actual">
                <span>실제 공정률</span>
                <strong
                  class="dashboard-line-chart__delta"
                  :class="getDeltaToneClass(activeComparisonChart)"
                >
                  {{ formatPercent(getLatestValue(activeComparisonChart.actualSeries)) }}
                  <em>({{ formatDelta(getDeltaValue(activeComparisonChart)) }})</em>
                </strong>
              </p>
            </div>
          </article>

          <article class="dashboard-panel dashboard-panel--today-work">
            <h2 class="dashboard-panel__title">오늘 작업내용</h2>

            <div class="dashboard-today-work-sheet">
              <section
                v-for="section in todayWorkSections"
                :key="section.title"
                class="dashboard-today-work-section"
              >
                <h3 class="dashboard-today-work-section__title">{{ section.title }}</h3>

                <ul class="dashboard-today-work-section__list">
                  <li
                    v-for="task in section.tasks"
                    :key="`${section.title}-${task}`"
                    class="dashboard-today-work-section__item"
                  >
                    {{ task }}
                  </li>
                </ul>
              </section>
            </div>
          </article>
        </div>
      </section>

      <section class="dashboard-row dashboard-row--issues">
        <div class="dashboard-issues-grid">
          <article class="dashboard-panel">
            <h3 class="dashboard-panel__title">{{ dashboard.calendarMonthLabel }}</h3>

            <div class="dashboard-calendar">
              <div class="dashboard-calendar__weekdays">
                <span
                  v-for="weekday in dashboard.calendarWeekdays"
                  :key="weekday"
                >
                  {{ weekday }}
                </span>
              </div>

              <section
                v-for="week in dashboard.calendarWeeks"
                :key="week.label"
                class="dashboard-calendar__week-row"
              >
                <div class="dashboard-calendar__grid">
                  <article
                    v-for="(day, dayIndex) in week.days"
                    :key="`${week.label}-${dayIndex}-${day.day ?? 'empty'}`"
                    class="dashboard-calendar__cell"
                    :class="`dashboard-calendar__cell--${day.tone}`"
                  >
                    <span>{{ day.day ?? "" }}</span>
                    <small v-if="day.agenda">{{ day.agenda }}</small>
                  </article>
                </div>
              </section>
            </div>

            <div class="dashboard-calendar__legend">
              <span><i class="dashboard-calendar__dot dashboard-calendar__dot--today" /> 오늘</span>
              <span><i class="dashboard-calendar__dot dashboard-calendar__dot--issue" /> 이슈</span>
              <span><i class="dashboard-calendar__dot dashboard-calendar__dot--milestone" /> 마일스톤</span>
            </div>
          </article>

          <article class="dashboard-panel dashboard-panel--todo">
            <h3 class="dashboard-panel__title">TODO</h3>

            <div class="dashboard-todo-list">
              <button
                v-for="item in dashboard.todoItems"
                :key="item.title"
                class="dashboard-todo"
                :class="{ 'dashboard-todo--completed': isTodoCompleted(item.title) }"
                type="button"
                @click="toggleTodo(item.title)"
              >
                <span class="dashboard-todo__checkbox" aria-hidden="true" />

                <span class="dashboard-todo__title-row">
                  <span class="dashboard-todo__title">{{ item.title }}</span>
                  <span
                    v-if="!isTodoCompleted(item.title) && item.priority === 'high'"
                    class="dashboard-todo__priority-text"
                  >
                    긴급
                  </span>
                </span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="dashboard-row dashboard-row--today">
        <div class="dashboard-today-grid">
          <article class="dashboard-panel">
            <div class="dashboard-panel__topline dashboard-panel__topline--today">
              <h3 class="dashboard-panel__title">출력 현황</h3>

              <strong class="dashboard-panel__metric">
                {{ dashboard.workforceSnapshot.totalLabel }}
                <em
                  class="dashboard-panel__metric-delta"
                  :class="getSignedToneClass(getWorkforceDeltaLabel(dashboard.workforceSnapshot.note))"
                >
                  ({{ getWorkforceDeltaLabel(dashboard.workforceSnapshot.note) }})
                </em>
              </strong>
            </div>

            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>공종</th>
                    <th class="dashboard-table__number">어제 (명)</th>
                    <th class="dashboard-table__number">오늘 (명)</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in dashboard.workforceBreakdown"
                    :key="item.label"
                  >
                    <td>{{ item.label }}</td>
                    <td class="dashboard-table__number dashboard-table__emphasis">
                      {{ item.yesterdayCount }}
                    </td>
                    <td class="dashboard-table__number">
                      <span class="dashboard-table__compound">
                        <span class="dashboard-table__emphasis">{{ item.todayCount }}</span>
                        <span
                          class="dashboard-table__delta"
                          :class="getSignedToneClass(formatNumericDelta(item.todayCount - item.yesterdayCount))"
                        >
                          ({{ formatNumericDelta(item.todayCount - item.yesterdayCount) }})
                        </span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="dashboard-panel">
            <div class="dashboard-panel__topline dashboard-panel__topline--today">
              <h3 class="dashboard-panel__title">자재 투입현황</h3>
            </div>

            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>항목 (단위)</th>
                    <th class="dashboard-table__number">어제</th>
                    <th class="dashboard-table__number">오늘</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in materialResources"
                    :key="`${item.group}-${item.label}`"
                  >
                    <td>{{ item.label }} ({{ item.unit }})</td>
                    <td class="dashboard-table__number dashboard-table__emphasis">{{ item.yesterdayValue }}</td>
                    <td class="dashboard-table__number">
                      <span class="dashboard-table__compound">
                        <span class="dashboard-table__emphasis">{{ item.todayValue }}</span>
                        <span
                          class="dashboard-table__delta"
                          :class="getSignedToneClass(formatNumericDelta(getNumericDelta(item.yesterdayValue, item.todayValue)))"
                        >
                          ({{ formatNumericDelta(getNumericDelta(item.yesterdayValue, item.todayValue)) }})
                        </span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import type {
  DashboardComparisonChart,
  DashboardComparisonPoint,
} from "@/features/desktop-dashboard/model/desktop-dashboard.types";
import { useDesktopDashboardViewModel } from "@/features/desktop-dashboard/state/useDesktopDashboardViewModel";

const ProgressComparisonChart = defineAsyncComponent(
  () => import("@/features/desktop-dashboard/ui/components/ProgressComparisonChart.vue"),
);

const {
  dashboard,
  todayWorkSections,
  materialResources,
} = useDesktopDashboardViewModel();
const completedTodoTitles = ref<Set<string>>(new Set());
const progressChartTabs = [
  {
    id: "overall",
    label: "전체 공정률",
  },
  {
    id: "current",
    label: "철근 콘크리트 공정률",
  },
] as const;
const activeProgressChartId = ref<"overall" | "current">("overall");

const activeComparisonChart = computed(() =>
  activeProgressChartId.value === "overall"
    ? dashboard.value.overallComparisonChart
    : dashboard.value.currentComparisonChart,
);

function toggleTodo(title: string) {
  const nextTitles = new Set(completedTodoTitles.value);

  if (nextTitles.has(title)) {
    nextTitles.delete(title);
  } else {
    nextTitles.add(title);
  }

  completedTodoTitles.value = nextTitles;
}

function isTodoCompleted(title: string) {
  return completedTodoTitles.value.has(title);
}

function selectProgressChart(chartId: "overall" | "current") {
  activeProgressChartId.value = chartId;
}

function getWorkforceDeltaLabel(note: string) {
  const normalizedLabel = note.replace(/^전일\s*대비\s*/, "");

  return normalizedLabel === "0명" || normalizedLabel === "0"
    ? "-"
    : normalizedLabel;
}

function getNumericDelta(yesterdayValue: string, todayValue: string) {
  return Number(todayValue) - Number(yesterdayValue);
}

function formatNumericDelta(value: number) {
  if (value === 0) {
    return "-";
  }

  if (Number.isInteger(value)) {
    if (value > 0) {
      return `+${value}`;
    }

    return `${value}`;
  }

  const roundedValue = Number(value.toFixed(1));

  if (roundedValue > 0) {
    return `+${roundedValue}`;
  }

  return `${roundedValue}`;
}

function getSignedToneClass(valueLabel: string) {
  if (valueLabel === "-") {
    return "dashboard-panel__metric-delta--neutral";
  }

  if (valueLabel.startsWith("+")) {
    return "dashboard-panel__metric-delta--positive";
  }

  if (valueLabel.startsWith("-")) {
    return "dashboard-panel__metric-delta--negative";
  }

  return "";
}

function getLatestValue(points: DashboardComparisonPoint[]) {
  return points[points.length - 1]?.value ?? 0;
}

function getDeltaValue(chart: DashboardComparisonChart) {
  return getLatestValue(chart.actualSeries) - getLatestValue(chart.plannedSeries);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function formatDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}%`;
  }

  return `${delta}%`;
}

function getDeltaToneClass(chart: DashboardComparisonChart) {
  return getDeltaValue(chart) >= 0
    ? "dashboard-line-chart__delta--positive"
    : "dashboard-line-chart__delta--negative";
}
</script>

<style scoped src="./styles/DesktopDashboardPage.css"></style>
