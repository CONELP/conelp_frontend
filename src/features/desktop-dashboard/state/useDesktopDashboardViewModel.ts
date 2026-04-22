import { computed } from "vue";

import { desktopDashboardSeed } from "@/features/desktop-dashboard/data/desktop-dashboard.seed";

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function useDesktopDashboardViewModel() {
  const dashboard = computed(() => desktopDashboardSeed);

  const calendarRows = computed(() =>
    chunkArray(dashboard.value.calendarDays, dashboard.value.calendarWeekdays.length),
  );

  const materialResources = computed(() =>
    dashboard.value.resourceItems.filter((item) => item.group === "material"),
  );

  const equipmentResources = computed(() =>
    dashboard.value.resourceItems.filter((item) => item.group === "equipment"),
  );

  const highPriorityIssues = computed(
    () =>
      dashboard.value.todoItems.filter((item) => item.priority === "high").length,
  );

  return {
    dashboard,
    calendarRows,
    materialResources,
    equipmentResources,
    highPriorityIssues,
  };
}
