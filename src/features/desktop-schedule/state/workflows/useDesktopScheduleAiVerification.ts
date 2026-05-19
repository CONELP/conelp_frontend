import { watch, type Ref } from "vue";

import type { DesktopScheduleVersionId } from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
    DesktopScheduleItem,
    DesktopScheduleRow,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import type { DesktopScheduleLocalSnapshot } from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";

type AiVerificationColorStash = {
  rowColorById: Map<string, string | null>;
  subWorkTypeColorById: Map<number, string | null>;
  itemColorById: Map<string, string | null>;
};

type DesktopScheduleAiVerificationDependencies = {
  selectedScheduleVersionId: Readonly<Ref<DesktopScheduleVersionId | null>>;
  isAiVerificationModeActive: Ref<boolean>;
  aiVerificationFlaggedItemIds: Ref<string[]>;
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  captureWorkingSnapshot: () => DesktopScheduleLocalSnapshot;
  pushLocalHistoryEntry: (previousSnapshot: DesktopScheduleLocalSnapshot) => void;
  syncLoadedSubWorkTypeColor: (subWorkTypeId: number, colorHex: string | null) => void;
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
  workingRows,
  workingItems,
  captureWorkingSnapshot,
  pushLocalHistoryEntry,
  syncLoadedSubWorkTypeColor,
  trackScheduleAction,
}: DesktopScheduleAiVerificationDependencies) {
  let aiVerificationColorStash: AiVerificationColorStash | null = null;

  function toggleAiVerificationMode() {
    if (isAiVerificationModeActive.value) {
      isAiVerificationModeActive.value = false;
      aiVerificationFlaggedItemIds.value = [];

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
    trackScheduleAction("toggle_ai_verification", "success", {
      active: true,
    });
  }

  function toggleAiVerificationFlag(itemId: string) {
    const current = aiVerificationFlaggedItemIds.value;
    const willFlag = !current.includes(itemId);
    if (current.includes(itemId)) {
      aiVerificationFlaggedItemIds.value = current.filter((id) => id !== itemId);
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
      if (aiVerificationFlaggedItemIds.value.length > 0) {
        aiVerificationFlaggedItemIds.value = [];
      }
      aiVerificationColorStash = null;
    },
  );

  return {
    toggleAiVerificationMode,
    toggleAiVerificationFlag,
  };
}
