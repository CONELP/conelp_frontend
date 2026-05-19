import type { Ref } from "vue";

import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleVersionResponse,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import {
    desktopScheduleApi,
    findMainScheduleVersion,
} from "@/features/desktop-schedule/api/desktop-schedule.api";
import { createDesktopScheduleSnapshotFromApiData } from "@/features/desktop-schedule/api/desktop-schedule.mapper";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleShellLayout,
    DesktopScheduleSnapshot,
    DesktopScheduleTimelineLayout,
    DesktopScheduleVersionReviewDetail,
    DesktopScheduleVersionReviewState,
    DesktopScheduleVersionReviewSummary,
    DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import {
    cloneItems,
    cloneMilestones,
    cloneWorkConnections,
} from "@/features/desktop-schedule/services/domain/desktop-schedule-history.service";
import {
    createDesktopScheduleVersionReviewSummary,
    createDesktopScheduleVersionReviewVisualSummary,
    createScheduleVersionReviewCounts,
    createScheduleVersionReviewDraftFingerprint,
    createScheduleVersionReviewLayoutFingerprint,
    getItemProcessSignature,
    getRowProcessSignature,
} from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";
import type {
    ScheduleVersionReviewBaselineCache,
    ScheduleVersionReviewSummaryCache,
} from "@/features/desktop-schedule/state/types/desktop-schedule-version-review.types";

const REVIEW_DELETED_ROW_ID_PREFIX = "review-deleted-row:";

type DesktopScheduleVersionReviewWorkflowDependencies = {
  scheduleLoadState: Ref<DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>>;
  selectedScheduleVersion: Readonly<Ref<DesktopScheduleVersionResponse | null>>;
  scheduleVersions: Readonly<Ref<DesktopScheduleVersionResponse[]>>;
  scheduleVersionReviewState: Ref<DesktopScheduleVersionReviewState>;
  scheduleVersionReviewBaselineCache: Ref<ScheduleVersionReviewBaselineCache | null>;
  scheduleVersionReviewSummaryCache: Ref<ScheduleVersionReviewSummaryCache | null>;
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  workingWorkConnections: Ref<DesktopScheduleWorkConnection[]>;
  workingMilestones: Ref<DesktopScheduleMilestone[]>;
  timeline: Readonly<Ref<DesktopScheduleTimelineLayout>>;
  rowHeight: Readonly<Ref<number>>;
  barHeight: Readonly<Ref<number>>;
  lanePreferenceByItemId: Ref<Record<string, number>>;
  createCurrentShellLayout: (rows: DesktopScheduleRow[]) => DesktopScheduleShellLayout;
  showScheduleToast: (message: string, tone?: "neutral" | "warning") => void;
  trackScheduleAction: (
    action: string,
    status: "attempt" | "success" | "fail",
    meta?: Record<string, string | number | boolean | null>,
  ) => void;
  normalizeError: (error: unknown) => { message: string };
};

