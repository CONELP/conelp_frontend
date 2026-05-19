import { type ComputedRef, type Ref } from "vue";

import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleVersionId,
    DesktopScheduleVersionResponse
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";

import { findMainScheduleVersion } from "@/features/desktop-schedule/api/desktop-schedule.api";

type AnyFunction = (...args: any[]) => any;

type DesktopScheduleVersionWorkflowDeps = Record<string, any> & {
  MAX_DRAFT_SCHEDULE_VERSION_COUNT: number;
  sortScheduleVersionsForWorkflow: (versions: DesktopScheduleVersionResponse[]) => DesktopScheduleVersionResponse[];
  canCreateDraftVersion: ComputedRef<boolean>;
  scheduleLoadState: Ref<DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>>;
  selectedScheduleVersion: ComputedRef<DesktopScheduleVersionResponse | null>;
  selectedScheduleVersionId: ComputedRef<DesktopScheduleVersionId | null>;
  scheduleVersions: ComputedRef<DesktopScheduleVersionResponse[]>;
  excludedScheduleVersionIds: Ref<Set<DesktopScheduleVersionId>>;
  getSelectedScheduleVersionId: () => DesktopScheduleVersionId | null;
  loadSchedule: AnyFunction;
  showScheduleToast: AnyFunction;
  handleMutationError: AnyFunction;
  updateLoadedScheduleData: AnyFunction;
  resolveScheduleVersionReviewSummary: AnyFunction;
  normalizeError: (error: unknown) => Error;
  trackScheduleAction: AnyFunction;
  incrementScheduleVersionPromotionRequestId: () => number;
  getScheduleVersionPromotionRequestId: () => number;
};

