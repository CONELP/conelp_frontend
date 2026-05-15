import { ref } from "vue";
import { defineStore } from "pinia";

import { calendarApi } from "@/features/project-admin/_shared/services/calendar.api";
import type { CalendarResponse } from "@/features/project-admin/_shared/model/calendar.types";

export const useCalendarStore = defineStore("holiday-calendar", () => {
  const calendarData = ref<CalendarResponse | null>(null);
  const lastFetchedProjectId = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const getCalendar = async (
    projectId: string,
    forceRefresh = false,
  ): Promise<CalendarResponse | null> => {
    if (
      !forceRefresh &&
      calendarData.value &&
      lastFetchedProjectId.value === projectId
    ) {
      return calendarData.value;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const data = await calendarApi.getProjectCalendar(projectId);
      calendarData.value = data;
      lastFetchedProjectId.value = projectId;
      return data;
    } catch (err: unknown) {
      console.error("캘린더 데이터 로드 실패:", err);
      error.value = (err as Error).message || "알 수 없는 오류";
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const refreshCalendar = async (): Promise<CalendarResponse | null> => {
    if (!lastFetchedProjectId.value) return null;
    return getCalendar(lastFetchedProjectId.value, true);
  };

  const clearCache = () => {
    calendarData.value = null;
    lastFetchedProjectId.value = null;
    error.value = null;
  };

  return {
    calendarData,
    isLoading,
    error,
    getCalendar,
    refreshCalendar,
    clearCache,
  };
});
