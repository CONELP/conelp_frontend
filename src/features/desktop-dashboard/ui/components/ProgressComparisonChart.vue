<template>
  <div
    ref="chartHostRef"
    class="progress-comparison-chart"
    :aria-label="`${chart.title} 차트`"
    role="img"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import type {
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import { type ComposeOption, type ECharts, init, use } from "echarts/core";
import type { LineSeriesOption } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";

import type { DashboardComparisonChart } from "@/features/desktop-dashboard/model/desktop-dashboard.types";

use([LineChart, GridComponent, TooltipComponent, AxisPointerComponent, CanvasRenderer]);

type ProgressComparisonChartOption = ComposeOption<
  GridComponentOption | TooltipComponentOption | LineSeriesOption
>;

const props = defineProps<{
  chart: DashboardComparisonChart;
}>();

const chartHostRef = ref<HTMLDivElement | null>(null);

let chartInstance: ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

function getCssVariableValue(name: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

function getYAxisRange(chart: DashboardComparisonChart) {
  const maxValue = Math.max(
    ...chart.plannedSeries.map((point) => point.value),
    ...chart.actualSeries.map((point) => point.value),
    0,
  );

  if (maxValue <= 50) {
    return {
      max: 50,
      interval: 10,
    };
  }

  if (maxValue <= 75) {
    return {
      max: 75,
      interval: 25,
    };
  }

  return {
    max: 100,
    interval: 25,
  };
}

function buildChartOption(): ProgressComparisonChartOption {
  const primaryColor = getCssVariableValue("--primary", "#1e1888");
  const labels = props.chart.actualSeries.map((point) => point.label);
  const yAxisRange = getYAxisRange(props.chart);

  return {
    animationDuration: 520,
    animationEasing: "cubicOut",
    grid: {
      top: 0,
      right: 10,
      bottom: 0,
      left: 22,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#ffffff",
      borderColor: "rgba(0, 0, 0, 0.08)",
      borderWidth: 1,
      padding: [8, 10],
      textStyle: {
        color: "#1f2933",
        fontSize: 11,
      },
      axisPointer: {
        type: "line",
        lineStyle: {
          color: "rgba(0, 0, 0, 0.14)",
          width: 1,
        },
      },
      formatter(params) {
        const items = Array.isArray(params) ? params : [params];
        const firstItem = items[0];
        const axisLabel =
          firstItem && typeof firstItem === "object" && "axisValue" in firstItem
            ? String(firstItem.axisValue ?? "")
            : firstItem && typeof firstItem === "object" && "name" in firstItem
              ? String(firstItem.name ?? "")
              : "";
        const rows = items
          .map((item) => {
            const color = typeof item.color === "string"
              ? item.color
              : primaryColor;

            return `<div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:999px; background:${color};"></span>
              <span>${item.seriesName}</span>
              <strong style="margin-left:auto;">${item.value}%</strong>
            </div>`;
          })
          .join("");

        return `<div style="font-weight:700; margin-bottom:4px;">${axisLabel}</div>${rows}`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        interval: 0,
        color: "#8b9199",
        fontSize: 10,
        fontWeight: 600,
        margin: 10,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(0, 0, 0, 0.06)",
          type: "dashed",
        },
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yAxisRange.max,
      interval: yAxisRange.interval,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#8b9199",
        fontSize: 10,
        fontWeight: 700,
        margin: 10,
        formatter(value: number) {
          return `${value}%`;
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(0, 0, 0, 0.08)",
        },
      },
    },
    series: [
      {
        name: "계획 공정률",
        type: "line",
        data: props.chart.plannedSeries.map((point) => point.value),
        showSymbol: false,
        symbol: "circle",
        lineStyle: {
          color: "#b7bcc7",
          width: 2,
        },
        itemStyle: {
          color: "#b7bcc7",
        },
        emphasis: {
          focus: "series",
        },
      },
      {
        name: "실제 공정률",
        type: "line",
        data: props.chart.actualSeries.map((point) => point.value),
        showSymbol: false,
        lineStyle: {
          color: primaryColor,
          width: 3,
        },
        itemStyle: {
          color: primaryColor,
        },
        emphasis: {
          focus: "series",
        },
      },
    ],
  };
}

function renderChart() {
  if (!chartInstance) {
    return;
  }

  chartInstance.setOption(buildChartOption(), true);
}

onMounted(() => {
  if (!chartHostRef.value) {
    return;
  }

  chartInstance = init(chartHostRef.value);
  renderChart();

  resizeObserver = new ResizeObserver(() => {
    chartInstance?.resize();
  });

  resizeObserver.observe(chartHostRef.value);
});

watch(
  () => props.chart,
  () => {
    renderChart();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;

  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.progress-comparison-chart {
  width: 100%;
  height: var(--dashboard-status-chart-height);
  min-height: 0;
}
</style>