export function useDesktopScheduleVersionReviewWorkflow({
  scheduleLoadState,
  selectedScheduleVersion,
  scheduleVersions,
  scheduleVersionReviewState,
  scheduleVersionReviewBaselineCache,
  scheduleVersionReviewSummaryCache,
  workingRows,
  workingItems,
  workingWorkConnections,
  workingMilestones,
  timeline,
  rowHeight,
  barHeight,
  lanePreferenceByItemId,
  createCurrentShellLayout,
  showScheduleToast,
  trackScheduleAction,
  normalizeError,
}: DesktopScheduleVersionReviewWorkflowDependencies) {
  function createCurrentScheduleVersionReviewDraftSnapshot() {
    return {
      items: cloneItems(workingItems.value),
      workConnections: cloneWorkConnections(workingWorkConnections.value),
      milestones: cloneMilestones(workingMilestones.value),
    };
  }
  
  function createCurrentScheduleVersionReviewLayoutFingerprint() {
    return createScheduleVersionReviewLayoutFingerprint(workingRows.value, timeline.value, {
      rowHeight: rowHeight.value,
      barHeight: barHeight.value,
      preferredLaneByItemId: lanePreferenceByItemId.value,
    });
  }
  
  async function getScheduleVersionReviewBaselineCache(
    mainVersion: DesktopScheduleVersionResponse,
  ) {
    const currentCache = scheduleVersionReviewBaselineCache.value;
  
    if (currentCache?.versionId === mainVersion.id) {
      if (currentCache.versionName !== mainVersion.versionName) {
        scheduleVersionReviewBaselineCache.value = {
          ...currentCache,
          versionName: mainVersion.versionName,
        };
      }
  
      return scheduleVersionReviewBaselineCache.value!;
    }
  
    const baselineData = await desktopScheduleApi.loadCurrentProjectSchedule({
      scheduleVersionId: mainVersion.id,
      persistSelection: false,
    });
    const baselineSnapshot = createDesktopScheduleSnapshotFromApiData(baselineData);
    const nextCache = {
      versionId: mainVersion.id,
      versionName: mainVersion.versionName,
      snapshot: baselineSnapshot,
    };
  
    scheduleVersionReviewBaselineCache.value = nextCache;
    scheduleVersionReviewSummaryCache.value = null;
  
    return nextCache;
  }
  
  function getCachedScheduleVersionReviewSummary(options: {
    baselineVersion: DesktopScheduleVersionResponse;
    draftVersion: DesktopScheduleVersionResponse;
    draftFingerprint: string;
    layoutFingerprint: string;
  }) {
    const cache = scheduleVersionReviewSummaryCache.value;
  
    if (
      !cache ||
      cache.baselineVersionId !== options.baselineVersion.id ||
      cache.baselineVersionName !== options.baselineVersion.versionName ||
      cache.draftVersionId !== options.draftVersion.id ||
      cache.draftVersionName !== options.draftVersion.versionName ||
      cache.draftFingerprint !== options.draftFingerprint ||
      cache.layoutFingerprint !== options.layoutFingerprint
    ) {
      return null;
    }
  
    return cache.summary;
  }
  
  function createSubProcessRowIdBySignature(rows: DesktopScheduleRow[]) {
    const rowIdBySignature = new Map<string, string>();
    const duplicateSignatures = new Set<string>();
  
    rows.forEach((row) => {
      if (row.kind !== "child-process") {
        return;
      }
  
      const signature = getRowProcessSignature(row);
  
      if (!signature) {
        return;
      }
  
      if (rowIdBySignature.has(signature)) {
        duplicateSignatures.add(signature);
        return;
      }
  
      rowIdBySignature.set(signature, row.id);
    });
    duplicateSignatures.forEach((signature) => rowIdBySignature.delete(signature));
  
    return rowIdBySignature;
  }
  
  function createReviewDeletedRowId(rowId: string) {
    return `${REVIEW_DELETED_ROW_ID_PREFIX}${rowId}`;
  }
  
  function getScheduleVersionReviewDisplayRows(baselineRows: DesktopScheduleRow[]) {
    const displayRows = [...workingRows.value]
      .sort((a, b) => a.order - b.order)
      .map((row) => ({ ...row }));
    const currentRowIdBySignature = createSubProcessRowIdBySignature(workingRows.value);
    const currentSignatureSet = new Set(
      workingRows.value
        .map((row) => (row.kind === "child-process" ? getRowProcessSignature(row) : null))
        .filter((signature): signature is string => !!signature),
    );
    const insertedGhostRowIdByBaselineRowId = new Map<string, string>();
    const baselineRowsByOrder = [...baselineRows].sort((a, b) => a.order - b.order);
  
    function findDisplayRowIndex(rowId: string) {
      return displayRows.findIndex((row) => row.id === rowId);
    }
  
    function findAnchorRowId(
      rowIndex: number,
      direction: "previous" | "next",
    ) {
      for (
        let index = rowIndex + (direction === "previous" ? -1 : 1);
        index >= 0 && index < baselineRowsByOrder.length;
        index += direction === "previous" ? -1 : 1
      ) {
        const baselineRow = baselineRowsByOrder[index]!;
        const signature = getRowProcessSignature(baselineRow);
        const currentRowId = signature ? currentRowIdBySignature.get(signature) : null;
        const insertedGhostRowId = insertedGhostRowIdByBaselineRowId.get(baselineRow.id);
  
        if (currentRowId && findDisplayRowIndex(currentRowId) >= 0) {
          return currentRowId;
        }
  
        if (insertedGhostRowId && findDisplayRowIndex(insertedGhostRowId) >= 0) {
          return insertedGhostRowId;
        }
      }
  
      return null;
    }
  
    baselineRowsByOrder.forEach((baselineRow, rowIndex) => {
      if (baselineRow.kind !== "child-process" || baselineRow.source.kind !== "sub-work-type") {
        return;
      }
  
      const signature = getRowProcessSignature(baselineRow);
  
      if (!signature || currentSignatureSet.has(signature)) {
        return;
      }
  
      const ghostRow: DesktopScheduleRow = {
        ...baselineRow,
        id: createReviewDeletedRowId(baselineRow.id),
        parentId: null,
        collapsed: false,
      };
      const previousAnchorRowId = findAnchorRowId(rowIndex, "previous");
      const nextAnchorRowId = previousAnchorRowId ? null : findAnchorRowId(rowIndex, "next");
      const previousAnchorIndex = previousAnchorRowId
        ? findDisplayRowIndex(previousAnchorRowId)
        : -1;
      const nextAnchorIndex = nextAnchorRowId ? findDisplayRowIndex(nextAnchorRowId) : -1;
  
      if (previousAnchorIndex >= 0) {
        displayRows.splice(previousAnchorIndex + 1, 0, ghostRow);
      } else if (nextAnchorIndex >= 0) {
        displayRows.splice(nextAnchorIndex, 0, ghostRow);
      } else {
        displayRows.push(ghostRow);
      }
  
      insertedGhostRowIdByBaselineRowId.set(baselineRow.id, ghostRow.id);
    });
  
    return displayRows.map((row, index) => ({
      ...row,
      order: index,
    }));
  }
  
  function createBaselineItemsAlignedToReviewRows(
    baselineItems: DesktopScheduleItem[],
    reviewRows: DesktopScheduleRow[],
  ) {
    const reviewRowIdBySignature = createSubProcessRowIdBySignature(reviewRows);
  
    return baselineItems
      .map((item) => {
        const reviewRowId = reviewRowIdBySignature.get(getItemProcessSignature(item));
  
        return reviewRowId ? { ...item, rowId: reviewRowId } : null;
      })
      .filter((item): item is DesktopScheduleItem => item !== null);
  }
  
  function createScheduleVersionReviewCurrentLayout(
    baselineCache: ScheduleVersionReviewBaselineCache,
  ) {
    return createCurrentShellLayout(getScheduleVersionReviewDisplayRows(baselineCache.snapshot.rows));
  }
  
  function createScheduleVersionReviewBaselineLayout(
    baselineCache: ScheduleVersionReviewBaselineCache,
  ) {
    const reviewRows = getScheduleVersionReviewDisplayRows(baselineCache.snapshot.rows);
  
    return desktopScheduleService.buildShellLayout(
      reviewRows,
      createBaselineItemsAlignedToReviewRows(baselineCache.snapshot.items, reviewRows),
      timeline.value,
      {
        rowHeight: rowHeight.value,
        barHeight: barHeight.value,
        workConnections: baselineCache.snapshot.workConnections,
        milestones: baselineCache.snapshot.milestones,
      },
    );
  }
  
  function createScheduleVersionReviewGhostSummaryFromState(options: {
    baselineCache: ScheduleVersionReviewBaselineCache;
    draftVersion: DesktopScheduleVersionResponse;
  }): DesktopScheduleVersionReviewSummary {
    const details: DesktopScheduleVersionReviewDetail[] = [];
    const baselineLayout = createScheduleVersionReviewBaselineLayout(options.baselineCache);
    const currentLayout = createScheduleVersionReviewCurrentLayout(options.baselineCache);
  
    return {
      baselineVersionName: options.baselineCache.versionName,
      draftVersionName: options.draftVersion.versionName,
      generatedAt: new Date().toISOString(),
      totalCount: 0,
      counts: createScheduleVersionReviewCounts(details),
      details,
      visual: createDesktopScheduleVersionReviewVisualSummary(baselineLayout, currentLayout),
    };
  }
  
  function createScheduleVersionReviewSummaryFromState(options: {
    baselineCache: ScheduleVersionReviewBaselineCache;
    draftVersion: DesktopScheduleVersionResponse;
    draftSnapshot: Pick<DesktopScheduleSnapshot, "items" | "workConnections" | "milestones">;
  }) {
    const baselineLayout = createScheduleVersionReviewBaselineLayout(options.baselineCache);
    const currentLayout = createScheduleVersionReviewCurrentLayout(options.baselineCache);
    const summaryBase = createDesktopScheduleVersionReviewSummary(
      options.baselineCache.snapshot,
      options.draftSnapshot,
      options.baselineCache.versionName,
      options.draftVersion.versionName,
    );
  
    return {
      ...summaryBase,
      visual: createDesktopScheduleVersionReviewVisualSummary(baselineLayout, currentLayout),
    };
  }
  
  async function resolveScheduleVersionReviewSummary(options: {
    baselineVersion: DesktopScheduleVersionResponse;
    draftVersion: DesktopScheduleVersionResponse;
  }) {
    const draftSnapshot = createCurrentScheduleVersionReviewDraftSnapshot();
    const draftFingerprint = createScheduleVersionReviewDraftFingerprint(draftSnapshot);
    const layoutFingerprint = createCurrentScheduleVersionReviewLayoutFingerprint();
    const cachedSummary = getCachedScheduleVersionReviewSummary({
      baselineVersion: options.baselineVersion,
      draftVersion: options.draftVersion,
      draftFingerprint,
      layoutFingerprint,
    });
  
    if (cachedSummary) {
      return cachedSummary;
    }
  
    const baselineCache = await getScheduleVersionReviewBaselineCache(options.baselineVersion);
    const summary = createScheduleVersionReviewSummaryFromState({
      baselineCache,
      draftVersion: options.draftVersion,
      draftSnapshot,
    });
  
    scheduleVersionReviewSummaryCache.value = {
      baselineVersionId: options.baselineVersion.id,
      baselineVersionName: options.baselineVersion.versionName,
      draftVersionId: options.draftVersion.id,
      draftVersionName: options.draftVersion.versionName,
      draftFingerprint,
      layoutFingerprint,
      summary,
    };
  
    return summary;
  }
  
  function closeScheduleVersionReview() {
    const currentState = scheduleVersionReviewState.value;
  
    scheduleVersionReviewState.value = {
      open: false,
      status: currentState.summary ? "success" : "idle",
      summary: currentState.summary,
      errorMessage: null,
    };
  }
  
  async function openScheduleVersionReview() {
    const currentData = scheduleLoadState.value.data;
    const draftVersion = selectedScheduleVersion.value;
    const mainVersion = findMainScheduleVersion(scheduleVersions.value);
  
    if (!currentData || !draftVersion) {
      showScheduleToast("비교할 공정표 데이터를 찾지 못했어요.");
      return;
    }
  
    if (draftVersion.isMain) {
      showScheduleToast("복제본에서만 기준 공정표와 비교할 수 있어요.");
      return;
    }
  
    if (!mainVersion) {
      showScheduleToast("기준 공정표가 없어 비교할 수 없어요.");
      return;
    }
  
    scheduleVersionReviewState.value = {
      open: true,
      status: "loading",
      summary: scheduleVersionReviewState.value.summary,
      errorMessage: null,
    };
  
    try {
      const baselineCache = await getScheduleVersionReviewBaselineCache(mainVersion);
      const summary = createScheduleVersionReviewGhostSummaryFromState({
        baselineCache,
        draftVersion,
      });
  
      scheduleVersionReviewState.value = {
        open: true,
        status: "success",
        summary,
        errorMessage: null,
      };
      trackScheduleAction("open_version_review", "success", {
        change_count: summary.totalCount,
      });
    } catch (error) {
      const normalizedError = normalizeError(error);
      showScheduleToast("기준 공정표를 불러오지 못했어요.");
      scheduleVersionReviewState.value = {
        open: false,
        status: "error",
        summary: null,
        errorMessage: normalizedError.message,
      };
      trackScheduleAction("open_version_review", "fail");
    }
  }
  
  
  return {
    closeScheduleVersionReview,
    createScheduleVersionReviewCurrentLayout,
    openScheduleVersionReview,
    resolveScheduleVersionReviewSummary,
  };
}
