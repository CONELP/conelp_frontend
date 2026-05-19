import type { Ref } from "vue";

import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleVersionId,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import { createDesktopScheduleSnapshotFromApiData } from "@/features/desktop-schedule/api/desktop-schedule.mapper";
import type {
    DesktopScheduleSnapshot,
    DesktopScheduleVersionPromotionState,
    DesktopScheduleVersionReviewState,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import type {
    ScheduleVersionReviewBaselineCache,
    ScheduleVersionReviewSummaryCache,
} from "@/features/desktop-schedule/state/types/desktop-schedule-version-review.types";

type DesktopScheduleDataDependencies<TTimelineCalendarState> = {
  scheduleVersionReviewState: Ref<DesktopScheduleVersionReviewState>;
  createClosedScheduleVersionReviewState: () => DesktopScheduleVersionReviewState;
  incrementScheduleVersionPromotionRequestId: () => void;
  scheduleVersionPromotionState: Ref<DesktopScheduleVersionPromotionState>;
  createClosedScheduleVersionPromotionState: () => DesktopScheduleVersionPromotionState;
  scheduleLoadState: Ref<DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>>;
  timelineCalendarState: Ref<TTimelineCalendarState>;
  createTimelineCalendarState: (data: DesktopScheduleBootstrapData) => TTimelineCalendarState;
  createEmptyTimelineCalendarState: () => TTimelineCalendarState;
  applyScheduleSnapshot: (snapshot: DesktopScheduleSnapshot) => void;
  createEmptyScheduleSnapshot: () => DesktopScheduleSnapshot;
  clearLocalHistory: () => void;
  scheduleVersionReviewBaselineCache: Ref<ScheduleVersionReviewBaselineCache | null>;
  scheduleVersionReviewSummaryCache: Ref<ScheduleVersionReviewSummaryCache | null>;
  normalizeError: (
    error: unknown,
  ) => DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>["error"];
};

export function useDesktopScheduleData<TTimelineCalendarState>({
  scheduleVersionReviewState,
  createClosedScheduleVersionReviewState,
  incrementScheduleVersionPromotionRequestId,
  scheduleVersionPromotionState,
  createClosedScheduleVersionPromotionState,
  scheduleLoadState,
  timelineCalendarState,
  createTimelineCalendarState,
  createEmptyTimelineCalendarState,
  applyScheduleSnapshot,
  createEmptyScheduleSnapshot,
  clearLocalHistory,
  scheduleVersionReviewBaselineCache,
  scheduleVersionReviewSummaryCache,
  normalizeError,
}: DesktopScheduleDataDependencies<TTimelineCalendarState>) {
  async function loadSchedule(
    options: {
      scheduleVersionId?: DesktopScheduleVersionId;
    } = {},
  ) {
    scheduleVersionReviewState.value = createClosedScheduleVersionReviewState();
    incrementScheduleVersionPromotionRequestId();
    scheduleVersionPromotionState.value = createClosedScheduleVersionPromotionState();
    scheduleLoadState.value = {
      status: "loading",
      data: scheduleLoadState.value.data,
      error: null,
    };

    try {
      const scheduleData = await desktopScheduleApi.loadCurrentProjectSchedule({
        scheduleVersionId: options.scheduleVersionId,
      });
      const nextSnapshot = createDesktopScheduleSnapshotFromApiData(scheduleData);
      timelineCalendarState.value = createTimelineCalendarState(scheduleData);
      applyScheduleSnapshot(nextSnapshot);
      clearLocalHistory();
      scheduleLoadState.value = {
        status: "success",
        data: scheduleData,
        error: null,
      };
      if (scheduleData.selectedScheduleVersion.isMain) {
        scheduleVersionReviewBaselineCache.value = {
          versionId: scheduleData.selectedScheduleVersion.id,
          versionName: scheduleData.selectedScheduleVersion.versionName,
          snapshot: nextSnapshot,
        };
        scheduleVersionReviewSummaryCache.value = null;
      }
    } catch (error) {
      timelineCalendarState.value = createEmptyTimelineCalendarState();
      applyScheduleSnapshot(createEmptyScheduleSnapshot());
      clearLocalHistory();
      scheduleLoadState.value = {
        status: "error",
        data: null,
        error: normalizeError(error),
      };
    }
  }

  return {
    loadSchedule,
  };
}
