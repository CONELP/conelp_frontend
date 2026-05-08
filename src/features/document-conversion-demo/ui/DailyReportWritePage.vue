<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import imageIcon from "@fluentui/svg-icons/icons/image_20_regular.svg";
import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import type { WorkTypeReferenceResponse } from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import { useDesktopScheduleViewModel } from "@/features/desktop-schedule/state/useDesktopScheduleViewModel";
import DesktopScheduleColorPalette from "@/features/desktop-schedule/ui/components/DesktopScheduleColorPalette.vue";
import DesktopScheduleContextMenu from "@/features/desktop-schedule/ui/components/DesktopScheduleContextMenu.vue";
import DesktopScheduleShell from "@/features/desktop-schedule/ui/components/DesktopScheduleShell.vue";
import "@/features/desktop-schedule/ui/styles/DesktopSchedulePage.css";

const DAILY_REPORT_LAYOUT_STORAGE_KEY = "conelp.dailyReportWrite.layoutRatio.v1";
const DAILY_REPORT_DEFAULT_SCHEDULE_RATIO = 0.67;
const DAILY_REPORT_MIN_SCHEDULE_WIDTH = 520;
const DAILY_REPORT_MIN_PANEL_WIDTH = 304;
const DAILY_REPORT_SPLITTER_WIDTH = 10;
const DAILY_REPORT_DRAFT_STORAGE_KEY = "conelp.dailyReportWrite.draft.v1";

type LayoutResizeState = {
  pointerId: number;
  layoutLeft: number;
  layoutWidth: number;
};

type DailyReportWorkSection = "today" | "tomorrow";

type DailyReportImageDraft = {
  id: string;
  src: string;
  description: string;
};

type DailyReportImageDropPosition = "before" | "after";

type DailyReportImageDragState = {
  section: DailyReportWorkSection;
  imageId: string;
};

type DailyReportImageDragOverState = DailyReportImageDragState & {
  position: DailyReportImageDropPosition;
};

type DailyReportWorkTypeDragState = {
  section: DailyReportWorkSection;
  workTypeId: string;
};

type DailyReportWorkTypeDragOverState = DailyReportWorkTypeDragState & {
  position: DailyReportImageDropPosition;
};

type DailyReportTaskDraft = {
  id: string;
  text: string;
};

type DailyReportWorkTypeDraft = {
  id: string;
  workTypeId: number | null;
  workTypeName: string;
  tasks: DailyReportTaskDraft[];
};

