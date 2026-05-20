import { watch, type Ref } from "vue";

import type { DesktopScheduleVersionId } from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
    DesktopScheduleItem,
    DesktopScheduleRow,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import type { DesktopScheduleLocalSnapshot } from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";
import { scheduleValidationApi } from "@/features/project-admin/schedule-validation/services/schedule-validation.api";

type AiVerificationColorStash = {
  rowColorById: Map<string, string | null>;
  subWorkTypeColorById: Map<number, string | null>;
  itemColorById: Map<string, string | null>;
};

type DesktopScheduleAiVerificationDependencies = {
  selectedScheduleVersionId: Readonly<Ref<DesktopScheduleVersionId | null>>;
  isAiVerificationModeActive: Ref<boolean>;
  aiVerificationFlaggedItemIds: Ref<string[]>;
  aiVerificationViolationDetailByItemId: Ref<Record<string, string>>;
  aiVerificationFailedWorkTypeIds: Ref<number[]>;
  aiVerificationStatus: Ref<"idle" | "loading" | "success" | "error">;
  aiVerificationErrorMessage: Ref<string | null>;
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  captureWorkingSnapshot: () => DesktopScheduleLocalSnapshot;
  pushLocalHistoryEntry: (previousSnapshot: DesktopScheduleLocalSnapshot) => void;
  syncLoadedSubWorkTypeColor: (subWorkTypeId: number, colorHex: string | null) => void;
  showScheduleToast: (message: string, tone?: "neutral" | "warning") => void;
  trackScheduleAction: (
    action: string,
    status: "success" | "fail",
    meta?: Record<string, string | number | boolean | null>,
  ) => void;
};

