<template>
  <main class="dashboard-page">
    <header class="dashboard-header">
      <div class="dashboard-shell dashboard-header__inner">
        <img class="dashboard-header__logo" :src="logoSrc" alt="CONELP" />

        <div class="dashboard-header__controls">
          <span class="dashboard-header__chip">{{ dashboard.siteChipLabel }}</span>

          <button
            class="dashboard-header__settings"
            type="button"
            aria-label="설정"
          >
            <img class="dashboard-header__settings-icon" :src="settingsIcon" alt="" />
          </button>
        </div>
      </div>
    </header>

    <div class="dashboard-shell dashboard-body">
      <section class="dashboard-row dashboard-row--status">
        <div class="dashboard-status-grid">
          <article class="dashboard-panel">
            <h2 class="dashboard-panel__title">
              {{ dashboard.overallComparisonChart.title }}
            </h2>

            <div class="dashboard-line-chart">
              <svg
                class="dashboard-line-chart__svg"
                viewBox="0 0 100 72"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    :id="`${dashboard.overallComparisonChart.id}-gap`"
                    patternUnits="userSpaceOnUse"
                    width="6"
                    height="6"
                    patternTransform="rotate(45)"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      class="dashboard-line-chart__pattern-line"
                    />
                  </pattern>
                </defs>

                <line
                  v-for="gridValue in chartGridValues"
                  :key="`overall-grid-${gridValue}`"
                  class="dashboard-line-chart__grid-line"
                  x1="8"
                  :y1="mapChartValueToY(gridValue)"
                  x2="92"
                  :y2="mapChartValueToY(gridValue)"
                />

                <polygon
                  class="dashboard-line-chart__gap"
                  :points="getGapPolygon(
                    dashboard.overallComparisonChart.plannedSeries,
                    dashboard.overallComparisonChart.actualSeries,
                  )"
                  :fill="`url(#${dashboard.overallComparisonChart.id}-gap)`"
                />

                <polyline
                  class="dashboard-line-chart__line dashboard-line-chart__line--planned"
                  :points="getPolylinePoints(dashboard.overallComparisonChart.plannedSeries)"
                />

                <polyline
                  class="dashboard-line-chart__line dashboard-line-chart__line--actual"
                  :points="getPolylinePoints(dashboard.overallComparisonChart.actualSeries)"
                />

              </svg>

              <div class="dashboard-line-chart__labels">
                <span
                  v-for="point in dashboard.overallComparisonChart.actualSeries"
                  :key="`overall-label-${point.label}`"
                >
                  {{ point.label }}
                </span>
              </div>
            </div>

            <div class="dashboard-line-chart__summary">
              <p>
                <span>계획 공정률</span>
                <strong>{{ formatPercent(getLatestValue(dashboard.overallComparisonChart.plannedSeries)) }}</strong>
              </p>
              <p>
                <span>실제 공정률</span>
                <strong class="dashboard-line-chart__delta">
                  <span>{{ formatPercent(getLatestValue(dashboard.overallComparisonChart.actualSeries)) }}</span>
                  <em :class="getDeltaToneClass(dashboard.overallComparisonChart)">
                    ({{ formatDelta(getDeltaValue(dashboard.overallComparisonChart)) }})
                  </em>
                </strong>
              </p>
            </div>
          </article>

          <article class="dashboard-panel">
            <div class="dashboard-panel__topline">
              <h2 class="dashboard-panel__title">
                {{ dashboard.currentComparisonChart.title }}
              </h2>
              <span class="dashboard-panel__pill">{{ dashboard.currentProcess.windowLabel }}</span>
            </div>

            <div class="dashboard-line-chart">
              <svg
                class="dashboard-line-chart__svg"
                viewBox="0 0 100 72"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    :id="`${dashboard.currentComparisonChart.id}-gap`"
                    patternUnits="userSpaceOnUse"
                    width="6"
                    height="6"
                    patternTransform="rotate(45)"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      class="dashboard-line-chart__pattern-line"
                    />
                  </pattern>
                </defs>

                <line
                  v-for="gridValue in chartGridValues"
                  :key="`current-grid-${gridValue}`"
                  class="dashboard-line-chart__grid-line"
                  x1="8"
                  :y1="mapChartValueToY(gridValue)"
                  x2="92"
                  :y2="mapChartValueToY(gridValue)"
                />

                <polygon
                  class="dashboard-line-chart__gap"
                  :points="getGapPolygon(
                    dashboard.currentComparisonChart.plannedSeries,
                    dashboard.currentComparisonChart.actualSeries,
                  )"
                  :fill="`url(#${dashboard.currentComparisonChart.id}-gap)`"
                />

                <polyline
                  class="dashboard-line-chart__line dashboard-line-chart__line--planned"
                  :points="getPolylinePoints(dashboard.currentComparisonChart.plannedSeries)"
                />

                <polyline
                  class="dashboard-line-chart__line dashboard-line-chart__line--actual"
                  :points="getPolylinePoints(dashboard.currentComparisonChart.actualSeries)"
                />

              </svg>

              <div class="dashboard-line-chart__labels">
                <span
                  v-for="point in dashboard.currentComparisonChart.actualSeries"
                  :key="`current-label-${point.label}`"
                >
                  {{ point.label }}
                </span>
              </div>
            </div>

            <div class="dashboard-line-chart__summary">
              <p>
                <span>계획 공정률</span>
                <strong>{{ formatPercent(getLatestValue(dashboard.currentComparisonChart.plannedSeries)) }}</strong>
              </p>
              <p>
                <span>실제 공정률</span>
                <strong class="dashboard-line-chart__delta">
                  <span>{{ formatPercent(getLatestValue(dashboard.currentComparisonChart.actualSeries)) }}</span>
                  <em :class="getDeltaToneClass(dashboard.currentComparisonChart)">
                    ({{ formatDelta(getDeltaValue(dashboard.currentComparisonChart)) }})
                  </em>
                </strong>
              </p>
            </div>
          </article>

          <article class="dashboard-panel dashboard-panel--milestones">
            <h2 class="dashboard-panel__title">다음 마일스톤</h2>

            <div class="dashboard-milestone-list">
              <article
                v-for="milestone in dashboard.milestones"
                :key="`${milestone.title}-${milestone.dueLabel}`"
                class="dashboard-milestone"
              >
                <span class="dashboard-milestone__date">{{ milestone.dueLabel }}</span>
                <p class="dashboard-milestone__title">{{ milestone.title }}</p>
              </article>
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
              <h3 class="dashboard-panel__title">자재 및 장비 투입 현황</h3>
            </div>

            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>분류</th>
                    <th>항목 (단위)</th>
                    <th class="dashboard-table__number">어제</th>
                    <th class="dashboard-table__number">오늘</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in dashboard.resourceItems"
                    :key="`${item.group}-${item.label}`"
                  >
                    <td>{{ item.group === "material" ? "자재" : "장비" }}</td>
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

              <div class="dashboard-calendar__grid">
                <template
                  v-for="(week, rowIndex) in calendarRows"
                  :key="`week-${rowIndex}`"
                >
                  <article
                    v-for="(day, dayIndex) in week"
                    :key="`day-${rowIndex}-${dayIndex}-${day.day ?? 'empty'}`"
                    class="dashboard-calendar__cell"
                    :class="`dashboard-calendar__cell--${day.tone}`"
                  >
                    <span>{{ day.day ?? "" }}</span>
                    <small v-if="day.agenda">{{ day.agenda }}</small>
                  </article>
                </template>
              </div>
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
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import settingsIcon from "@fluentui/svg-icons/icons/settings_20_regular.svg";