type DailyReportWorkTypeSuggestionState = {
  suggestions: WorkTypeReferenceResponse[];
  isLoading: boolean;
  errorMessage: string;
  isOpen: boolean;
  highlightedIndex: number;
  requestId: number;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

type DailyReportDraft = {
  todayWork?: string;
  tomorrowWork?: string;
  todayWorkTypes: DailyReportWorkTypeDraft[];
  tomorrowWorkTypes: DailyReportWorkTypeDraft[];
  todayImages: DailyReportImageDraft[];
  tomorrowImages: DailyReportImageDraft[];
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredScheduleRatio() {
  if (typeof window === "undefined") {
    return DAILY_REPORT_DEFAULT_SCHEDULE_RATIO;
  }

  const storedValue = window.localStorage.getItem(DAILY_REPORT_LAYOUT_STORAGE_KEY);
  const parsedValue = storedValue === null ? Number.NaN : Number.parseFloat(storedValue);

  return Number.isFinite(parsedValue)
    ? clampNumber(parsedValue, 0.35, 0.82)
    : DAILY_REPORT_DEFAULT_SCHEDULE_RATIO;
}

function createDailyReportImageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `daily-report-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDailyReportTask(text = ""): DailyReportTaskDraft {
  return {
    id: createDailyReportImageId(),
    text,
  };
}

function createDailyReportWorkTypeDraft(
  taskText = "",
): DailyReportWorkTypeDraft {
  return {
    id: createDailyReportImageId(),
    workTypeId: null,
    workTypeName: "",
    tasks: [createDailyReportTask(taskText)],
  };
}

function normalizeDailyReportImages(value: unknown): DailyReportImageDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (image): image is Partial<DailyReportImageDraft> =>
        typeof image === "object" && image !== null,
    )
    .map((image) => ({
      id: typeof image.id === "string" && image.id ? image.id : createDailyReportImageId(),
      src: typeof image.src === "string" ? image.src : "",
      description: typeof image.description === "string" ? image.description : "",
    }))
    .filter((image) => image.src);
}

function normalizeDailyReportTasks(value: unknown): DailyReportTaskDraft[] {
  if (!Array.isArray(value)) {
    return [createDailyReportTask()];
  }

  const tasks = value
    .filter(
      (task): task is Partial<DailyReportTaskDraft> =>
        typeof task === "object" && task !== null,
    )
    .map((task) => ({
      id: typeof task.id === "string" && task.id ? task.id : createDailyReportImageId(),
      text: typeof task.text === "string" ? task.text : "",
    }));

  return tasks.length > 0 ? tasks : [createDailyReportTask()];
}

function normalizeDailyReportWorkTypes(
  value: unknown,
  legacyText?: string,
): DailyReportWorkTypeDraft[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (workType): workType is Partial<DailyReportWorkTypeDraft> =>
          typeof workType === "object" && workType !== null,
      )
      .map((workType) => ({
        id:
          typeof workType.id === "string" && workType.id
            ? workType.id
            : createDailyReportImageId(),
        workTypeId:
          typeof workType.workTypeId === "number" && Number.isFinite(workType.workTypeId)
            ? workType.workTypeId
            : null,
        workTypeName: typeof workType.workTypeName === "string" ? workType.workTypeName : "",
        tasks: normalizeDailyReportTasks(workType.tasks),
      }));
  }

  const trimmedLegacyText = legacyText?.trim();
  return trimmedLegacyText ? [createDailyReportWorkTypeDraft(trimmedLegacyText)] : [];
}

function readStoredDailyReportDraft(): DailyReportDraft {
  if (typeof window === "undefined") {
    return {
      todayWorkTypes: [],
      tomorrowWorkTypes: [],
      todayImages: [],
      tomorrowImages: [],
    };
  }

  try {
    const storedValue = window.localStorage.getItem(DAILY_REPORT_DRAFT_STORAGE_KEY);
    const parsedValue = storedValue ? (JSON.parse(storedValue) as Partial<DailyReportDraft>) : {};

    return {
      todayWorkTypes: normalizeDailyReportWorkTypes(
        parsedValue.todayWorkTypes,
        parsedValue.todayWork,
      ),
      tomorrowWorkTypes: normalizeDailyReportWorkTypes(
        parsedValue.tomorrowWorkTypes,
        parsedValue.tomorrowWork,
      ),
      todayImages: normalizeDailyReportImages(parsedValue.todayImages),
      tomorrowImages: normalizeDailyReportImages(parsedValue.tomorrowImages),
    };
  } catch {
    return {
      todayWorkTypes: [],
      tomorrowWorkTypes: [],
      todayImages: [],
      tomorrowImages: [],
    };
  }
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("이미지 파일을 읽지 못했습니다."));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("이미지 파일을 읽지 못했습니다."));
    });
    reader.readAsDataURL(file);
  });
}

const {
  scheduleLoadStatus,
  scheduleLoadErrorMessage,
  scheduleToast,
  scheduleVersions,
  selectedScheduleVersionId,
  scheduleVersionReviewState,
  scheduleVersionPromotionState,
  selectionState,
  contextMenuState,
  contextMenuItems,
  colorPaletteState,
  connectionCreationState,
  renamingDivisionId,
  renamingWorkTypeId,
  renamingSubWorkTypeId,
  renamingItemId,
  renamingMilestoneId,
  timeline,
  shellLayout,
  rowPanelWidth,
  workTypeColumnWidth,
  chartScrollTop,
  chartScrollLeft,
  interactionCancelVersion,
  zoomScale,
  currentZoomIndex,
  maxZoomIndex,
  canZoomIn,
  canZoomOut,
  loadSchedule,
  clearSelection,
  syncChartScroll,
  setRowPanelWidth,
  setWorkTypeColumnWidth,
  selectBars,
  selectRows,
  deleteSelection,
  startDivisionRename,
  commitDivisionRename,
  cancelDivisionRename,
  startWorkTypeRename,
  commitWorkTypeRename,
  cancelWorkTypeRename,
  startSubWorkTypeRename,
  commitSubWorkTypeRename,
  cancelSubWorkTypeRename,
  reorderReferenceDivisions,
  reorderReferenceWorkTypes,
  openItemContextMenu,
  openWorkConnectionContextMenu,
  openMilestoneContextMenu,
  openRowContextMenu,
  openScheduleHeaderContextMenu,
  openCanvasContextMenu,
  executeContextMenuCommand,
  closeContextMenu,
  closeColorPalette,
  applyColorSelection,
  startItemRename,
  commitItemRename,
  cancelItemRename,
  startMilestoneRename,
  commitMilestoneRename,
  cancelMilestoneRename,
  cancelConnectionCreation,
  completeConnectionCreation,
  activateMilestone,
  startMoveSession,
  previewMoveSession,
  endMoveSession,
  startResizeSession,
  previewResizeSession,
  endResizeSession,
  setZoomIndex,
  zoomIn,
  zoomOut,
  notifyReadOnlyScheduleAction,
} = useDesktopScheduleViewModel();

const layoutRef = ref<HTMLElement | null>(null);
const shellHostRef = ref<HTMLElement | null>(null);
const todayImageInputRef = ref<HTMLInputElement | null>(null);
const tomorrowImageInputRef = ref<HTMLInputElement | null>(null);
const shellViewportHeight = ref(640);
const chartViewportWidth = ref(0);
const layoutContentWidth = ref(0);
const scheduleColumnRatio = ref(readStoredScheduleRatio());
const layoutResizeState = ref<LayoutResizeState | null>(null);
const workTypeDragState = ref<DailyReportWorkTypeDragState | null>(null);
const workTypeDragOverState = ref<DailyReportWorkTypeDragOverState | null>(null);
const imageDragState = ref<DailyReportImageDragState | null>(null);
const imageDragOverState = ref<DailyReportImageDragOverState | null>(null);
const previewImage = ref<DailyReportImageDraft | null>(null);
const workTypeSuggestionStates = ref<Record<string, DailyReportWorkTypeSuggestionState>>({});
const dailyReportDraft = readStoredDailyReportDraft();
const todayWorkTypes = ref<DailyReportWorkTypeDraft[]>(dailyReportDraft.todayWorkTypes);
const tomorrowWorkTypes = ref<DailyReportWorkTypeDraft[]>(dailyReportDraft.tomorrowWorkTypes);
const todayImages = ref<DailyReportImageDraft[]>(dailyReportDraft.todayImages);
const tomorrowImages = ref<DailyReportImageDraft[]>(dailyReportDraft.tomorrowImages);
const shouldApplyInitialTimelineScroll = ref(
  scheduleLoadStatus.value !== "success",
);
const isBaselineScheduleLoadInFlight = ref(false);
let resizeObserver: ResizeObserver | null = null;

const isScheduleRefreshing = computed(
  () =>
    scheduleLoadStatus.value === "loading" &&
    selectedScheduleVersionId.value !== null,
);
const baselineScheduleVersionId = computed(
  () => scheduleVersions.value.find((version) => version.isMain)?.id ?? null,
);
const effectiveScheduleColumnRatio = computed(() =>
  clampScheduleRatio(scheduleColumnRatio.value, layoutContentWidth.value),
);
const layoutStyle = computed(() => {
  if (layoutContentWidth.value <= 0) {
    return {};
  }

  const availableWidth = Math.max(layoutContentWidth.value - DAILY_REPORT_SPLITTER_WIDTH, 0);
  const scheduleColumnWidth = Math.round(availableWidth * effectiveScheduleColumnRatio.value);
  const panelColumnWidth = Math.max(availableWidth - scheduleColumnWidth, 0);

  return {
    "--daily-report-schedule-column": `${scheduleColumnWidth}px`,
    "--daily-report-panel-column": `${panelColumnWidth}px`,
    "--daily-report-splitter-width": `${DAILY_REPORT_SPLITTER_WIDTH}px`,
  };
});

function getElementContentWidth(element: HTMLElement) {
  const elementStyle = window.getComputedStyle(element);
  const horizontalPadding =
    Number.parseFloat(elementStyle.paddingLeft) + Number.parseFloat(elementStyle.paddingRight);

  return Math.max(element.clientWidth - horizontalPadding, 0);
}

function clampScheduleRatio(ratio: number, contentWidth = layoutContentWidth.value) {
  const availableWidth = Math.max(contentWidth - DAILY_REPORT_SPLITTER_WIDTH, 1);
  const minRatio = DAILY_REPORT_MIN_SCHEDULE_WIDTH / availableWidth;
  const maxRatio = 1 - DAILY_REPORT_MIN_PANEL_WIDTH / availableWidth;

  if (minRatio > maxRatio) {
    return clampNumber(ratio, 0.45, 0.72);
  }

  return clampNumber(ratio, minRatio, maxRatio);
}

function syncLayoutContentWidth() {
  if (!layoutRef.value) {
    return;
  }

  layoutContentWidth.value = getElementContentWidth(layoutRef.value);
}

function syncShellViewport() {
  if (!shellHostRef.value) {
    return;
  }

  const hostStyle = window.getComputedStyle(shellHostRef.value);
  const verticalPadding =
    Number.parseFloat(hostStyle.paddingTop) + Number.parseFloat(hostStyle.paddingBottom);
  const horizontalPadding =
    Number.parseFloat(hostStyle.paddingLeft) + Number.parseFloat(hostStyle.paddingRight);

  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight - verticalPadding, 320);
  chartViewportWidth.value = Math.max(
    shellHostRef.value.clientWidth - horizontalPadding - rowPanelWidth.value,
    0,
  );
}

function syncDailyReportLayout() {
  syncLayoutContentWidth();
  syncShellViewport();
}

function persistScheduleColumnRatio() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DAILY_REPORT_LAYOUT_STORAGE_KEY,
    effectiveScheduleColumnRatio.value.toFixed(4),
  );
}

function handleLayoutResizeMove(event: PointerEvent) {
  const resizeState = layoutResizeState.value;

  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }

  const availableWidth = Math.max(resizeState.layoutWidth - DAILY_REPORT_SPLITTER_WIDTH, 1);
  const nextScheduleWidth = event.clientX - resizeState.layoutLeft - DAILY_REPORT_SPLITTER_WIDTH / 2;
  const nextRatio = clampScheduleRatio(nextScheduleWidth / availableWidth, resizeState.layoutWidth);
  scheduleColumnRatio.value = nextRatio;
  requestAnimationFrame(syncShellViewport);
}

function endLayoutResize(event: PointerEvent) {
  const resizeState = layoutResizeState.value;

  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }

  layoutResizeState.value = null;
  persistScheduleColumnRatio();
  window.removeEventListener("pointermove", handleLayoutResizeMove, true);
  window.removeEventListener("pointerup", endLayoutResize, true);
  window.removeEventListener("pointercancel", endLayoutResize, true);
  requestAnimationFrame(syncShellViewport);
}

function startLayoutResize(event: PointerEvent) {
  if (!layoutRef.value) {
    return;
  }

  event.preventDefault();
  const layoutRect = layoutRef.value.getBoundingClientRect();
  const layoutStyleDeclaration = window.getComputedStyle(layoutRef.value);
  const paddingLeft = Number.parseFloat(layoutStyleDeclaration.paddingLeft);

  layoutResizeState.value = {
    pointerId: event.pointerId,
    layoutLeft: layoutRect.left + paddingLeft,
    layoutWidth: layoutContentWidth.value || getElementContentWidth(layoutRef.value),
  };

  window.addEventListener("pointermove", handleLayoutResizeMove, true);
  window.addEventListener("pointerup", endLayoutResize, true);
  window.addEventListener("pointercancel", endLayoutResize, true);
}

function handleRowPanelWidthChange(width: number) {
  setRowPanelWidth(width);
  syncShellViewport();
}

function handleWorkTypeColumnWidthChange(width: number) {
  setWorkTypeColumnWidth(width);
}

function handleZoomIn() {
  zoomIn(chartViewportWidth.value);
}

function handleZoomOut() {
  zoomOut(chartViewportWidth.value);
}

function handleZoomChange(zoomIndex: number) {
  setZoomIndex(zoomIndex, chartViewportWidth.value);
}

function handleScheduleReload() {
  shouldApplyInitialTimelineScroll.value = true;
  void loadBaselineSchedule();
}

function getImageInputRef(section: DailyReportWorkSection) {
  return section === "today" ? todayImageInputRef.value : tomorrowImageInputRef.value;
}

function getWorkTypeDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayWorkTypes.value : tomorrowWorkTypes.value;
}

function setWorkTypeDrafts(
  section: DailyReportWorkSection,
  workTypes: DailyReportWorkTypeDraft[],
) {
  if (section === "today") {
    todayWorkTypes.value = workTypes;
    return;
  }

  tomorrowWorkTypes.value = workTypes;
}

function addDailyReportWorkType(section: DailyReportWorkSection) {
  setWorkTypeDrafts(section, [
    ...getWorkTypeDrafts(section),
    createDailyReportWorkTypeDraft(),
  ]);
}

function removeDailyReportWorkType(section: DailyReportWorkSection, workTypeId: string) {
  clearWorkTypeSuggestionCloseTimer(workTypeId);
  setWorkTypeDrafts(
    section,
    getWorkTypeDrafts(section).filter((workType) => workType.id !== workTypeId),
  );
}

function moveDailyReportWorkType(
  section: DailyReportWorkSection,
  sourceWorkTypeId: string,
  targetWorkTypeId: string,
  position: DailyReportImageDropPosition,
) {
  if (sourceWorkTypeId === targetWorkTypeId) {
    return;
  }

  const workTypes = getWorkTypeDrafts(section);
  const sourceIndex = workTypes.findIndex((workType) => workType.id === sourceWorkTypeId);
  const targetIndex = workTypes.findIndex((workType) => workType.id === targetWorkTypeId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const nextWorkTypes = [...workTypes];
  const [movedWorkType] = nextWorkTypes.splice(sourceIndex, 1);

  if (!movedWorkType) {
    return;
  }

  const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  const insertIndex = position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  nextWorkTypes.splice(insertIndex, 0, movedWorkType);
  setWorkTypeDrafts(section, nextWorkTypes);
}

function handleWorkTypeDragStart(
  section: DailyReportWorkSection,
  workTypeId: string,
  event: DragEvent,
) {
  const target = event.target;

  if (target instanceof HTMLElement && target.closest("button, input, textarea")) {
    event.preventDefault();
    return;
  }

  workTypeDragState.value = { section, workTypeId };
  workTypeDragOverState.value = null;
  event.dataTransfer?.setData("text/plain", workTypeId);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleWorkTypeDragOver(
  section: DailyReportWorkSection,
  workTypeId: string,
  event: DragEvent,
) {
  const dragState = workTypeDragState.value;

  if (!dragState || dragState.section !== section || dragState.workTypeId === workTypeId) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  workTypeDragOverState.value = {
    section,
    workTypeId,
    position: getImageDropPosition(event),
  };
}

function handleWorkTypeDrop(
  section: DailyReportWorkSection,
  workTypeId: string,
  event: DragEvent,
) {
  const dragState = workTypeDragState.value;
  const position = getImageDropPosition(event);
  event.preventDefault();

  if (dragState?.section === section) {
    moveDailyReportWorkType(section, dragState.workTypeId, workTypeId, position);
  }

  workTypeDragState.value = null;
  workTypeDragOverState.value = null;
}

function endWorkTypeDrag() {
  workTypeDragState.value = null;
  workTypeDragOverState.value = null;
}

function getWorkTypeDragClass(section: DailyReportWorkSection, workTypeId: string) {
  return {
    "daily-report-worktype-entry--dragging":
      workTypeDragState.value?.section === section &&
      workTypeDragState.value.workTypeId === workTypeId,
    "daily-report-worktype-entry--drop-before":
      workTypeDragOverState.value?.section === section &&
      workTypeDragOverState.value.workTypeId === workTypeId &&
      workTypeDragOverState.value.position === "before",
    "daily-report-worktype-entry--drop-after":
      workTypeDragOverState.value?.section === section &&
      workTypeDragOverState.value.workTypeId === workTypeId &&
      workTypeDragOverState.value.position === "after",
  };
}

function addDailyReportTask(workType: DailyReportWorkTypeDraft) {
  workType.tasks.push(createDailyReportTask());
}

function removeDailyReportTask(workType: DailyReportWorkTypeDraft, taskId: string) {
  workType.tasks = workType.tasks.filter((task) => task.id !== taskId);
}

function getWorkTypeSuggestionState(workTypeId: string) {
  return workTypeSuggestionStates.value[workTypeId] ?? {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };
}

function ensureWorkTypeSuggestionState(workTypeId: string) {
  const currentState = workTypeSuggestionStates.value[workTypeId];

  if (currentState) {
    return currentState;
  }

  const nextState: DailyReportWorkTypeSuggestionState = {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };

  workTypeSuggestionStates.value = {
    ...workTypeSuggestionStates.value,
    [workTypeId]: nextState,
  };

  return nextState;
}

function clearWorkTypeSuggestionCloseTimer(workTypeId: string) {
  const state = workTypeSuggestionStates.value[workTypeId];

  if (state?.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }
}

function clearDailyReportWorkTypeSuggestions(workTypeId: string) {
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.suggestions = [];
  state.errorMessage = "";
  state.isLoading = false;
  state.isOpen = false;
  state.highlightedIndex = -1;
}

async function loadDailyReportWorkTypeSuggestions(workType: DailyReportWorkTypeDraft) {
  const query = workType.workTypeName.trim();
  const state = ensureWorkTypeSuggestionState(workType.id);
  const requestId = state.requestId + 1;
  state.requestId = requestId;

  if (!query) {
    clearDailyReportWorkTypeSuggestions(workType.id);
    return;
  }

  state.isLoading = true;
  state.errorMessage = "";
  state.isOpen = true;

  try {
    const suggestions = await materialInspectionRequestApi.getWorkTypeListByName(query);

    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = suggestions;
    state.highlightedIndex = suggestions.length > 0 ? 0 : -1;
  } catch (error) {
    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = [];
    state.highlightedIndex = -1;
    state.errorMessage =
      error instanceof Error ? error.message : "공종명을 불러오지 못했습니다.";
  } finally {
    if (state.requestId === requestId) {
      state.isLoading = false;
    }
  }
}

function handleDailyReportWorkTypeNameInput(
  workType: DailyReportWorkTypeDraft,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  workType.workTypeName = input?.value ?? "";
  workType.workTypeId = null;
  void loadDailyReportWorkTypeSuggestions(workType);
}

function setDailyReportWorkTypeHighlightedIndex(workTypeId: string, index: number) {
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.highlightedIndex = clampNumber(index, -1, state.suggestions.length - 1);
}

function handleDailyReportWorkTypeKeydown(
  workType: DailyReportWorkTypeDraft,
  event: KeyboardEvent,
) {
  const state = ensureWorkTypeSuggestionState(workType.id);
  const suggestionCount = state.suggestions.length;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    clearWorkTypeSuggestionCloseTimer(workType.id);

    if (workType.workTypeName.trim()) {
      state.isOpen = true;
    }

    if (suggestionCount === 0) {
      return;
    }

    const offset = event.key === "ArrowDown" ? 1 : -1;
    const baseIndex =
      state.highlightedIndex >= 0 ? state.highlightedIndex : event.key === "ArrowDown" ? -1 : 0;
    state.highlightedIndex = (baseIndex + offset + suggestionCount) % suggestionCount;
    return;
  }

  if (event.key === "Enter" && !event.isComposing) {
    if (!state.isOpen || suggestionCount === 0) {
      return;
    }

    event.preventDefault();
    const selectedIndex =
      state.highlightedIndex >= 0 && state.highlightedIndex < suggestionCount
        ? state.highlightedIndex
        : 0;
    const suggestion = state.suggestions[selectedIndex];

    if (suggestion) {
      selectDailyReportWorkTypeSuggestion(workType, suggestion);
    }
    return;
  }

  if (event.key === "Escape" && state.isOpen) {
    event.preventDefault();
    state.isOpen = false;
    state.highlightedIndex = -1;
  }
}

function openDailyReportWorkTypeSuggestionList(workType: DailyReportWorkTypeDraft) {
  clearWorkTypeSuggestionCloseTimer(workType.id);

  const state = ensureWorkTypeSuggestionState(workType.id);
  const query = workType.workTypeName.trim();

  if (!query) {
    return;
  }

  state.isOpen = true;
  state.highlightedIndex =
    state.highlightedIndex >= 0 ? state.highlightedIndex : state.suggestions.length > 0 ? 0 : -1;

  if (!state.isLoading && state.suggestions.length === 0) {
    void loadDailyReportWorkTypeSuggestions(workType);
  }
}

function scheduleCloseDailyReportWorkTypeSuggestionList(workTypeId: string) {
  clearWorkTypeSuggestionCloseTimer(workTypeId);
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.closeTimer = setTimeout(() => {
    state.isOpen = false;
    state.closeTimer = null;
  }, 120);
}

function selectDailyReportWorkTypeSuggestion(
  workType: DailyReportWorkTypeDraft,
  suggestion: WorkTypeReferenceResponse,
) {
  clearWorkTypeSuggestionCloseTimer(workType.id);
  const state = ensureWorkTypeSuggestionState(workType.id);
  state.requestId += 1;
  workType.workTypeId = suggestion.id;
  workType.workTypeName = suggestion.name;
  state.suggestions = [];
  state.errorMessage = "";
  state.isOpen = false;
  state.highlightedIndex = -1;
}

function getImageDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayImages.value : tomorrowImages.value;
}

function setImageDrafts(section: DailyReportWorkSection, images: DailyReportImageDraft[]) {
  if (section === "today") {
    todayImages.value = images;
    return;
  }

  tomorrowImages.value = images;
}

function openImagePicker(section: DailyReportWorkSection) {
  getImageInputRef(section)?.click();
}

async function handleDailyReportImageChange(section: DailyReportWorkSection, event: Event) {
  const input = event.target as HTMLInputElement | null;
  const files = Array.from(input?.files ?? []).filter((file) => file.type.startsWith("image/"));

  if (input) {
    input.value = "";
  }

  if (files.length === 0) {
    return;
  }

  const nextImages = await Promise.all(
    files.map(async (file) => ({
      id: createDailyReportImageId(),
      src: await readImageFileAsDataUrl(file),
      description: "",
    })),
  );

  setImageDrafts(section, [...getImageDrafts(section), ...nextImages]);
}

function removeDailyReportImage(section: DailyReportWorkSection, imageId: string) {
  setImageDrafts(
    section,
    getImageDrafts(section).filter((image) => image.id !== imageId),
  );
}

function openDailyReportImagePreview(image: DailyReportImageDraft) {
  previewImage.value = image;
}

function closeDailyReportImagePreview() {
  previewImage.value = null;
}

function getImageDropPosition(event: DragEvent): DailyReportImageDropPosition {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return "after";
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientY > targetRect.top + targetRect.height / 2 ? "after" : "before";
}

function moveDailyReportImage(
  section: DailyReportWorkSection,
  sourceImageId: string,
  targetImageId: string,
  position: DailyReportImageDropPosition,
) {
  if (sourceImageId === targetImageId) {
    return;
  }

  const images = getImageDrafts(section);
  const sourceIndex = images.findIndex((image) => image.id === sourceImageId);
  const targetIndex = images.findIndex((image) => image.id === targetImageId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const nextImages = [...images];
  const [movedImage] = nextImages.splice(sourceIndex, 1);

  if (!movedImage) {
    return;
  }

  const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  const insertIndex = position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  nextImages.splice(insertIndex, 0, movedImage);
  setImageDrafts(section, nextImages);
}

function handleImageDragStart(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const target = event.target;

  if (target instanceof HTMLElement && target.closest("button, input, textarea")) {
    event.preventDefault();
    return;
  }

  imageDragState.value = { section, imageId };
  imageDragOverState.value = null;
  event.dataTransfer?.setData("text/plain", imageId);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleImageDragOver(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const dragState = imageDragState.value;

  if (!dragState || dragState.section !== section || dragState.imageId === imageId) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  imageDragOverState.value = {
    section,
    imageId,
    position: getImageDropPosition(event),
  };
}

function handleImageDrop(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const dragState = imageDragState.value;
  const position = getImageDropPosition(event);
  event.preventDefault();

  if (dragState?.section === section) {
    moveDailyReportImage(section, dragState.imageId, imageId, position);
  }

  imageDragState.value = null;
  imageDragOverState.value = null;
}

function endImageDrag() {
  imageDragState.value = null;
  imageDragOverState.value = null;
}

function getImageCardDragClass(section: DailyReportWorkSection, imageId: string) {
  return {
    "daily-report-write-image-card--dragging":
      imageDragState.value?.section === section && imageDragState.value.imageId === imageId,
    "daily-report-write-image-card--drop-before":
      imageDragOverState.value?.section === section &&
      imageDragOverState.value.imageId === imageId &&
      imageDragOverState.value.position === "before",
    "daily-report-write-image-card--drop-after":
      imageDragOverState.value?.section === section &&
      imageDragOverState.value.imageId === imageId &&
      imageDragOverState.value.position === "after",
  };
}

function handleDailyReportSave() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DAILY_REPORT_DRAFT_STORAGE_KEY,
    JSON.stringify({
      todayWorkTypes: todayWorkTypes.value,
      tomorrowWorkTypes: tomorrowWorkTypes.value,
      todayImages: todayImages.value,
      tomorrowImages: tomorrowImages.value,
    }),
  );
}

async function ensureBaselineScheduleSelected() {
  const baselineId = baselineScheduleVersionId.value;

  if (
    baselineId === null ||
    selectedScheduleVersionId.value === baselineId ||
    isBaselineScheduleLoadInFlight.value
  ) {
    return;
  }

  isBaselineScheduleLoadInFlight.value = true;

  try {
    shouldApplyInitialTimelineScroll.value = true;
    await loadSchedule({ scheduleVersionId: baselineId });
  } finally {
    isBaselineScheduleLoadInFlight.value = false;
  }
}

async function loadBaselineSchedule() {
  await loadSchedule();
  await ensureBaselineScheduleSelected();
}

onMounted(() => {
  if (shellHostRef.value || layoutRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncDailyReportLayout();
    });
    if (layoutRef.value) {
      resizeObserver.observe(layoutRef.value);
    }
    if (shellHostRef.value) {
      resizeObserver.observe(shellHostRef.value);
    }
    syncDailyReportLayout();
  }

  if (scheduleLoadStatus.value === "idle") {
    void loadBaselineSchedule();
  } else {
    void ensureBaselineScheduleSelected();
  }
});

onUnmounted(() => {
  window.removeEventListener("pointermove", handleLayoutResizeMove, true);
  window.removeEventListener("pointerup", endLayoutResize, true);
  window.removeEventListener("pointercancel", endLayoutResize, true);
  resizeObserver?.disconnect();
  resizeObserver = null;
  Object.values(workTypeSuggestionStates.value).forEach((state) => {
    if (state.closeTimer) {
      clearTimeout(state.closeTimer);
    }
    state.requestId += 1;
  });
  closeContextMenu();
  closeColorPalette();
  cancelConnectionCreation();
});

watch(
  () =>
    [
      scheduleLoadStatus.value,
      baselineScheduleVersionId.value,
      selectedScheduleVersionId.value,
    ] as const,
  ([nextScheduleLoadStatus]) => {
    if (nextScheduleLoadStatus !== "success") {
      return;
    }

    void ensureBaselineScheduleSelected();
  },
);

watch(
  () =>
    [
      scheduleLoadStatus.value,
      timeline.value,
      chartViewportWidth.value,
    ] as const,
  async ([nextScheduleLoadStatus, nextTimeline, nextChartViewportWidth]) => {
    if (
      nextScheduleLoadStatus !== "success" ||
      !shouldApplyInitialTimelineScroll.value ||
      nextChartViewportWidth <= 0
    ) {
      return;
    }

    await nextTick();
    syncChartScroll({
      top: 0,
      left: desktopScheduleService.getInitialScrollLeftForYesterday(
        nextTimeline,
        nextChartViewportWidth,
      ),
    });
    shouldApplyInitialTimelineScroll.value = false;
  },
  { immediate: true },
);

</script>

<template>
  <main class="daily-report-write-page">
    <DesktopAppHeader />

    <Transition name="desktop-schedule-toast">
      <div
        v-if="scheduleToast.visible"
        class="desktop-schedule-page__toast"
        :class="`desktop-schedule-page__toast--${scheduleToast.tone}`"
        role="status"
        aria-live="polite"
      >
        {{ scheduleToast.message }}
      </div>
    </Transition>

    <section
      ref="layoutRef"
      class="daily-report-write-layout"
      :class="{ 'daily-report-write-layout--resizing': layoutResizeState }"
      :style="layoutStyle"
    >
      <section
        ref="shellHostRef"
        class="daily-report-write-schedule"
        aria-label="공정표"
      >
        <div
          v-if="
            scheduleLoadStatus === 'idle' ||
            (scheduleLoadStatus === 'loading' && !isScheduleRefreshing)
          "
          class="desktop-schedule-page__state"
        >
          <p class="desktop-schedule-page__state-title">
            공정표 데이터를 불러오는 중이에요.
          </p>
        </div>

        <div
          v-else-if="scheduleLoadStatus === 'error'"
          class="desktop-schedule-page__state"
        >
          <p class="desktop-schedule-page__state-title">
            공정표 데이터를 불러오지 못했어요.
          </p>
          <p class="desktop-schedule-page__state-description">
            {{ scheduleLoadErrorMessage }}
          </p>
          <button
            type="button"
            class="desktop-schedule-page__state-action"
            @click="handleScheduleReload"
          >
            다시 불러오기
          </button>
        </div>

        <template v-else>
          <DesktopScheduleShell
            :timeline="timeline"
            :shell-layout="shellLayout"
            :read-only="true"
            reference-only
            :schedule-versions="scheduleVersions"
            :selected-schedule-version-id="selectedScheduleVersionId"
            version-name="기준 공정표"
            version-mode-label="기준 공정표"
            version-access-label="읽기 전용"
            suggested-draft-version-name=""
            :can-create-draft-version="false"
            :can-compare-schedule-version="false"
            :can-promote-schedule-version="false"
            :schedule-version-review="scheduleVersionReviewState"
            :schedule-version-promotion="scheduleVersionPromotionState"
            :viewport-height="shellViewportHeight"
            :scroll-top="chartScrollTop"
            :scroll-left="chartScrollLeft"
            :interaction-cancel-version="interactionCancelVersion"
            :selected-row-ids="selectionState.rowIds"
            :selected-item-ids="selectionState.itemIds"
            :selected-work-connection-ids="selectionState.workConnectionIds"
            :selected-milestone-ids="selectionState.milestoneIds"
            :connection-creation-state="connectionCreationState"
            :row-panel-width="rowPanelWidth"
            :work-type-column-width="workTypeColumnWidth"
            :editing-division-id="renamingDivisionId"
            :editing-work-type-id="renamingWorkTypeId"
            :editing-sub-work-type-id="renamingSubWorkTypeId"
            :editing-item-id="renamingItemId"
            :editing-milestone-id="renamingMilestoneId"
            :zoom-index="currentZoomIndex"
            :zoom-max="maxZoomIndex"
            :zoom-scale="zoomScale"
            :can-zoom-in="canZoomIn"
            :can-zoom-out="canZoomOut"
            :can-undo="false"
            :can-redo="false"
            @scroll-sync="syncChartScroll"
            @row-panel-width-change="handleRowPanelWidthChange"
            @work-type-column-width-change="handleWorkTypeColumnWidthChange"
            @readonly-edit-attempt="notifyReadOnlyScheduleAction"
            @clear-selection="clearSelection"
            @select-bars="selectBars"
            @select-row="(rowId: string) => selectRows({ rowIds: [rowId] })"
            @start-division-rename="startDivisionRename"
            @commit-division-rename="commitDivisionRename"
            @cancel-division-rename="cancelDivisionRename"
            @start-work-type-rename="startWorkTypeRename"
            @commit-work-type-rename="commitWorkTypeRename"
            @cancel-work-type-rename="cancelWorkTypeRename"
            @start-sub-work-type-rename="startSubWorkTypeRename"
            @commit-sub-work-type-rename="commitSubWorkTypeRename"
            @cancel-sub-work-type-rename="cancelSubWorkTypeRename"
            @reorder-divisions="reorderReferenceDivisions"
            @reorder-work-types="reorderReferenceWorkTypes"
            @delete-selection="deleteSelection"
            @item-context-menu="openItemContextMenu"
            @work-connection-context-menu="openWorkConnectionContextMenu"
            @milestone-context-menu="openMilestoneContextMenu"
            @row-context-menu="openRowContextMenu"
            @header-context-menu="openScheduleHeaderContextMenu"
            @canvas-context-menu="openCanvasContextMenu"
            @cancel-connection-create="cancelConnectionCreation"
            @complete-connection-create="completeConnectionCreation"
            @start-item-rename="startItemRename"
            @commit-item-rename="commitItemRename"
            @cancel-item-rename="cancelItemRename"
            @start-milestone-rename="startMilestoneRename"
            @commit-milestone-rename="commitMilestoneRename"
            @cancel-milestone-rename="cancelMilestoneRename"
            @milestone-activate="activateMilestone"
            @move-start="startMoveSession"
            @move-preview="previewMoveSession"
            @move-end="endMoveSession"
            @resize-start="startResizeSession"
            @resize-preview="previewResizeSession"
            @resize-end="endResizeSession"
            @zoom-in="handleZoomIn"
            @zoom-out="handleZoomOut"
            @zoom-change="handleZoomChange"
          />

          <DesktopScheduleContextMenu
            :open="contextMenuState.open"
            :x="contextMenuState.x"
            :y="contextMenuState.y"
            :items="contextMenuItems"
            @close="closeContextMenu"
            @select="executeContextMenuCommand"
          />

          <DesktopScheduleColorPalette
            :open="colorPaletteState.open"
            :x="colorPaletteState.x"
            :y="colorPaletteState.y"
            :selected-color="colorPaletteState.selectedColor"
            @close="closeColorPalette"
            @select="applyColorSelection"
          />

          <Transition name="desktop-schedule-refresh">
            <div
              v-if="isScheduleRefreshing"
              class="desktop-schedule-page__refresh-overlay"
              role="status"
              aria-live="polite"
            >
              <div class="desktop-schedule-page__refresh-card">
                <span
                  class="desktop-schedule-page__refresh-indicator"
                  aria-hidden="true"
                />
                <span>공정표를 불러오는 중이에요.</span>
              </div>
            </div>
          </Transition>
        </template>
      </section>

      <button
        type="button"
        class="daily-report-write-splitter"
        aria-label="공정표와 작업 작성 영역 너비 조절"
        title="드래그해서 영역 너비 조절"
        @pointerdown="startLayoutResize"
      >
        <span class="daily-report-write-splitter__line" aria-hidden="true" />
      </button>

      <aside class="daily-report-write-panel" aria-label="공사일보 작성">
        <div class="daily-report-write-panel__content">
	          <section class="daily-report-write-editor">
	            <label class="daily-report-write-editor__label">
	              오늘 작업
	            </label>
            <input
              ref="todayImageInputRef"
              class="daily-report-write-editor__file-input"
              type="file"
              accept="image/*"
              multiple
              @change="handleDailyReportImageChange('today', $event)"
            />
	            <div class="daily-report-write-work-cell">
	              <div class="daily-report-worktype-list">
	                <article
	                  v-for="workType in todayWorkTypes"
	                  :key="workType.id"
	                  class="daily-report-worktype-entry"
	                  :class="getWorkTypeDragClass('today', workType.id)"
	                  draggable="true"
	                  @dragstart="handleWorkTypeDragStart('today', workType.id, $event)"
	                  @dragover="handleWorkTypeDragOver('today', workType.id, $event)"
	                  @dragleave="workTypeDragOverState = null"
	                  @drop="handleWorkTypeDrop('today', workType.id, $event)"
	                  @dragend="endWorkTypeDrag"
	                >
	                  <label class="daily-report-worktype-field">
	                    <span class="daily-report-worktype-field__control">
	                      <span class="daily-report-worktype-field__marker" aria-hidden="true" />
	                      <input
	                        :value="workType.workTypeName"
	                        class="daily-report-worktype-field__input"
	                        type="text"
	                        autocomplete="off"
	                        placeholder="공종명을 입력해 주세요."
	                        role="combobox"
	                        :aria-expanded="getWorkTypeSuggestionState(workType.id).isOpen"
	                        aria-autocomplete="list"
	                        @input="handleDailyReportWorkTypeNameInput(workType, $event)"
	                        @keydown="handleDailyReportWorkTypeKeydown(workType, $event)"
	                        @focus="openDailyReportWorkTypeSuggestionList(workType)"
	                        @blur="scheduleCloseDailyReportWorkTypeSuggestionList(workType.id)"
	                      />

	                      <Transition name="daily-report-typeahead">
	                        <div
	                          v-if="getWorkTypeSuggestionState(workType.id).isOpen"
	                          class="daily-report-typeahead"
	                          role="listbox"
	                          aria-label="공종명 후보"
	                          @mousedown.prevent
	                        >
	                          <p
	                            v-if="getWorkTypeSuggestionState(workType.id).isLoading"
	                            class="daily-report-typeahead__state"
	                          >
	                            불러오는 중
	                          </p>
	                          <p
	                            v-else-if="getWorkTypeSuggestionState(workType.id).errorMessage"
	                            class="daily-report-typeahead__state"
	                          >
	                            {{ getWorkTypeSuggestionState(workType.id).errorMessage }}
	                          </p>
	                          <template
	                            v-else-if="
	                              getWorkTypeSuggestionState(workType.id).suggestions.length > 0
	                            "
	                          >
	                            <button
	                              v-for="(suggestion, suggestionIndex) in getWorkTypeSuggestionState(
	                                workType.id,
	                              ).suggestions"
	                              :key="suggestion.id"
	                              class="daily-report-typeahead__option"
	                              :class="{
	                                'daily-report-typeahead__option--highlighted':
	                                  getWorkTypeSuggestionState(workType.id).highlightedIndex ===
	                                  suggestionIndex,
	                              }"
	                              type="button"
	                              role="option"
	                              :aria-selected="
	                                getWorkTypeSuggestionState(workType.id).highlightedIndex ===
	                                suggestionIndex
	                              "
	                              @mouseenter="
	                                setDailyReportWorkTypeHighlightedIndex(
	                                  workType.id,
	                                  suggestionIndex,
	                                )
	                              "
	                              @click="selectDailyReportWorkTypeSuggestion(workType, suggestion)"
	                            >
	                              {{ suggestion.name }}
	                            </button>
	                          </template>
	                          <p
	                            v-else-if="workType.workTypeName.trim() && workType.workTypeId === null"
	                            class="daily-report-typeahead__state"
	                          >
	                            매칭되는 공종명이 없어요
	                          </p>
	                        </div>
	                      </Transition>
	                    </span>
	                  </label>
	                  <button
	                    type="button"
	                    class="daily-report-worktype-delete"
	                    aria-label="공종 삭제"
	                    @click="removeDailyReportWorkType('today', workType.id)"
	                  >
	                    ×
	                  </button>

	                  <div class="daily-report-task-list">
	                    <div
	                      v-for="task in workType.tasks"
	                      :key="task.id"
	                      class="daily-report-task-row"
	                    >
	                      <span class="daily-report-task-row__bullet" aria-hidden="true">-</span>
	                      <input
	                        v-model="task.text"
	                        class="daily-report-task-input"
	                        type="text"
	                        placeholder="작업 사항을 입력해 주세요."
	                      />
	                      <button
	                        type="button"
	                        class="daily-report-task-delete"
	                        aria-label="작업사항 삭제"
	                        @click="removeDailyReportTask(workType, task.id)"
	                      >
	                        ×
	                      </button>
	                    </div>
	                    <button
	                      type="button"
	                      class="daily-report-task-add"
	                      @click="addDailyReportTask(workType)"
	                    >
	                      + 작업 사항 추가
	                    </button>
	                  </div>
	                </article>

	                <button
	                  type="button"
	                  class="daily-report-worktype-add"
	                  @click="addDailyReportWorkType('today')"
		                >
		                  <span class="daily-report-worktype-add__box" aria-hidden="true">
		                    +
		                  </span>
		                  <span>공정 추가</span>
		                </button>
	              </div>
	              <div class="daily-report-write-attachments">
                <TransitionGroup
                  v-if="todayImages.length > 0"
                  name="daily-report-image-list"
                  tag="div"
                  class="daily-report-write-image-list"
                >
                  <article
                  v-for="image in todayImages"
                  :key="image.id"
                  class="daily-report-write-image-card"
                  :class="getImageCardDragClass('today', image.id)"
                  draggable="true"
                  @dragstart="handleImageDragStart('today', image.id, $event)"
                  @dragover="handleImageDragOver('today', image.id, $event)"
                  @dragleave="imageDragOverState = null"
                  @drop="handleImageDrop('today', image.id, $event)"
                  @dragend="endImageDrag"
                >
                    <figure
                      class="daily-report-write-image-card__preview"
                      @click="openDailyReportImagePreview(image)"
                    >
                      <img
                        class="daily-report-write-image-card__image"
                        :src="image.src"
                        alt=""
                        draggable="false"
                      />
                    </figure>
                    <input
                      v-model="image.description"
                      class="daily-report-write-image-card__description"
                      type="text"
                      placeholder="설명을 적어주세요."
                    />
                    <button
                      type="button"
                      class="daily-report-write-image-card__remove"
                      aria-label="이미지 삭제"
                      @click.stop="removeDailyReportImage('today', image.id)"
                    >
                      ×
                    </button>
                  </article>
                </TransitionGroup>

                <button
                  type="button"
                  class="daily-report-write-attachments__add"
                  @click="openImagePicker('today')"
                >
                  <span class="daily-report-write-attachments__add-box" aria-hidden="true">
                    <img
                      class="daily-report-write-attachments__add-icon"
                      :src="imageIcon"
                      alt=""
                    />
                  </span>
                  <span>이미지 추가</span>
                </button>
              </div>
            </div>
          </section>

	          <section class="daily-report-write-editor">
	            <label class="daily-report-write-editor__label">
	              내일 작업
	            </label>
            <input
              ref="tomorrowImageInputRef"
              class="daily-report-write-editor__file-input"
              type="file"
              accept="image/*"
              multiple
              @change="handleDailyReportImageChange('tomorrow', $event)"
            />
	            <div class="daily-report-write-work-cell">
	              <div class="daily-report-worktype-list">
	                <article
	                  v-for="workType in tomorrowWorkTypes"
	                  :key="workType.id"
	                  class="daily-report-worktype-entry"
	                  :class="getWorkTypeDragClass('tomorrow', workType.id)"
	                  draggable="true"
	                  @dragstart="handleWorkTypeDragStart('tomorrow', workType.id, $event)"
	                  @dragover="handleWorkTypeDragOver('tomorrow', workType.id, $event)"
	                  @dragleave="workTypeDragOverState = null"
	                  @drop="handleWorkTypeDrop('tomorrow', workType.id, $event)"
	                  @dragend="endWorkTypeDrag"
	                >
	                  <label class="daily-report-worktype-field">
	                    <span class="daily-report-worktype-field__control">
	                      <span class="daily-report-worktype-field__marker" aria-hidden="true" />
	                      <input
	                        :value="workType.workTypeName"
	                        class="daily-report-worktype-field__input"
	                        type="text"
	                        autocomplete="off"
	                        placeholder="공종명을 입력해 주세요."
	                        role="combobox"
	                        :aria-expanded="getWorkTypeSuggestionState(workType.id).isOpen"
	                        aria-autocomplete="list"
	                        @input="handleDailyReportWorkTypeNameInput(workType, $event)"
	                        @keydown="handleDailyReportWorkTypeKeydown(workType, $event)"
	                        @focus="openDailyReportWorkTypeSuggestionList(workType)"
	                        @blur="scheduleCloseDailyReportWorkTypeSuggestionList(workType.id)"
	                      />

	                      <Transition name="daily-report-typeahead">
	                        <div
	                          v-if="getWorkTypeSuggestionState(workType.id).isOpen"
	                          class="daily-report-typeahead"
	                          role="listbox"
	                          aria-label="공종명 후보"
	                          @mousedown.prevent
	                        >
	                          <p
	                            v-if="getWorkTypeSuggestionState(workType.id).isLoading"
	                            class="daily-report-typeahead__state"
	                          >
	                            불러오는 중
	                          </p>
	                          <p
	                            v-else-if="getWorkTypeSuggestionState(workType.id).errorMessage"
	                            class="daily-report-typeahead__state"
	                          >
	                            {{ getWorkTypeSuggestionState(workType.id).errorMessage }}
	                          </p>
	                          <template
	                            v-else-if="
	                              getWorkTypeSuggestionState(workType.id).suggestions.length > 0
	                            "
	                          >
	                            <button
	                              v-for="(suggestion, suggestionIndex) in getWorkTypeSuggestionState(
	                                workType.id,
	                              ).suggestions"
	                              :key="suggestion.id"
	                              class="daily-report-typeahead__option"
	                              :class="{
	                                'daily-report-typeahead__option--highlighted':
	                                  getWorkTypeSuggestionState(workType.id).highlightedIndex ===
	                                  suggestionIndex,
	                              }"
	                              type="button"
	                              role="option"
	                              :aria-selected="
	                                getWorkTypeSuggestionState(workType.id).highlightedIndex ===
	                                suggestionIndex
	                              "
	                              @mouseenter="
	                                setDailyReportWorkTypeHighlightedIndex(
	                                  workType.id,
	                                  suggestionIndex,
	                                )
	                              "
	                              @click="selectDailyReportWorkTypeSuggestion(workType, suggestion)"
	                            >
	                              {{ suggestion.name }}
	                            </button>
	                          </template>
	                          <p
	                            v-else-if="workType.workTypeName.trim() && workType.workTypeId === null"
	                            class="daily-report-typeahead__state"
	                          >
	                            매칭되는 공종명이 없어요
	                          </p>
	                        </div>
	                      </Transition>
	                    </span>
	                  </label>
	                  <button
	                    type="button"
	                    class="daily-report-worktype-delete"
	                    aria-label="공종 삭제"
	                    @click="removeDailyReportWorkType('tomorrow', workType.id)"
	                  >
	                    ×
	                  </button>

	                  <div class="daily-report-task-list">
	                    <div
	                      v-for="task in workType.tasks"
	                      :key="task.id"
	                      class="daily-report-task-row"
	                    >
	                      <span class="daily-report-task-row__bullet" aria-hidden="true">-</span>
	                      <input
	                        v-model="task.text"
	                        class="daily-report-task-input"
	                        type="text"
	                        placeholder="작업 사항을 입력해 주세요."
	                      />
	                      <button
	                        type="button"
	                        class="daily-report-task-delete"
	                        aria-label="작업사항 삭제"
	                        @click="removeDailyReportTask(workType, task.id)"
	                      >
	                        ×
	                      </button>
	                    </div>
	                    <button
	                      type="button"
	                      class="daily-report-task-add"
	                      @click="addDailyReportTask(workType)"
	                    >
	                      + 작업 사항 추가
	                    </button>
	                  </div>
	                </article>

	                <button
	                  type="button"
	                  class="daily-report-worktype-add"
	                  @click="addDailyReportWorkType('tomorrow')"
		                >
		                  <span class="daily-report-worktype-add__box" aria-hidden="true">
		                    +
		                  </span>
		                  <span>공정 추가</span>
		                </button>
	              </div>
	              <div class="daily-report-write-attachments">
                <TransitionGroup
                  v-if="tomorrowImages.length > 0"
                  name="daily-report-image-list"
                  tag="div"
                  class="daily-report-write-image-list"
                >
                  <article
                  v-for="image in tomorrowImages"
                  :key="image.id"
                  class="daily-report-write-image-card"
                  :class="getImageCardDragClass('tomorrow', image.id)"
                  draggable="true"
                  @dragstart="handleImageDragStart('tomorrow', image.id, $event)"
                  @dragover="handleImageDragOver('tomorrow', image.id, $event)"
                  @dragleave="imageDragOverState = null"
                  @drop="handleImageDrop('tomorrow', image.id, $event)"
                  @dragend="endImageDrag"
                >
                    <figure
                      class="daily-report-write-image-card__preview"
                      @click="openDailyReportImagePreview(image)"
                    >
                      <img
                        class="daily-report-write-image-card__image"
                        :src="image.src"
                        alt=""
                        draggable="false"
                      />
                    </figure>
                    <input
                      v-model="image.description"
                      class="daily-report-write-image-card__description"
                      type="text"
                      placeholder="설명을 적어주세요."
                    />
                    <button
                      type="button"
                      class="daily-report-write-image-card__remove"
                      aria-label="이미지 삭제"
                      @click.stop="removeDailyReportImage('tomorrow', image.id)"
                    >
                      ×
                    </button>
                  </article>
                </TransitionGroup>

                <button
                  type="button"
                  class="daily-report-write-attachments__add"
                  @click="openImagePicker('tomorrow')"
                >
                  <span class="daily-report-write-attachments__add-box" aria-hidden="true">
                    <img
                      class="daily-report-write-attachments__add-icon"
                      :src="imageIcon"
                      alt=""
                    />
                  </span>
                  <span>이미지 추가</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <footer class="daily-report-write-save-bar">
          <button
            type="button"
            class="daily-report-write-save-button"
            @click="handleDailyReportSave"
          >
            저장하기
          </button>
        </footer>
      </aside>
    </section>

    <Transition name="daily-report-image-preview">
      <div
        v-if="previewImage"
        class="daily-report-image-preview"
        role="presentation"
        @click.self="closeDailyReportImagePreview"
      >
        <section
          class="daily-report-image-preview__dialog"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 크게 보기"
        >
          <button
            type="button"
            class="daily-report-image-preview__close"
            aria-label="닫기"
            @click="closeDailyReportImagePreview"
          >
            ×
          </button>
          <img
            class="daily-report-image-preview__image"
            :src="previewImage.src"
            alt=""
          />
          <p
            v-if="previewImage.description"
            class="daily-report-image-preview__description"
          >
            {{ previewImage.description }}
          </p>
        </section>
      </div>
    </Transition>
  </main>
</template>

<style scoped src="./styles/DailyReportWritePage.css"></style>
