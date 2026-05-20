import { defineStore } from "pinia";
import { computed, ref } from "vue";

import {
  desktopScheduleApi,
  getSelectedDesktopScheduleProjectId,
  setSelectedDesktopScheduleProjectId,
} from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
  DesktopScheduleProjectId,
  DesktopScheduleProjectResponse,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";

export const useProjectPickerStore = defineStore("project-picker", () => {
  const projects = ref<DesktopScheduleProjectResponse[]>([]);
  const currentProjectId = ref<DesktopScheduleProjectId | null>(
    getSelectedDesktopScheduleProjectId(),
  );
  const isLoading = ref(false);
  const hasLoaded = ref(false);

  let loadPromise: Promise<void> | null = null;

  const hasOptions = computed(() => projects.value.length > 0);

  function syncStoredProjectId() {
    const storedProjectId = getSelectedDesktopScheduleProjectId();
    currentProjectId.value = storedProjectId;
    return storedProjectId;
  }

  function applyProjects(fetched: DesktopScheduleProjectResponse[]) {
    projects.value = fetched;

    const stored = getSelectedDesktopScheduleProjectId();
    if (stored && fetched.some((project) => project.id === stored)) {
      currentProjectId.value = stored;
      return;
    }

    if (fetched[0]) {
      currentProjectId.value = fetched[0].id;
      setSelectedDesktopScheduleProjectId(fetched[0].id);
      return;
    }

    currentProjectId.value = null;
  }

  async function loadProjects(options: { force?: boolean } = {}) {
    const storedProjectId = syncStoredProjectId();

    if (!storedProjectId && projects.value.length > 0) {
      projects.value = [];
      hasLoaded.value = false;
    }

    const hasStoredProjectInCache = storedProjectId
      ? projects.value.some((project) => project.id === storedProjectId)
      : projects.value.length === 0;

    if (!options.force && hasLoaded.value && hasStoredProjectInCache) return;
    if (loadPromise) return loadPromise;

    isLoading.value = true;
    loadPromise = (async () => {
      try {
        const fetched = await desktopScheduleApi.getProjectList();
        applyProjects(fetched);
        hasLoaded.value = true;
      } catch (error) {
        console.error("getProjectList failed", error);
      } finally {
        isLoading.value = false;
        loadPromise = null;
      }
    })();

    return loadPromise;
  }

  function setCurrentProjectId(projectId: DesktopScheduleProjectId) {
    currentProjectId.value = projectId;
    setSelectedDesktopScheduleProjectId(projectId);
  }

  return {
    projects,
    currentProjectId,
    isLoading,
    hasLoaded,
    hasOptions,
    loadProjects,
    setCurrentProjectId,
  };
});