export function useDesktopScheduleAiVerification({
  selectedScheduleVersionId,
  isAiVerificationModeActive,
  aiVerificationFlaggedItemIds,
  aiVerificationViolationDetailByItemId,
  aiVerificationFailedWorkTypeIds,
  aiVerificationStatus,
  aiVerificationErrorMessage,
  workingRows,
  workingItems,
  captureWorkingSnapshot,
  pushLocalHistoryEntry,
  syncLoadedSubWorkTypeColor,
  showScheduleToast,
  trackScheduleAction,
}: DesktopScheduleAiVerificationDependencies) {
  let aiVerificationColorStash: AiVerificationColorStash | null = null;

  function clearVerificationResults() {
    aiVerificationFlaggedItemIds.value = [];
    aiVerificationViolationDetailByItemId.value = {};
    aiVerificationFailedWorkTypeIds.value = [];
    aiVerificationErrorMessage.value = null;
    aiVerificationStatus.value = "idle";
  }

  async function runAiVerification() {
    const scheduleVersionId = selectedScheduleVersionId.value;
    if (!scheduleVersionId) {
      aiVerificationErrorMessage.value = "선택된 공정표 버전이 없어요.";
      aiVerificationStatus.value = "error";
      return;
    }

    aiVerificationStatus.value = "loading";
    aiVerificationErrorMessage.value = null;
    try {
      const response = await scheduleValidationApi.validateSchedule(scheduleVersionId);

      const itemsByWorkId = new Map<number, DesktopScheduleItem>();
      workingItems.value.forEach((item) => {
        itemsByWorkId.set(item.workId, item);
      });

      const flaggedItemIds: string[] = [];
      const detailByItemId: Record<string, string> = {};
      response.violations.forEach((violation) => {
        const item = itemsByWorkId.get(violation.workId);
        if (!item) return;
        if (!flaggedItemIds.includes(item.id)) {
          flaggedItemIds.push(item.id);
        }
        detailByItemId[item.id] = detailByItemId[item.id]
          ? `${detailByItemId[item.id]}\n${violation.detail}`
          : violation.detail;
      });

      aiVerificationFlaggedItemIds.value = flaggedItemIds;
      aiVerificationViolationDetailByItemId.value = detailByItemId;
      aiVerificationFailedWorkTypeIds.value = response.failedWorkTypeIds ?? [];
      aiVerificationStatus.value = "success";

      const failedCount = response.failedWorkTypeIds?.length ?? 0;
      if (failedCount > 0) {
        showScheduleToast(
          `일부 공종 검증 실패 (${failedCount}개) — 재시도하거나 규칙을 확인해주세요.`,
          "warning",
        );
      } else if (flaggedItemIds.length === 0) {
        showScheduleToast("AI 검증 결과 위반 사항이 없어요.", "neutral");
      } else {
        showScheduleToast(
          `${flaggedItemIds.length}개 작업에서 위반이 감지됐어요.`,
          "warning",
        );
      }

      trackScheduleAction("run_ai_verification", "success", {
        violation_count: flaggedItemIds.length,
        failed_work_type_count: failedCount,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI 검증을 실행하지 못했어요.";
      aiVerificationErrorMessage.value = message;
      aiVerificationStatus.value = "error";
      showScheduleToast(message, "warning");
      trackScheduleAction("run_ai_verification", "fail", {
        message,
      });
    }
  }

  function toggleAiVerificationMode() {
    if (isAiVerificationModeActive.value) {
      isAiVerificationModeActive.value = false;
      clearVerificationResults();

      if (aiVerificationColorStash) {
        const stash = aiVerificationColorStash;
        aiVerificationColorStash = null;

        const snapshot = captureWorkingSnapshot();

        const subWorkTypeIdsToRestore: Array<{ id: number; colorHex: string | null }> = [];
        workingRows.value = workingRows.value.map((row) => {
          if (!stash.rowColorById.has(row.id)) {
            return row;
          }
          const restoredColor = stash.rowColorById.get(row.id) ?? null;
          const subWorkTypeId = row.source.subWorkTypeId;
          if (typeof subWorkTypeId === "number" && subWorkTypeId > 0) {
            subWorkTypeIdsToRestore.push({ id: subWorkTypeId, colorHex: restoredColor });
          }
          return { ...row, colorHex: restoredColor };
        });
        subWorkTypeIdsToRestore.forEach(({ id, colorHex }) => {
          syncLoadedSubWorkTypeColor(id, colorHex);
        });

        workingItems.value = workingItems.value.map((item) => {
          if (!stash.itemColorById.has(item.id)) {
            return item;
          }
          return { ...item, colorHex: stash.itemColorById.get(item.id) ?? null };
        });

        pushLocalHistoryEntry(snapshot);
      }
      trackScheduleAction("toggle_ai_verification", "success", {
        active: false,
      });
      return;
    }

    const coloredRows = workingRows.value.filter((row) => row.colorHex != null);
    const coloredItems = workingItems.value.filter((item) => item.colorHex != null);

    if (coloredRows.length > 0 || coloredItems.length > 0) {
      const snapshot = captureWorkingSnapshot();

      const rowColorById = new Map<string, string | null>();
      const subWorkTypeColorById = new Map<number, string | null>();
      const itemColorById = new Map<string, string | null>();

      if (coloredRows.length > 0) {
        const subWorkTypeIdsToClear: number[] = [];
        coloredRows.forEach((row) => {
          rowColorById.set(row.id, row.colorHex ?? null);
          const subWorkTypeId = row.source.subWorkTypeId;
          if (typeof subWorkTypeId === "number" && subWorkTypeId > 0) {
            subWorkTypeColorById.set(subWorkTypeId, row.colorHex ?? null);
            subWorkTypeIdsToClear.push(subWorkTypeId);
          }
        });
        const clearedRowIds = new Set(rowColorById.keys());
        workingRows.value = workingRows.value.map((row) =>
          clearedRowIds.has(row.id) ? { ...row, colorHex: null } : row,
        );
        subWorkTypeIdsToClear.forEach((subWorkTypeId) => {
          syncLoadedSubWorkTypeColor(subWorkTypeId, null);
        });
      }

      if (coloredItems.length > 0) {
        coloredItems.forEach((item) => {
          itemColorById.set(item.id, item.colorHex ?? null);
        });
        const clearedItemIds = new Set(itemColorById.keys());
        workingItems.value = workingItems.value.map((item) =>
          clearedItemIds.has(item.id) ? { ...item, colorHex: null } : item,
        );
      }

      aiVerificationColorStash = { rowColorById, subWorkTypeColorById, itemColorById };

      pushLocalHistoryEntry(snapshot);
    } else {
      aiVerificationColorStash = null;
    }

    isAiVerificationModeActive.value = true;
    clearVerificationResults();
    trackScheduleAction("toggle_ai_verification", "success", {
      active: true,
    });

    void runAiVerification();
  }

  function toggleAiVerificationFlag(itemId: string) {
    const current = aiVerificationFlaggedItemIds.value;
    const willFlag = !current.includes(itemId);
    if (current.includes(itemId)) {
      aiVerificationFlaggedItemIds.value = current.filter((id) => id !== itemId);
      const { [itemId]: _omit, ...rest } = aiVerificationViolationDetailByItemId.value;
      aiVerificationViolationDetailByItemId.value = rest;
    } else {
      aiVerificationFlaggedItemIds.value = [...current, itemId];
    }
    trackScheduleAction("toggle_ai_flag", "success", {
      flagged: willFlag,
      flagged_count: aiVerificationFlaggedItemIds.value.length,
    });
  }

  watch(
    () => selectedScheduleVersionId.value,
    () => {
      if (isAiVerificationModeActive.value) {
        isAiVerificationModeActive.value = false;
      }
      clearVerificationResults();
      aiVerificationColorStash = null;
    },
  );

  return {
    toggleAiVerificationMode,
    toggleAiVerificationFlag,
    runAiVerification,
  };
}
