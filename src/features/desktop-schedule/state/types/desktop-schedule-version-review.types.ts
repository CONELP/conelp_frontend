import type { DesktopScheduleVersionId } from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
  DesktopScheduleSnapshot,
  DesktopScheduleVersionReviewSummary,
} from "@/features/desktop-schedule/model/desktop-schedule.types";

export type ScheduleVersionReviewBaselineCache = {
  versionId: DesktopScheduleVersionId;
  versionName: string;
  snapshot: DesktopScheduleSnapshot;
};

export type ScheduleVersionReviewSummaryCache = {
  baselineVersionId: DesktopScheduleVersionId;
  baselineVersionName: string;
  draftVersionId: DesktopScheduleVersionId;
  draftVersionName: string;
  draftFingerprint: string;
  layoutFingerprint: string;
  summary: DesktopScheduleVersionReviewSummary;
};
