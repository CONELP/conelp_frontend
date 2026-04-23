import { computed } from "vue";

import { desktopDashboardSeed } from "@/features/desktop-dashboard/data/desktop-dashboard.seed";
import type { DashboardTodayWorkSection } from "@/features/desktop-dashboard/model/desktop-dashboard.types";

function parseTodayWorkSections(rawText: string): DashboardTodayWorkSection[] {
  const sections: DashboardTodayWorkSection[] = [];
  let currentSection: DashboardTodayWorkSection | null = null;

  for (const rawLine of rawText.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith("■")) {
      currentSection = {
        title: line.replace(/^■\s*/, ""),
        tasks: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (currentSection && /^[-•·]\s*/.test(line)) {
      currentSection.tasks.push(line.replace(/^[-•·]\s*/, ""));
    }
  }

  return sections;
}

export function useDesktopDashboardViewModel() {
  const dashboard = computed(() => desktopDashboardSeed);
  const todayWorkSections = computed(() =>
    parseTodayWorkSections(dashboard.value.todayWorkRawText),
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
    todayWorkSections,
    materialResources,
    equipmentResources,
    highPriorityIssues,
  };
}
