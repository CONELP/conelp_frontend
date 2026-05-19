import type { Ref } from "vue";

import type { DesktopScheduleVersionId } from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type { DesktopScheduleImportDialogState } from "@/features/desktop-schedule/model/desktop-schedule.types";

type DesktopScheduleImportExportDependencies = {
  scheduleImportDialogState: Ref<DesktopScheduleImportDialogState>;
  createClosedScheduleImportDialogState: () => DesktopScheduleImportDialogState;
  getSelectedScheduleVersionId: () => DesktopScheduleVersionId | null;
  isScheduleReadOnly: () => boolean;
  notifyReadOnlyScheduleAction: () => void;
  showScheduleToast: (message: string, tone?: "neutral" | "warning") => void;
  trackScheduleAction: (
    action: string,
    status: "success" | "fail",
    meta?: Record<string, string | number | boolean | null>,
  ) => void;
  loadSchedule: (options?: { scheduleVersionId?: DesktopScheduleVersionId }) => Promise<void>;
};

function triggerBlobDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function useDesktopScheduleImportExport({
  scheduleImportDialogState,
  createClosedScheduleImportDialogState,
  getSelectedScheduleVersionId,
  isScheduleReadOnly,
  notifyReadOnlyScheduleAction,
  showScheduleToast,
  trackScheduleAction,
  loadSchedule,
}: DesktopScheduleImportExportDependencies) {
  let scheduleImportSelectedFile: File | null = null;

  async function exportScheduleAsExcel(range: "3week" | "3month") {
    const scheduleVersionId = getSelectedScheduleVersionId();
    if (!scheduleVersionId) {
      showScheduleToast("공정표 버전이 선택되지 않았어요.");
      return;
    }

    try {
      const { blob, filename } =
        range === "3week"
          ? await desktopScheduleApi.export3WeekSchedule({
              scheduleVersionId,
              excludedSubWorkTypeIds: [],
            })
          : await desktopScheduleApi.export3MonthSchedule({
              scheduleVersionId,
              excludedSubWorkTypeIds: [],
            });
      const fallbackName = range === "3week" ? "3주공정표.xlsx" : "3개월공정표.xlsx";
      triggerBlobDownload(blob, filename || fallbackName);
      trackScheduleAction("export_excel", "success", {
        schedule_range: range,
      });
    } catch (error) {
      showScheduleToast(
        error instanceof Error ? error.message : "엑셀을 생성하지 못했어요.",
      );
      trackScheduleAction("export_excel", "fail", {
        schedule_range: range,
      });
    }
  }

  function openScheduleImportDialog() {
    const scheduleVersionId = getSelectedScheduleVersionId();

    if (!scheduleVersionId) {
      showScheduleToast("공정표 버전이 선택되지 않았어요.");
      return;
    }

    if (isScheduleReadOnly()) {
      notifyReadOnlyScheduleAction();
      return;
    }

    scheduleImportSelectedFile = null;
    scheduleImportDialogState.value = createClosedScheduleImportDialogState();
    scheduleImportDialogState.value = {
      ...scheduleImportDialogState.value,
      open: true,
    };
  }

  function closeScheduleImportDialog() {
    if (scheduleImportDialogState.value.status === "submitting") {
      return;
    }

    scheduleImportSelectedFile = null;
    scheduleImportDialogState.value = createClosedScheduleImportDialogState();
  }

  function setScheduleImportFile(file: File | null) {
    scheduleImportSelectedFile = file;
    scheduleImportDialogState.value = {
      ...scheduleImportDialogState.value,
      fileName: file?.name ?? null,
      errorMessage: null,
    };
  }

  function setScheduleImportStartDate(value: string) {
    scheduleImportDialogState.value = {
      ...scheduleImportDialogState.value,
      startDate: value,
      errorMessage: null,
    };
  }

  function setScheduleImportEndDate(value: string) {
    scheduleImportDialogState.value = {
      ...scheduleImportDialogState.value,
      endDate: value,
      errorMessage: null,
    };
  }

  async function submitScheduleImport() {
    if (scheduleImportDialogState.value.status === "submitting") {
      return;
    }

    const scheduleVersionId = getSelectedScheduleVersionId();

    if (!scheduleVersionId) {
      scheduleImportDialogState.value = {
        ...scheduleImportDialogState.value,
        status: "error",
        errorMessage: "공정표 버전이 선택되지 않았어요.",
      };
      return;
    }

    const file = scheduleImportSelectedFile;
    if (!file) {
      scheduleImportDialogState.value = {
        ...scheduleImportDialogState.value,
        status: "error",
        errorMessage: "엑셀 파일을 선택해 주세요.",
      };
      return;
    }

    const startDate = scheduleImportDialogState.value.startDate.trim();
    const endDate = scheduleImportDialogState.value.endDate.trim();

    if ((startDate && !endDate) || (!startDate && endDate)) {
      scheduleImportDialogState.value = {
        ...scheduleImportDialogState.value,
        status: "error",
        errorMessage: "시작일과 종료일을 모두 입력하거나 모두 비워주세요.",
      };
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      scheduleImportDialogState.value = {
        ...scheduleImportDialogState.value,
        status: "error",
        errorMessage: "종료일은 시작일 이후여야 해요.",
      };
      return;
    }

    scheduleImportDialogState.value = {
      ...scheduleImportDialogState.value,
      status: "submitting",
      errorMessage: null,
    };

    try {
      const result = await desktopScheduleApi.importScheduleExcel({
        scheduleVersionId,
        file,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      scheduleImportSelectedFile = null;
      scheduleImportDialogState.value = createClosedScheduleImportDialogState();

      await loadSchedule({ scheduleVersionId });

      showScheduleToast(
        `공정표를 불러왔어요. 작업 ${result.createdWorks}건, 의존성 ${result.createdDependencies}건 추가됨.`,
      );
      trackScheduleAction("import_excel", "success", {
        has_date_range: Boolean(startDate && endDate),
        created_work_count: result.createdWorks,
        created_dependency_count: result.createdDependencies,
      });
    } catch (error) {
      scheduleImportDialogState.value = {
        ...scheduleImportDialogState.value,
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "공정표를 불러오지 못했어요.",
      };
      trackScheduleAction("import_excel", "fail", {
        has_date_range: Boolean(startDate && endDate),
      });
    }
  }

  return {
    exportScheduleAsExcel,
    openScheduleImportDialog,
    closeScheduleImportDialog,
    setScheduleImportFile,
    setScheduleImportStartDate,
    setScheduleImportEndDate,
    submitScheduleImport,
  };
}