export function useDesktopScheduleVersionWorkflow(deps: DesktopScheduleVersionWorkflowDeps) {
  const {
    MAX_DRAFT_SCHEDULE_VERSION_COUNT,
    sortScheduleVersionsForWorkflow,
    canCreateDraftVersion,
    scheduleLoadState,
    selectedScheduleVersion,
    scheduleVersions,
    scheduleVersionPromotionState,
    createClosedScheduleVersionPromotionState,
    getSelectedScheduleVersionId,
    loadSchedule,
    showScheduleToast,
    handleMutationError,
    resolveScheduleVersionReviewSummary,
    normalizeError,
    trackScheduleAction,
    incrementScheduleVersionPromotionRequestId,
    getScheduleVersionPromotionRequestId,
  } = deps;


  function updateScheduleVersionsInLoadedData(
    updater: (versions: DesktopScheduleVersionResponse[]) => DesktopScheduleVersionResponse[],
  ) {
    const currentData = scheduleLoadState.value.data;
  
    if (!currentData) {
      return;
    }
  
    const nextVersions = updater(currentData.scheduleVersions.map((version) => ({ ...version })));
    const currentSelectedVersion = currentData.selectedScheduleVersion;
    const nextSelectedVersion =
      nextVersions.find((version) => version.id === currentSelectedVersion.id) ??
      currentSelectedVersion;
  
    scheduleLoadState.value = {
      ...scheduleLoadState.value,
      data: {
        ...currentData,
        scheduleVersions: nextVersions,
        selectedScheduleVersion: { ...nextSelectedVersion },
      },
    };
  }
  
  function upsertScheduleVersionInLoadedData(version: DesktopScheduleVersionResponse) {
    updateScheduleVersionsInLoadedData((versions) => {
      const hasVersion = versions.some((currentVersion) => currentVersion.id === version.id);
      const nextVersions = hasVersion
        ? versions.map((currentVersion) =>
            currentVersion.id === version.id ? { ...version } : currentVersion,
          )
        : [...versions, { ...version }];
  
      return sortScheduleVersionsForWorkflow(nextVersions);
    });
  }
  
  function replaceScheduleVersionInLoadedData(version: DesktopScheduleVersionResponse) {
    updateScheduleVersionsInLoadedData((versions) =>
      sortScheduleVersionsForWorkflow(
        versions.map((currentVersion) =>
          currentVersion.id === version.id ? { ...version } : currentVersion,
        ),
      ),
    );
  }
  
  async function selectScheduleVersion(scheduleVersionId: DesktopScheduleVersionId) {
    if (scheduleVersionId === getSelectedScheduleVersionId()) {
      return;
    }
  
    const targetVersion = scheduleVersions.value.find((version) => version.id === scheduleVersionId);
  
    try {
      await loadSchedule({ scheduleVersionId });
      trackScheduleAction("select_version", "success", {
        target_version_mode: targetVersion ? (targetVersion.isMain ? "main" : "draft") : "unknown",
      });
    } catch (error) {
      trackScheduleAction("select_version", "fail", {
        target_version_mode: targetVersion ? (targetVersion.isMain ? "main" : "draft") : "unknown",
      });
      throw error;
    }
  }
  
  async function createDraftVersionFromCurrent(versionName: string) {
    const sourceScheduleVersionId = getSelectedScheduleVersionId();
    const trimmedVersionName = versionName.trim();
  
    if (!sourceScheduleVersionId) {
      showScheduleToast("복제본을 만들 공정표 버전이 없습니다.");
      return;
    }
  
    if (!trimmedVersionName) {
      showScheduleToast("복제본 이름을 입력해 주세요.");
      return;
    }
  
    if (!canCreateDraftVersion.value) {
      showScheduleToast(`복제본은 최대 ${MAX_DRAFT_SCHEDULE_VERSION_COUNT}개까지 만들 수 있어요.`);
      return;
    }
  
    try {
      const createdVersion = await desktopScheduleApi.duplicateScheduleVersion(
        sourceScheduleVersionId,
        { versionName: trimmedVersionName },
      );
      await loadSchedule({ scheduleVersionId: createdVersion.id });
      showScheduleToast("복제본을 만들었어요.");
      trackScheduleAction("create_draft_version", "success");
    } catch (error) {
      handleMutationError(error, "복제본을 만들지 못했습니다.");
      trackScheduleAction("create_draft_version", "fail");
    }
  }
  
  async function renameScheduleVersion(payload: {
    scheduleVersionId: DesktopScheduleVersionId;
    versionName: string;
  }) {
    const trimmedVersionName = payload.versionName.trim();
    const targetVersion =
      scheduleVersions.value.find((version) => version.id === payload.scheduleVersionId) ?? null;
  
    if (!targetVersion || targetVersion.isMain) {
      showScheduleToast("기준 공정표 이름은 여기서 변경할 수 없어요.");
      return;
    }
  
    if (!trimmedVersionName) {
      showScheduleToast("복제본 이름을 입력해 주세요.");
      return;
    }
  
    if (targetVersion.versionName === trimmedVersionName) {
      return;
    }
  
    const previousVersion = { ...targetVersion };
    const optimisticVersion = {
      ...targetVersion,
      versionName: trimmedVersionName,
    };
  
    replaceScheduleVersionInLoadedData(optimisticVersion);
  
    try {
      const updatedVersion = await desktopScheduleApi.updateScheduleVersion(
        payload.scheduleVersionId,
        {
          versionName: trimmedVersionName,
        },
      );
      replaceScheduleVersionInLoadedData({
        ...updatedVersion,
        versionName: updatedVersion.versionName || trimmedVersionName,
      });
      showScheduleToast("복제본 이름을 변경했어요.");
      trackScheduleAction("rename_version", "success");
    } catch (error) {
      replaceScheduleVersionInLoadedData(previousVersion);
      handleMutationError(error, "복제본 이름을 변경하지 못했습니다.");
      trackScheduleAction("rename_version", "fail");
    }
  }
  
  async function deleteScheduleVersion(scheduleVersionId: DesktopScheduleVersionId) {
    const targetVersion = scheduleVersions.value.find((version) => version.id === scheduleVersionId);
  
    if (!targetVersion) {
      return;
    }
  
    if (targetVersion.isMain) {
      showScheduleToast("기준 공정표는 삭제할 수 없어요.");
      return;
    }
  
    if (scheduleVersions.value.length <= 1) {
      showScheduleToast("공정표 버전은 최소 1개가 필요해요.");
      return;
    }
  
    const isDeletingSelectedVersion = scheduleVersionId === getSelectedScheduleVersionId();
    const currentMainFallback = findMainScheduleVersion(
      scheduleVersions.value.filter((version) => version.id !== scheduleVersionId),
    );
    const fallbackScheduleVersionId =
      currentMainFallback?.id ??
      scheduleVersions.value.find((version) => version.id !== scheduleVersionId)?.id;
  
    try {
      await desktopScheduleApi.deleteScheduleVersion(scheduleVersionId);
  
      if (isDeletingSelectedVersion) {
        await loadSchedule({ scheduleVersionId: fallbackScheduleVersionId });
      } else {
        updateScheduleVersionsInLoadedData((versions) =>
          sortScheduleVersionsForWorkflow(
            versions.filter((version) => version.id !== scheduleVersionId),
          ),
        );
      }
  
      showScheduleToast("복제본을 삭제했어요.");
      trackScheduleAction("delete_version", "success");
    } catch (error) {
      handleMutationError(error, "복제본을 삭제하지 못했습니다.");
      trackScheduleAction("delete_version", "fail");
    }
  }
  
  function closeScheduleVersionPromotionDialog() {
    incrementScheduleVersionPromotionRequestId();
    scheduleVersionPromotionState.value = createClosedScheduleVersionPromotionState();
  }
  
  async function requestScheduleVersionPromotion() {
    const currentData = scheduleLoadState.value.data;
    const draftVersion = selectedScheduleVersion.value;
    const mainVersion = findMainScheduleVersion(scheduleVersions.value);
  
    if (!currentData || !draftVersion) {
      showScheduleToast("반영할 공정표 데이터를 찾지 못했어요.");
      return;
    }
  
    if (draftVersion.isMain) {
      showScheduleToast("복제본에서만 기준 공정표로 반영할 수 있어요.");
      return;
    }
  
    const requestId = incrementScheduleVersionPromotionRequestId();
  
    if (!mainVersion) {
      scheduleVersionPromotionState.value = {
        open: true,
        status: "idle",
        baselineVersionName: "",
        draftVersionName: draftVersion.versionName,
        summary: null,
        errorMessage: null,
      };
      return;
    }
  
    scheduleVersionPromotionState.value = {
      open: true,
      status: "preparing",
      baselineVersionName: mainVersion.versionName,
      draftVersionName: draftVersion.versionName,
      summary: null,
      errorMessage: null,
    };
  
    try {
      const summary = await resolveScheduleVersionReviewSummary({
        baselineVersion: mainVersion,
        draftVersion,
      });
  
      if (
        requestId !== getScheduleVersionPromotionRequestId() ||
        selectedScheduleVersion.value?.id !== draftVersion.id
      ) {
        return;
      }
  
      scheduleVersionPromotionState.value = {
        open: true,
        status: "idle",
        baselineVersionName: mainVersion.versionName,
        draftVersionName: draftVersion.versionName,
        summary,
        errorMessage: null,
      };
    } catch (error) {
      if (requestId !== getScheduleVersionPromotionRequestId()) {
        return;
      }
  
      const normalizedError = normalizeError(error);
      scheduleVersionPromotionState.value = {
        open: true,
        status: "error",
        baselineVersionName: mainVersion.versionName,
        draftVersionName: draftVersion.versionName,
        summary: null,
        errorMessage: normalizedError.message,
      };
      showScheduleToast("반영 전 변경사항을 불러오지 못했어요.");
    }
  }
  
  async function confirmScheduleVersionPromotion() {
    const draftVersion = selectedScheduleVersion.value;
    const promotionState = scheduleVersionPromotionState.value;
  
    if (!promotionState.open || promotionState.status === "promoting") return;
    if (!draftVersion || draftVersion.isMain) {
      showScheduleToast("복제본에서만 기준 공정표로 반영할 수 있어요.");
      return;
    }
  
    const requestId = incrementScheduleVersionPromotionRequestId();
    trackScheduleAction("request_version_promotion", "attempt", {
      change_count: promotionState.summary?.totalCount ?? 0,
      has_change_summary: Boolean(promotionState.summary),
    });
  
    scheduleVersionPromotionState.value = {
      ...promotionState,
      status: "promoting",
      errorMessage: null,
    };
  
    try {
      await desktopScheduleApi.setScheduleMain(draftVersion.id);
  
      if (requestId !== getScheduleVersionPromotionRequestId()) return;
  
      await loadSchedule({ scheduleVersionId: draftVersion.id });
  
      if (requestId !== getScheduleVersionPromotionRequestId()) return;
  
      scheduleVersionPromotionState.value = createClosedScheduleVersionPromotionState();
      showScheduleToast("기준 공정표로 반영했어요.");
      trackScheduleAction("promote_version", "success", {
        change_count: promotionState.summary?.totalCount ?? 0,
      });
    } catch (error) {
      if (requestId !== getScheduleVersionPromotionRequestId()) return;
  
      const normalizedError = normalizeError(error);
      scheduleVersionPromotionState.value = {
        ...scheduleVersionPromotionState.value,
        status: "error",
        errorMessage: normalizedError.message,
      };
      showScheduleToast(normalizedError.message || "기준 공정표로 반영하지 못했어요.");
      trackScheduleAction("promote_version", "fail");
    }
  }
  
  
  return {
    updateScheduleVersionsInLoadedData,
    upsertScheduleVersionInLoadedData,
    replaceScheduleVersionInLoadedData,
    selectScheduleVersion,
    createDraftVersionFromCurrent,
    renameScheduleVersion,
    deleteScheduleVersion,
    closeScheduleVersionPromotionDialog,
    requestScheduleVersionPromotion,
    confirmScheduleVersionPromotion,
  };
}