import type {
  DashboardComparisonChart,
  DashboardComparisonPoint,
} from "@/features/desktop-dashboard/model/desktop-dashboard.types";
import { useDesktopDashboardViewModel } from "@/features/desktop-dashboard/state/useDesktopDashboardViewModel";

const {
  dashboard,
  calendarRows,
} = useDesktopDashboardViewModel();
const completedTodoTitles = ref<Set<string>>(new Set());

const CHART_GRID_VALUES = [0, 25, 50, 75, 100];
const CHART_HEIGHT = 72;
const CHART_MIN_X = 8;
const CHART_MAX_X = 92;
const CHART_MIN_Y = 8;
const CHART_MAX_Y = 64;

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

function mapChartValueToY(value: number) {
  const drawableHeight = CHART_MAX_Y - CHART_MIN_Y;

  return CHART_MAX_Y - (drawableHeight * value) / 100;
}

function getChartCoordinates(points: DashboardComparisonPoint[]) {
  const maxIndex = Math.max(points.length - 1, 1);

  return points.map((point, index) => {
    const progress = index / maxIndex;

    return {
      label: point.label,
      x: CHART_MIN_X + (CHART_MAX_X - CHART_MIN_X) * progress,
      y: mapChartValueToY(point.value),
    };
  });
}

function getPolylinePoints(points: DashboardComparisonPoint[]) {
  return getChartCoordinates(points)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function getGapPolygon(
  plannedSeries: DashboardComparisonPoint[],
  actualSeries: DashboardComparisonPoint[],
) {
  const plannedCoordinates = getChartCoordinates(plannedSeries);
  const actualCoordinates = getChartCoordinates(actualSeries);

  return [...plannedCoordinates, ...actualCoordinates.slice().reverse()]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

const chartGridValues = CHART_GRID_VALUES;
const logoSrc = new URL("../../../../conelp_logo.png", import.meta.url).href;
</script>

<style scoped src="./styles/DesktopDashboardPage.css"></style>
