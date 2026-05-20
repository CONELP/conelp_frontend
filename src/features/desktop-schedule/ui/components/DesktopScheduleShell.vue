<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";

import type {
  DesktopScheduleImportDialogState,
  DesktopScheduleShellLayout,
  DesktopScheduleTimelineLayout,
  DesktopScheduleVersionPromotionState,
  DesktopScheduleVersionReviewState,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import DesktopScheduleChartBody from "@/features/desktop-schedule/ui/components/DesktopScheduleChartBody.vue";
import DesktopScheduleRowPanel from "@/features/desktop-schedule/ui/components/DesktopScheduleRowPanel.vue";
import DesktopScheduleTimelineHeader from "@/features/desktop-schedule/ui/components/DesktopScheduleTimelineHeader.vue";
import {
  CREATE_DIVISION_FOOTER_HEIGHT,
  READONLY_NOTICE_HEIGHT,
  ROW_PANEL_MAX_WIDTH,
  ROW_PANEL_MIN_WIDTH,
  SHELL_FRAME_BORDER_WIDTH,
  SHELL_HEADER_HEIGHT,
  SHELL_HEADER_MONTH_HEIGHT,
  SHELL_HEADER_WEEK_HEIGHT,
  SHELL_STACK_GAP,
  SHELL_SURFACE_BORDER_WIDTH,
  SHELL_SURFACE_GAP,
  SHELL_SURFACE_PADDING_Y,
  SHELL_TOOLBAR_HEIGHT,
  WIDTH_RESIZE_LISTENER_OPTIONS,
} from "@/features/desktop-schedule/ui/components/desktop-schedule-shell.constants";
import panelLeftContractIcon from "@fluentui/svg-icons/icons/panel_left_contract_20_regular.svg";
import panelLeftExpandIcon from "@fluentui/svg-icons/icons/panel_left_expand_20_regular.svg";
import panelRightContractIcon from "@fluentui/svg-icons/icons/panel_right_contract_20_regular.svg";
import panelRightExpandIcon from "@fluentui/svg-icons/icons/panel_right_expand_20_regular.svg";
import redoIcon from "@fluentui/svg-icons/icons/arrow_redo_20_regular.svg";
import undoIcon from "@fluentui/svg-icons/icons/arrow_undo_20_regular.svg";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleContextMenu.css";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleShell.css";


type ConnectionCreationState = {
  kind: "work-connection";
  sourceItemId: string;
};

type ScheduleVersionOption = {
  id: number;
  versionName: string;
  isMain: boolean;
  setMainAt?: string | null;
};

type PastMainScheduleVersionOption = {
  id: number;
  versionName: string;
  setMainAt?: string | null;
};

type ScheduleGridCell = {
  rowId: string;
  date: string;
};

const props = defineProps<{
  timeline: DesktopScheduleTimelineLayout;
  shellLayout: DesktopScheduleShellLayout;
  readOnly: boolean;
  referenceOnly?: boolean;
  scheduleVersions: ScheduleVersionOption[];
  pastMainScheduleVersions?: PastMainScheduleVersionOption[];
  selectedScheduleVersionId: number | null;
  versionName: string;
  versionModeLabel: string;
  versionAccessLabel: string;
  suggestedDraftVersionName: string;
  canCreateDraftVersion: boolean;
  canCompareScheduleVersion: boolean;
  canPromoteScheduleVersion: boolean;
  scheduleVersionReview: DesktopScheduleVersionReviewState;
  scheduleVersionPromotion: DesktopScheduleVersionPromotionState;
  scheduleImportDialog: DesktopScheduleImportDialogState;
  isAiVerificationModeActive: boolean;
  aiVerificationFlaggedItemIds: string[];
  viewportHeight?: number;
  scrollTop: number;
  scrollLeft: number;
  rowPanelWidth: number;
  workTypeColumnWidth: number;
  interactionCancelVersion: number;
  selectedRowIds: string[];
  selectedItemIds: string[];
  selectedWorkConnectionIds: string[];
  selectedMilestoneIds: string[];
  connectionCreationState: ConnectionCreationState | null;
  editingDivisionId: number | null;
  editingWorkTypeId: number | null;
  editingSubWorkTypeId: number | null;
  editingItemId: string | null;
  editingMilestoneId: string | null;
  zoomIndex: number;
  zoomMax: number;
  zoomScale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historySyncing: boolean;
  compactView?: boolean;
  panelOpen?: boolean;
  showPanelToggle?: boolean;
  panelToggleOpenLabel?: string;
  panelToggleClosedLabel?: string;
  leftPanelOpen?: boolean;
  showLeftPanelToggle?: boolean;
  leftPanelToggleOpenLabel?: string;
  leftPanelToggleClosedLabel?: string;
}>();

const emit = defineEmits<{
  "scroll-sync": [position: { top: number; left: number }];
  "row-panel-width-change": [width: number];
  "work-type-column-width-change": [width: number];
  "clear-selection": [];
  "select-bars": [payload: { itemIds: string[]; rowIds: string[]; milestoneIds?: string[] }];
  "select-row": [rowId: string];
  "start-division-rename": [divisionId: number];
  "commit-division-rename": [payload: { divisionId: number; name: string }];
  "cancel-division-rename": [];
  "start-work-type-rename": [workTypeId: number];
  "commit-work-type-rename": [payload: { workTypeId: number; name: string }];
  "cancel-work-type-rename": [];
  "start-sub-work-type-rename": [subWorkTypeId: number];
  "commit-sub-work-type-rename": [payload: { subWorkTypeId: number; name: string }];
  "cancel-sub-work-type-rename": [];
  "create-division-reference": [];
  "reorder-divisions": [payload: { divisionIds: number[] }];
  "reorder-work-types": [payload: { divisionId: number; workTypeIds: number[] }];
  "reorder-sub-work-types": [payload: { workTypeId: number; subWorkTypeIds: number[] }];
  "delete-selection": [];
  "item-context-menu": [payload: { itemId: string; x: number; y: number }];
  "work-connection-context-menu": [payload: { workConnectionId: string; x: number; y: number }];
  "milestone-context-menu": [payload: { milestoneId: string; x: number; y: number }];
  "row-context-menu": [payload: { rowId: string; x: number; y: number }];
  "header-context-menu": [
    payload: {
      target:
        | { kind: "reference-header" }
        | { kind: "division-header"; divisionId: number; name: string }
        | { kind: "work-type-header"; divisionId: number; workTypeId: number; name: string }
        | {
            kind: "sub-work-type-header";
            workTypeId: number;
            subWorkTypeId: number;
            rowId: string;
            name: string;
          };
      x: number;
      y: number;
    },
  ];
  "canvas-context-menu": [payload: { x: number; y: number; rowId: string | null; date: string | null }];
  "cancel-connection-create": [];
  "complete-connection-create": [targetItemId: string];
  "start-item-rename": [itemId: string];
  "commit-item-rename": [payload: { itemId: string; name: string }];
  "cancel-item-rename": [];
  "start-milestone-rename": [milestoneId: string];
  "commit-milestone-rename": [payload: { milestoneId: string; label: string }];
  "cancel-milestone-rename": [];
  "milestone-activate": [payload: { date: string; milestoneId?: string }];
  "move-start": [
    payload:
      | { kind: "item"; itemId: string }
      | { kind: "summary"; rowId: string }
      | { kind: "milestone"; milestoneId: string },
  ];
  "move-draft": [payload: { deltaDays: number; deltaLanes: number }];
  "move-end": [];
  "resize-start": [
    payload:
      | { kind: "item"; itemId: string; edge: "left" | "right" }
      | { kind: "summary"; rowId: string; edge: "left" | "right" },
  ];
  "resize-draft": [payload: { deltaDays: number }];
  "resize-end": [];
  "cell-selection-change": [payload: ScheduleGridCell | null];
  undo: [];
  redo: [];
  "select-schedule-version": [scheduleVersionId: number];
  "create-draft-version": [versionName: string];
  "open-import-dialog": [];
  "close-import-dialog": [];
  "import-dialog-file-change": [file: File | null];
  "import-dialog-start-date-change": [value: string];
  "import-dialog-end-date-change": [value: string];
  "import-dialog-submit": [];
  "toggle-ai-verification": [];
  "toggle-ai-verification-flag": [itemId: string];
  "export-schedule-excel": [range: "3week" | "3month"];
  "rename-schedule-version": [payload: { scheduleVersionId: number; versionName: string }];
  "delete-schedule-version": [scheduleVersionId: number];
  "open-schedule-version-review": [];
  "close-schedule-version-review": [];
  "request-schedule-version-promotion": [];
  "confirm-schedule-version-promotion": [];
  "close-schedule-version-promotion": [];
  "readonly-edit-attempt": [];
  "zoom-in": [];
  "zoom-out": [];
  "zoom-change": [zoomIndex: number];
  "toggle-panel": [];
  "toggle-left-panel": [];
}>();

const hoveredRowId = ref<string | null>(null);
const hoveredDate = ref<string | null>(null);
const rowPanelResizeState = ref<{ startClientX: number; startWidth: number } | null>(null);
const versionMenuRootRef = ref<HTMLElement | null>(null);
const versionActionMenuRef = ref<HTMLElement | null>(null);
const scheduleVersionRenameEditorRef = ref<HTMLElement | null>(null);
const draftRailRef = ref<HTMLElement | null>(null);
const activeVersionActionMenu = ref<{ versionId: number; x: number; y: number } | null>(null);
const renamingScheduleVersionId = ref<number | null>(null);
const renamingScheduleVersionName = ref("");
const shouldCommitScheduleVersionRenameOnBlur = ref(true);
const draftRailDragState = ref<{
  pointerId: number;
  startClientX: number;
  startScrollLeft: number;
  hasMoved: boolean;
} | null>(null);
const shouldSuppressNextDraftClick = ref(false);
const exportMenuRootRef = ref<HTMLElement | null>(null);
const exportMenuRef = ref<HTMLElement | null>(null);
const isExportMenuOpen = ref(false);
const exportMenuPosition = ref({ x: 0, y: 0 });
const pastMainMenuRootRef = ref<HTMLElement | null>(null);
const pastMainMenuRef = ref<HTMLElement | null>(null);
const isPastMainMenuOpen = ref(false);
const pastMainMenuPosition = ref({ x: 0, y: 0 });
const isExecutionProgressCompareEnabled = ref(false);
const isExecutionProgressCompareLeaving = ref(false);
let executionProgressCompareExitTimer: ReturnType<typeof setTimeout> | null = null;

const chartBodyRef = ref<ComponentPublicInstance | null>(null);
const chartHorizontalScrollbarHeight = ref(0);
let chartBodyResizeObserver: ResizeObserver | null = null;

function measureChartScrollbarHeight() {
  const instance = chartBodyRef.value as ComponentPublicInstance | null;
  const element = instance?.$el as HTMLElement | null;
  if (!element) return;
  const next = Math.max(0, element.offsetHeight - element.clientHeight);
  if (next !== chartHorizontalScrollbarHeight.value) {
    chartHorizontalScrollbarHeight.value = next;
  }
}

const shellHeight = computed(() => Math.max(props.viewportHeight ?? 640, 320));
const scaledShellHeaderHeight = computed(() =>
  Math.round(SHELL_HEADER_HEIGHT * Math.min(Math.max(props.zoomScale, 0.5), 1.46)),
);
const scaledHeaderMonthHeight = computed(() =>
  Math.round((scaledShellHeaderHeight.value * SHELL_HEADER_MONTH_HEIGHT) / SHELL_HEADER_HEIGHT),
);
const scaledHeaderWeekHeight = computed(() =>
  Math.round((scaledShellHeaderHeight.value * SHELL_HEADER_WEEK_HEIGHT) / SHELL_HEADER_HEIGHT),
);
const scaledHeaderDayHeight = computed(() =>
  scaledShellHeaderHeight.value - scaledHeaderMonthHeight.value - scaledHeaderWeekHeight.value,
);
const showReadonlyNotice = computed(() => props.readOnly && !props.referenceOnly);
const readonlyNoticeStackHeight = computed(() =>
  showReadonlyNotice.value ? READONLY_NOTICE_HEIGHT + SHELL_STACK_GAP : 0,
);
const scheduleSurfaceChromeHeight =
  SHELL_SURFACE_PADDING_Y * 2 +
  SHELL_SURFACE_GAP +
  SHELL_SURFACE_BORDER_WIDTH * 2 +
  SHELL_FRAME_BORDER_WIDTH * 2;
const bodyViewportHeight = computed(() =>
  Math.max(
    shellHeight.value -
      scaledShellHeaderHeight.value -
      SHELL_TOOLBAR_HEIGHT -
      scheduleSurfaceChromeHeight -
      readonlyNoticeStackHeight.value,
    200,
  ),
);
const rowPanelViewportHeight = computed(() =>
  Math.max(0, bodyViewportHeight.value - chartHorizontalScrollbarHeight.value),
);
const zoomSliderValue = computed(() => Math.min(Math.max(props.zoomIndex, 0), props.zoomMax));
const zoomSliderProgress = computed(() =>
  props.zoomMax > 0 ? (zoomSliderValue.value / props.zoomMax) * 100 : 0,
);
const leftHeaderVersionLabel = computed(() =>
  props.readOnly ? props.versionModeLabel : props.versionName,
);
const mainScheduleVersion = computed<ScheduleVersionOption | null>(() => {
  const mains = props.scheduleVersions.filter((version) => version.isMain);
  if (mains.length === 0) return null;
  return mains.reduce((latest, candidate) => {
    const latestAt = latest.setMainAt ?? "";
    const candidateAt = candidate.setMainAt ?? "";
    return candidateAt > latestAt ? candidate : latest;
  });
});
const showWorkflowControls = computed(() => !props.referenceOnly);
const createDivisionFooterHeight = computed(() =>
  !props.readOnly && showWorkflowControls.value ? CREATE_DIVISION_FOOTER_HEIGHT : 0,
);
const draftScheduleVersions = computed(() =>
  props.scheduleVersions.filter((version) => !version.isMain),
);
const safePastMainScheduleVersions = computed<PastMainScheduleVersionOption[]>(
  () => props.pastMainScheduleVersions ?? [],
);
const hasPastMainScheduleVersions = computed(
  () => safePastMainScheduleVersions.value.length > 0,
);
const isMainScheduleVersionSelected = computed(
  () =>
    mainScheduleVersion.value !== null &&
    mainScheduleVersion.value.id === props.selectedScheduleVersionId,
);
const isPanelOpen = computed(() => props.panelOpen ?? true);
const showPanelToggle = computed(() => props.showPanelToggle ?? false);
const panelToggleLabel = computed(() =>
  isPanelOpen.value
    ? (props.panelToggleOpenLabel ?? "패널 숨기기")
    : (props.panelToggleClosedLabel ?? "패널 보기"),
);
const panelToggleIcon = computed(() =>
  isPanelOpen.value ? panelRightContractIcon : panelRightExpandIcon,
);
const isLeftPanelOpen = computed(() => props.leftPanelOpen ?? true);
const showLeftPanelToggle = computed(() => props.showLeftPanelToggle ?? false);
const leftPanelToggleLabel = computed(() =>
  isLeftPanelOpen.value
    ? (props.leftPanelToggleOpenLabel ?? "왼쪽 패널 숨기기")
    : (props.leftPanelToggleClosedLabel ?? "왼쪽 패널 보기"),
);
const leftPanelToggleIcon = computed(() =>
  isLeftPanelOpen.value ? panelLeftContractIcon : panelLeftExpandIcon,
);
const isScheduleVersionReviewActive = computed(
  () =>
    props.scheduleVersionReview.open &&
    props.scheduleVersionReview.status === "success" &&
    !!props.scheduleVersionReview.summary,
);
const compareToggleLabel = computed(() => {
  if (props.scheduleVersionReview.status === "loading") {
    return "비교 중";
  }

  return isScheduleVersionReviewActive.value ? "비교 끄기" : "비교 보기";
});
const promotionSummaryCounts = computed(
  () => props.scheduleVersionPromotion.summary?.counts.filter((count) => count.count > 0) ?? [],
);
const promotionConfirmDisabled = computed(
  () =>
    props.scheduleVersionPromotion.status === "preparing" ||
    props.scheduleVersionPromotion.status === "promoting" ||
    props.scheduleVersionPromotion.status === "error",
);
const promotionConfirmLabel = computed(() =>
  props.scheduleVersionPromotion.status === "promoting" ? "반영 중" : "기준 공정표로 반영",
);
const activeVersionActionMenuVersion = computed(() =>
  activeVersionActionMenu.value
    ? props.scheduleVersions.find((version) => version.id === activeVersionActionMenu.value?.versionId) ??
      null
    : null,
);
const effectiveLeftPanelWidth = computed(() =>
  isLeftPanelOpen.value ? props.rowPanelWidth : 0,
);
const frameStyle = computed(() => ({
  gridTemplateColumns: `${effectiveLeftPanelWidth.value}px minmax(0, 1fr)`,
}));
const shellStyle = computed(() => ({
  height: `${shellHeight.value}px`,
  "--schedule-zoom-scale": `${props.zoomScale}`,
  "--schedule-header-height": `${scaledShellHeaderHeight.value}px`,
  "--schedule-header-month-height": `${scaledHeaderMonthHeight.value}px`,
  "--schedule-header-week-height": `${scaledHeaderWeekHeight.value}px`,
  "--schedule-header-day-height": `${scaledHeaderDayHeight.value}px`,
  "--schedule-row-panel-width": `${effectiveLeftPanelWidth.value}px`,
  "--schedule-chart-scrollbar-height": `${chartHorizontalScrollbarHeight.value}px`,
}));

function clampWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function closeVersionOverlays() {
  activeVersionActionMenu.value = null;
  renamingScheduleVersionId.value = null;
  renamingScheduleVersionName.value = "";
}

function toggleScheduleVersionReview() {
  if (props.scheduleVersionReview.status === "loading") {
    return;
  }

  if (isScheduleVersionReviewActive.value) {
    emit("close-schedule-version-review");
    return;
  }

  emit("open-schedule-version-review");
}

function requestScheduleVersionPromotion() {
  if (!props.canPromoteScheduleVersion || props.scheduleVersionPromotion.status === "promoting") {
    return;
  }

  closeVersionOverlays();
  emit("request-schedule-version-promotion");
}

function closeScheduleVersionPromotionDialog() {
  if (props.scheduleVersionPromotion.status === "promoting") {
    return;
  }

  emit("close-schedule-version-promotion");
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  if (
    isExportMenuOpen.value &&
    !exportMenuRootRef.value?.contains(target) &&
    !exportMenuRef.value?.contains(target)
  ) {
    isExportMenuOpen.value = false;
  }

  if (
    isPastMainMenuOpen.value &&
    !pastMainMenuRootRef.value?.contains(target) &&
    !pastMainMenuRef.value?.contains(target)
  ) {
    isPastMainMenuOpen.value = false;
  }

  if (
    versionMenuRootRef.value?.contains(target) ||
    versionActionMenuRef.value?.contains(target)
  ) {
    return;
  }

  if (renamingScheduleVersionId.value !== null) {
    commitActiveScheduleVersionRename();
    return;
  }

  closeVersionOverlays();
}

function handleDocumentKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (isExportMenuOpen.value) {
      isExportMenuOpen.value = false;
      return;
    }

    if (isPastMainMenuOpen.value) {
      isPastMainMenuOpen.value = false;
      return;
    }

    if (props.scheduleVersionPromotion.open) {
      closeScheduleVersionPromotionDialog();
      return;
    }

    if (props.scheduleImportDialog.open) {
      closeImportDialog();
      return;
    }

    closeVersionOverlays();
  }
}

function openPastMainMenu(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  pastMainMenuPosition.value = {
    x: rect.left,
    y: rect.bottom + 4,
  };
  isPastMainMenuOpen.value = true;
}

function handleMainScheduleChipClick(event: MouseEvent) {
  if (!mainScheduleVersion.value) {
    return;
  }

  if (!hasPastMainScheduleVersions.value) {
    selectScheduleVersion(mainScheduleVersion.value);
    return;
  }

  if (isPastMainMenuOpen.value) {
    isPastMainMenuOpen.value = false;
    return;
  }

  const trigger = event.currentTarget;
  if (trigger instanceof HTMLElement) {
    openPastMainMenu(trigger);
  }
}

function selectMainHistoryVersion(version: { id: number }) {
  isPastMainMenuOpen.value = false;
  if (version.id !== props.selectedScheduleVersionId) {
    emit("select-schedule-version", version.id);
  }
}

function formatPastMainTimestamp(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toggleExportMenu(event: MouseEvent) {
  if (isExportMenuOpen.value) {
    isExportMenuOpen.value = false;
    return;
  }

  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const rect = trigger.getBoundingClientRect();
  exportMenuPosition.value = {
    x: rect.left,
    y: rect.bottom + 4,
  };
  isExportMenuOpen.value = true;
}

function selectExportRange(range: "3week" | "3month") {
  isExportMenuOpen.value = false;
  emit("export-schedule-excel", range);
}

function emitImportSchedule() {
  emit("open-import-dialog");
}

function handleImportDialogFileChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.item(0) ?? null;
  emit("import-dialog-file-change", file);
}

function handleImportDialogStartDateChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  emit("import-dialog-start-date-change", target?.value ?? "");
}

function handleImportDialogEndDateChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  emit("import-dialog-end-date-change", target?.value ?? "");
}

function closeImportDialog() {
  if (props.scheduleImportDialog.status === "submitting") {
    return;
  }
  emit("close-import-dialog");
}

function submitImportDialog() {
  if (
    props.scheduleImportDialog.status === "submitting" ||
    !props.scheduleImportDialog.fileName
  ) {
    return;
  }
  emit("import-dialog-submit");
}

function selectScheduleVersion(version: ScheduleVersionOption) {
  if (shouldSuppressNextDraftClick.value) {
    shouldSuppressNextDraftClick.value = false;
    return;
  }

  if (renamingScheduleVersionId.value !== null) {
    return;
  }

  closeVersionOverlays();

  if (version.id !== props.selectedScheduleVersionId) {
    emit("select-schedule-version", version.id);
  }
}

function createDraftVersionWithDefaultName() {
  if (!props.canCreateDraftVersion) {
    return;
  }

  const trimmedVersionName = props.suggestedDraftVersionName.trim();

  if (!trimmedVersionName) {
    return;
  }

  closeVersionOverlays();
  emit("create-draft-version", trimmedVersionName);
}

function openVersionActionMenu(version: ScheduleVersionOption, event: MouseEvent) {
  if (shouldSuppressNextDraftClick.value) {
    shouldSuppressNextDraftClick.value = false;
    return;
  }

  if (version.isMain) {
    return;
  }

  activeVersionActionMenu.value = {
    versionId: version.id,
    x: event.clientX,
    y: event.clientY,
  };
}

function startActiveScheduleVersionRename() {
  const version = activeVersionActionMenuVersion.value;

  if (version) {
    startScheduleVersionRename(version);
  }
}

function requestActiveScheduleVersionDelete() {
  const version = activeVersionActionMenuVersion.value;

  if (version) {
    requestScheduleVersionDelete(version);
  }
}

async function startScheduleVersionRename(version: ScheduleVersionOption) {
  if (version.isMain) {
    return;
  }

  activeVersionActionMenu.value = null;
  shouldCommitScheduleVersionRenameOnBlur.value = true;
  renamingScheduleVersionId.value = version.id;
  renamingScheduleVersionName.value = version.versionName;

  await nextTick();
  requestAnimationFrame(() => {
    const editor = scheduleVersionRenameEditorRef.value;

    if (!editor) {
      return;
    }

    editor.textContent = renamingScheduleVersionName.value;
    editor.focus();

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

function cancelScheduleVersionRename() {
  renamingScheduleVersionId.value = null;
  renamingScheduleVersionName.value = "";
}

function commitScheduleVersionRename(version: ScheduleVersionOption) {
  const trimmedVersionName = renamingScheduleVersionName.value.trim();

  if (!trimmedVersionName) {
    cancelScheduleVersionRename();
    return;
  }

  if (trimmedVersionName !== version.versionName) {
    emit("rename-schedule-version", {
      scheduleVersionId: version.id,
      versionName: trimmedVersionName,
    });
  }

  cancelScheduleVersionRename();
}

function commitActiveScheduleVersionRename() {
  const version = props.scheduleVersions.find(
    (scheduleVersion) => scheduleVersion.id === renamingScheduleVersionId.value,
  );

  if (!version) {
    cancelScheduleVersionRename();
    return;
  }

  commitScheduleVersionRename(version);
}

function handleScheduleVersionRenameEditableInput(event: Event) {
  const target = event.target as HTMLElement | null;
  renamingScheduleVersionName.value = target?.textContent?.replace(/\n/g, "") ?? "";
}

function handleScheduleVersionRenameEditableBlur(version: ScheduleVersionOption) {
  if (shouldCommitScheduleVersionRenameOnBlur.value) {
    commitScheduleVersionRename(version);
  } else {
    cancelScheduleVersionRename();
  }

  shouldCommitScheduleVersionRenameOnBlur.value = true;
}

function handleScheduleVersionRenameEditableEnter() {
  shouldCommitScheduleVersionRenameOnBlur.value = true;
  scheduleVersionRenameEditorRef.value?.blur();
}

function handleScheduleVersionRenameEditableEscape() {
  shouldCommitScheduleVersionRenameOnBlur.value = false;
  scheduleVersionRenameEditorRef.value?.blur();
}

function setScheduleVersionRenameEditorRef(
  element: Element | ComponentPublicInstance | null,
  _refs?: Record<string, unknown>,
) {
  scheduleVersionRenameEditorRef.value = element instanceof HTMLElement ? element : null;
}

function requestScheduleVersionDelete(version: ScheduleVersionOption) {
  if (version.isMain || typeof window === "undefined") {
    return;
  }

  activeVersionActionMenu.value = null;
  const confirmed = window.confirm(
    `'${version.versionName}' 복제본을 삭제할까요?\n삭제하면 이 복제본의 공정표 데이터도 함께 정리됩니다.`,
  );

  if (!confirmed) {
    return;
  }

  if (renamingScheduleVersionId.value === version.id) {
    cancelScheduleVersionRename();
  }

  emit("delete-schedule-version", version.id);
}

function handleDraftRailPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !draftRailRef.value) {
    return;
  }

  const target = event.target;

  if (target instanceof HTMLElement && target.closest("input, form, [contenteditable='true']")) {
    return;
  }

  draftRailDragState.value = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startScrollLeft: draftRailRef.value.scrollLeft,
    hasMoved: false,
  };
}

function handleDraftRailPointerMove(event: PointerEvent) {
  const dragState = draftRailDragState.value;

  if (!dragState || !draftRailRef.value || dragState.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragState.startClientX;

  if (Math.abs(deltaX) > 4) {
    dragState.hasMoved = true;
  }

  if (!dragState.hasMoved) {
    return;
  }

  event.preventDefault();
  draftRailRef.value.scrollLeft = dragState.startScrollLeft - deltaX;
}

function endDraftRailPointerDrag(event: PointerEvent) {
  const dragState = draftRailDragState.value;

  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  shouldSuppressNextDraftClick.value = dragState.hasMoved;
  draftRailDragState.value = null;

  if (dragState.hasMoved && typeof window !== "undefined") {
    window.setTimeout(() => {
      shouldSuppressNextDraftClick.value = false;
    }, 0);
  }
}

function handleRowPanelScroll(scrollTop: number) {
  emit("scroll-sync", {
    top: scrollTop,
    left: props.scrollLeft,
  });
}

function handleChartScroll(position: { top: number; left: number }) {
  emit("scroll-sync", position);
}

function handleHoverCell(payload: { rowId: string | null; date: string | null }) {
  hoveredRowId.value = payload.rowId;
  hoveredDate.value = payload.date;
}

function handleZoomSliderInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const nextZoomIndex = Math.min(Math.max(target.valueAsNumber, 0), props.zoomMax);
  emit("zoom-change", nextZoomIndex);
}

function toggleExecutionProgressCompare() {
  if (isExecutionProgressCompareEnabled.value) {
    isExecutionProgressCompareEnabled.value = false;
    isExecutionProgressCompareLeaving.value = true;

    if (executionProgressCompareExitTimer) {
      clearTimeout(executionProgressCompareExitTimer);
    }

    executionProgressCompareExitTimer = setTimeout(() => {
      isExecutionProgressCompareLeaving.value = false;
      executionProgressCompareExitTimer = null;
    }, 180);
    return;
  }

  if (executionProgressCompareExitTimer) {
    clearTimeout(executionProgressCompareExitTimer);
    executionProgressCompareExitTimer = null;
  }

  isExecutionProgressCompareLeaving.value = false;
  isExecutionProgressCompareEnabled.value = true;
}

function removeRowPanelResizeListeners() {
  document.removeEventListener(
    "pointermove",
    handleRowPanelResizePointerMove,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
  document.removeEventListener(
    "pointerup",
    handleRowPanelResizePointerUp,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
}

function handleRowPanelResizePointerMove(event: PointerEvent) {
  const resizeState = rowPanelResizeState.value;
  if (!resizeState) {
    return;
  }

  if (event.buttons === 0) {
    handleRowPanelResizePointerUp();
    return;
  }

  event.preventDefault();
  emit(
    "row-panel-width-change",
    clampWidth(
      resizeState.startWidth + event.clientX - resizeState.startClientX,
      ROW_PANEL_MIN_WIDTH,
      ROW_PANEL_MAX_WIDTH,
    ),
  );
}

function handleRowPanelResizePointerUp() {
  rowPanelResizeState.value = null;
  removeRowPanelResizeListeners();
}

function startRowPanelResize(event: PointerEvent) {
  if (props.compactView) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  rowPanelResizeState.value = {
    startClientX: event.clientX,
    startWidth: props.rowPanelWidth,
  };
  document.addEventListener(
    "pointermove",
    handleRowPanelResizePointerMove,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
  document.addEventListener(
    "pointerup",
    handleRowPanelResizePointerUp,
    WIDTH_RESIZE_LISTENER_OPTIONS,
  );
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown, true);
  document.addEventListener("keydown", handleDocumentKeyDown, true);
  document.addEventListener("pointermove", handleDraftRailPointerMove, true);
  document.addEventListener("pointerup", endDraftRailPointerDrag, true);
  document.addEventListener("pointercancel", endDraftRailPointerDrag, true);

  const instance = chartBodyRef.value as ComponentPublicInstance | null;
  const element = instance?.$el as HTMLElement | null;
  if (element && typeof ResizeObserver !== "undefined") {
    chartBodyResizeObserver = new ResizeObserver(() => {
      measureChartScrollbarHeight();
    });
    chartBodyResizeObserver.observe(element);
  }
  nextTick(measureChartScrollbarHeight);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  document.removeEventListener("keydown", handleDocumentKeyDown, true);
  document.removeEventListener("pointermove", handleDraftRailPointerMove, true);
  document.removeEventListener("pointerup", endDraftRailPointerDrag, true);
  document.removeEventListener("pointercancel", endDraftRailPointerDrag, true);
  removeRowPanelResizeListeners();

  if (chartBodyResizeObserver) {
    chartBodyResizeObserver.disconnect();
    chartBodyResizeObserver = null;
  }

  if (executionProgressCompareExitTimer) {
    clearTimeout(executionProgressCompareExitTimer);
    executionProgressCompareExitTimer = null;
  }
});
</script>

<template>
  <div
    class="schedule-shell"
    :class="{
      'schedule-shell--resizing': rowPanelResizeState,
      'schedule-shell--readonly': readOnly,
      'schedule-shell--execution-progress': isExecutionProgressCompareEnabled,
      'schedule-shell--compact': compactView,
      'schedule-shell--left-panel-collapsed': !isLeftPanelOpen,
    }"
    :style="shellStyle"
  >
    <p v-if="showReadonlyNotice" class="schedule-shell__readonly-notice" role="note">
      <span class="schedule-shell__readonly-notice-chip">읽기 전용</span>
      <span>기준 공정표는 직접 수정할 수 없어요. 복제본을 만들어 수정해 주세요.</span>
    </p>

    <section class="schedule-shell__surface" aria-label="공정표">
    <div class="schedule-shell__toolbar" aria-label="공정표 도구">
      <div ref="versionMenuRootRef" class="schedule-shell__version">
        <button
          v-if="showLeftPanelToggle"
          type="button"
          class="schedule-shell__left-panel-toggle"
          :aria-label="leftPanelToggleLabel"
          :aria-pressed="isLeftPanelOpen"
          :title="leftPanelToggleLabel"
          @click="emit('toggle-left-panel')"
        >
          <img
            class="schedule-shell__left-panel-toggle-icon"
            :src="leftPanelToggleIcon"
            alt=""
            aria-hidden="true"
          />
        </button>

        <div
          v-if="mainScheduleVersion"
          ref="pastMainMenuRootRef"
          class="schedule-shell__main-version-root"
        >
          <button
            type="button"
            class="schedule-shell__version-chip"
            :class="{
              'schedule-shell__version-chip--readonly': readOnly,
              'schedule-shell__version-chip--selected': isMainScheduleVersionSelected,
            }"
            :aria-haspopup="hasPastMainScheduleVersions ? 'menu' : undefined"
            :aria-expanded="
              hasPastMainScheduleVersions ? isPastMainMenuOpen : undefined
            "
            aria-label="기준 공정표 선택"
            @click="handleMainScheduleChipClick"
          >
            <span class="schedule-shell__version-mode">기준 공정표</span>
            <span
              v-if="hasPastMainScheduleVersions"
              class="schedule-shell__version-caret"
              aria-hidden="true"
            >▾</span>
          </button>

          <Teleport to="body">
            <div
              v-if="isPastMainMenuOpen"
              ref="pastMainMenuRef"
              class="schedule-context-menu schedule-shell__past-main-menu"
              :style="{
                left: `${pastMainMenuPosition.x}px`,
                top: `${pastMainMenuPosition.y}px`,
              }"
              role="menu"
            >
              <p class="schedule-shell__past-main-menu-heading">기준 공정표 이력</p>
              <button
                type="button"
                class="schedule-context-menu__item"
                :class="{
                  'schedule-context-menu__item--active':
                    mainScheduleVersion?.id === selectedScheduleVersionId,
                }"
                role="menuitem"
                @click="selectMainHistoryVersion(mainScheduleVersion!)"
              >
                <span class="schedule-shell__past-main-name">
                  {{ mainScheduleVersion?.versionName }}
                  <span class="schedule-shell__past-main-current-badge">현재</span>
                </span>
                <span
                  v-if="formatPastMainTimestamp(mainScheduleVersion?.setMainAt)"
                  class="schedule-shell__past-main-date"
                >
                  {{ formatPastMainTimestamp(mainScheduleVersion?.setMainAt) }}
                </span>
              </button>
              <button
                v-for="pastMain in safePastMainScheduleVersions"
                :key="pastMain.id"
                type="button"
                class="schedule-context-menu__item"
                :class="{
                  'schedule-context-menu__item--active':
                    pastMain.id === selectedScheduleVersionId,
                }"
                role="menuitem"
                @click="selectMainHistoryVersion(pastMain)"
              >
                <span class="schedule-shell__past-main-name">
                  {{ pastMain.versionName }}
                </span>
                <span
                  v-if="formatPastMainTimestamp(pastMain.setMainAt)"
                  class="schedule-shell__past-main-date"
                >
                  {{ formatPastMainTimestamp(pastMain.setMainAt) }}
                </span>
              </button>
            </div>
          </Teleport>
        </div>

        <span
          v-if="mainScheduleVersion && showWorkflowControls"
          class="schedule-shell__version-divider"
          aria-hidden="true"
        />

        <div
          v-if="showWorkflowControls"
          ref="draftRailRef"
          class="schedule-shell__draft-rail"
          :class="{ 'schedule-shell__draft-rail--dragging': draftRailDragState }"
          aria-label="복제본 목록"
          @pointerdown="handleDraftRailPointerDown"
        >
          <div class="schedule-shell__draft-list">
            <div
              v-for="version in draftScheduleVersions"
              :key="version.id"
              class="schedule-shell__draft-chip-wrap"
              :class="{
                'schedule-shell__draft-chip-wrap--selected':
                  version.id === selectedScheduleVersionId,
                'schedule-shell__draft-chip-wrap--renaming':
                  renamingScheduleVersionId === version.id,
              }"
            >
              <button
                v-if="renamingScheduleVersionId !== version.id"
                type="button"
                class="schedule-shell__draft-chip"
                @click="selectScheduleVersion(version)"
                @dblclick.prevent.stop="startScheduleVersionRename(version)"
                @contextmenu.prevent.stop="openVersionActionMenu(version, $event)"
              >
                <span class="schedule-shell__draft-chip-name">
                  {{ version.versionName }}
                </span>
              </button>

              <span
                v-else
                class="schedule-shell__draft-chip schedule-shell__draft-chip--editing"
                role="textbox"
                aria-label="복제본 이름"
              >
                <span
                  :ref="setScheduleVersionRenameEditorRef"
                  class="schedule-shell__draft-chip-name schedule-shell__draft-chip-name--editing"
                  contenteditable="true"
                  spellcheck="false"
                  @pointerdown.stop
                  @click.stop
                  @dblclick.stop
                  @input="handleScheduleVersionRenameEditableInput"
                  @blur="handleScheduleVersionRenameEditableBlur(version)"
                  @keydown.enter.prevent="handleScheduleVersionRenameEditableEnter"
                  @keydown.escape.prevent="handleScheduleVersionRenameEditableEscape"
                />
              </span>
            </div>

            <button
              type="button"
              class="schedule-shell__draft-button"
              :disabled="!canCreateDraftVersion"
              @click="createDraftVersionWithDefaultName"
            >
              + 복제본 만들기
            </button>
          </div>
        </div>

        <Teleport to="body">
          <div
            v-if="
              showWorkflowControls &&
              activeVersionActionMenu &&
              activeVersionActionMenuVersion
            "
            ref="versionActionMenuRef"
            class="schedule-context-menu schedule-shell__version-context-menu"
            :style="{ left: `${activeVersionActionMenu.x}px`, top: `${activeVersionActionMenu.y}px` }"
            role="menu"
          >
            <button
              type="button"
              class="schedule-context-menu__item"
              role="menuitem"
              @click="startActiveScheduleVersionRename"
            >
              <span class="schedule-context-menu__icon" aria-hidden="true">✎</span>
              이름 변경
            </button>

            <button
              type="button"
              class="schedule-context-menu__item schedule-context-menu__item--danger"
              role="menuitem"
              @click="requestActiveScheduleVersionDelete"
            >
              <span class="schedule-context-menu__icon" aria-hidden="true">−</span>
              삭제
            </button>
          </div>
        </Teleport>
      </div>

      <div
        v-if="showWorkflowControls"
        class="schedule-shell__schedule-actions"
        aria-label="공정표 작업"
      >
        <!--
          Temporarily hidden from the draft schedule UI.
          Restore guide: docs/temporary-disabled-features/dashboard-and-schedule-import.md
        <button
          v-if="!isMainScheduleVersionSelected"
          type="button"
          class="schedule-shell__schedule-action-button"
          @click="emitImportSchedule"
        >
          공정표 불러오기
        </button>
        -->

        <div ref="exportMenuRootRef" class="schedule-shell__export-menu-root">
          <button
            type="button"
            class="schedule-shell__schedule-action-button"
            :aria-expanded="isExportMenuOpen"
            aria-haspopup="true"
            @click="toggleExportMenu"
          >
            엑셀로 내보내기 ▾
          </button>

          <Teleport to="body">
            <div
              v-if="isExportMenuOpen"
              ref="exportMenuRef"
              class="schedule-context-menu schedule-shell__export-menu"
              :style="{
                left: `${exportMenuPosition.x}px`,
                top: `${exportMenuPosition.y}px`,
              }"
              role="menu"
            >
              <button
                type="button"
                class="schedule-context-menu__item"
                role="menuitem"
                @click="selectExportRange('3week')"
              >
                3주 공정표 만들기
              </button>
              <button
                type="button"
                class="schedule-context-menu__item"
                role="menuitem"
                @click="selectExportRange('3month')"
              >
                3개월 공정표 만들기
              </button>
            </div>
          </Teleport>
        </div>
      </div>

      <button
        v-if="showWorkflowControls && canCompareScheduleVersion"
        type="button"
        class="schedule-shell__compare-toggle"
        :class="{ 'schedule-shell__compare-toggle--active': isScheduleVersionReviewActive }"
        :aria-pressed="isScheduleVersionReviewActive"
        :disabled="scheduleVersionReview.status === 'loading'"
        @click="toggleScheduleVersionReview"
      >
        <span>{{ compareToggleLabel }}</span>
      </button>

      <button
        v-if="showWorkflowControls && canPromoteScheduleVersion"
        type="button"
        class="schedule-shell__promote-button"
        :disabled="
          scheduleVersionPromotion.status === 'preparing' ||
          scheduleVersionPromotion.status === 'promoting'
        "
        @click="requestScheduleVersionPromotion"
      >
        기준 공정표로 반영
      </button>

      <button
        v-if="showWorkflowControls && readOnly"
        type="button"
        class="schedule-shell__compare-toggle"
        :class="{
          'schedule-shell__compare-toggle--active': isExecutionProgressCompareEnabled,
        }"
        :aria-pressed="isExecutionProgressCompareEnabled"
        @click="toggleExecutionProgressCompare"
      >
        <span>작업일보 비교</span>
      </button>

      <button
        v-if="showWorkflowControls && !readOnly"
        type="button"
        class="schedule-shell__compare-toggle"
        :class="{
          'schedule-shell__compare-toggle--active': isAiVerificationModeActive,
        }"
        :aria-pressed="isAiVerificationModeActive"
        @click="emit('toggle-ai-verification')"
      >
        <span>AI 검증</span>
      </button>

      <div class="schedule-shell__toolbar-spacer" aria-hidden="true" />

      <span
        v-if="showWorkflowControls"
        class="schedule-shell__toolbar-divider"
        aria-hidden="true"
      />

      <div
        v-if="showWorkflowControls"
        class="schedule-shell__actions"
        aria-label="작업 되돌리기"
      >
        <button
          type="button"
          class="schedule-shell__action schedule-shell__action--history"
          :disabled="!canUndo"
          aria-label="되돌리기"
          title="되돌리기 (Ctrl/Cmd+Z)"
          @click="emit('undo')"
        >
          <img class="schedule-shell__action-icon" :src="undoIcon" alt="" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="schedule-shell__action schedule-shell__action--history"
          :disabled="!canRedo"
          aria-label="다시 실행"
          title="다시 실행 (Ctrl/Cmd+Shift+Z 또는 Ctrl/Cmd+Y)"
          @click="emit('redo')"
        >
          <img class="schedule-shell__action-icon" :src="redoIcon" alt="" aria-hidden="true" />
        </button>
      </div>

      <span
        v-if="showWorkflowControls && historySyncing"
        class="schedule-shell__history-sync"
        role="status"
        aria-live="polite"
      >
        동기화 중
      </span>

      <div class="schedule-shell__actions schedule-shell__actions--zoom" aria-label="공정표 확대 축소">
        <button
          type="button"
          class="schedule-shell__action"
          :disabled="!canZoomOut"
          aria-label="축소"
          title="축소"
          @click="emit('zoom-out')"
        >
          -
        </button>

        <input
          class="schedule-shell__zoom-slider"
          type="range"
          min="0"
          :max="zoomMax"
          step="1"
          :value="zoomSliderValue"
          :style="{ '--zoom-progress': `${zoomSliderProgress}%` }"
          aria-label="확대 축소"
          title="확대 축소"
          @input="handleZoomSliderInput"
        />

        <button
          type="button"
          class="schedule-shell__action"
          :disabled="!canZoomIn"
          aria-label="확대"
          title="확대"
          @click="emit('zoom-in')"
        >
          +
        </button>
      </div>

      <span
        v-if="showPanelToggle"
        class="schedule-shell__toolbar-divider"
        aria-hidden="true"
      />

      <button
        v-if="showPanelToggle"
        type="button"
        class="schedule-shell__panel-toggle"
        :aria-label="panelToggleLabel"
        :aria-pressed="isPanelOpen"
        :title="panelToggleLabel"
        @click="emit('toggle-panel')"
      >
        <img
          class="schedule-shell__panel-toggle-icon"
          :src="panelToggleIcon"
          alt=""
          aria-hidden="true"
        />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="schedule-shell__promotion-dialog-transition">
        <div
          v-if="showWorkflowControls && scheduleVersionPromotion.open"
          class="schedule-shell__promotion-dialog-backdrop"
          role="presentation"
          @click.self="closeScheduleVersionPromotionDialog"
        >
          <section
            class="schedule-shell__promotion-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-version-promotion-title"
          >
            <header class="schedule-shell__promotion-dialog-header">
              <h2 id="schedule-version-promotion-title">
                이 복제본을 기준 공정표로 반영할까요?
              </h2>
              <p>
                기존 공정표는 더 이상 기준으로 쓰이지 않아요.<br />
                반영 후에는 이 복제본이 기준 공정표로 표시됩니다.
              </p>
            </header>

            <div class="schedule-shell__promotion-dialog-body">
              <p
                v-if="scheduleVersionPromotion.status === 'preparing'"
                class="schedule-shell__promotion-dialog-loading"
              >
                변경사항을 준비하는 중이에요.
              </p>

              <template v-else>
                <div class="schedule-shell__promotion-route" aria-label="반영 대상">
                  <span>{{ scheduleVersionPromotion.baselineVersionName }}</span>
                  <span aria-hidden="true">→</span>
                  <strong>{{ scheduleVersionPromotion.draftVersionName }}</strong>
                </div>

                <div
                  v-if="scheduleVersionPromotion.summary"
                  class="schedule-shell__promotion-summary"
                >
                  <strong>{{ scheduleVersionPromotion.summary.totalCount }}건 변경</strong>
                  <div
                    v-if="promotionSummaryCounts.length > 0"
                    class="schedule-shell__promotion-summary-chips"
                  >
                    <span
                      v-for="count in promotionSummaryCounts"
                      :key="count.category"
                      class="schedule-shell__promotion-summary-chip"
                    >
                      {{ count.label }} {{ count.count }}
                    </span>
                  </div>
                  <span v-else class="schedule-shell__promotion-summary-empty">
                    변경사항 없음
                  </span>
                </div>
              </template>

              <p
                v-if="scheduleVersionPromotion.status === 'error'"
                class="schedule-shell__promotion-dialog-error"
              >
                {{ scheduleVersionPromotion.errorMessage }}
              </p>
            </div>

            <footer class="schedule-shell__promotion-dialog-footer">
              <button
                type="button"
                class="schedule-shell__promotion-dialog-secondary"
                :disabled="scheduleVersionPromotion.status === 'promoting'"
                @click="closeScheduleVersionPromotionDialog"
              >
                취소
              </button>
              <button
                type="button"
                class="schedule-shell__promotion-dialog-primary"
                :disabled="promotionConfirmDisabled"
                @click="emit('confirm-schedule-version-promotion')"
              >
                {{ promotionConfirmLabel }}
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="schedule-shell__promotion-dialog-transition">
        <div
          v-if="showWorkflowControls && scheduleImportDialog.open"
          class="schedule-shell__promotion-dialog-backdrop"
          role="presentation"
          @click.self="closeImportDialog"
        >
          <section
            class="schedule-shell__promotion-dialog schedule-shell__import-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-import-dialog-title"
          >
            <header class="schedule-shell__promotion-dialog-header">
              <h2 id="schedule-import-dialog-title">공정표 불러오기</h2>
              <p>
                엑셀 파일과 기간을 선택하면 자동으로 공종/작업/의존성을 추출해 현재 작업본에
                추가해요.
              </p>
            </header>

            <div class="schedule-shell__promotion-dialog-body">
              <label class="schedule-shell__import-field">
                <span class="schedule-shell__import-field-label">엑셀 파일</span>
                <span class="schedule-shell__import-file">
                  <input
                    class="schedule-shell__import-file-input"
                    type="file"
                    accept=".xlsx"
                    :disabled="scheduleImportDialog.status === 'submitting'"
                    @change="handleImportDialogFileChange"
                  />
                  <span class="schedule-shell__import-file-name">
                    {{ scheduleImportDialog.fileName ?? "선택된 파일 없음" }}
                  </span>
                </span>
              </label>

              <div class="schedule-shell__import-field-row">
                <label class="schedule-shell__import-field">
                  <span class="schedule-shell__import-field-label">시작일 (선택)</span>
                  <input
                    class="schedule-shell__import-date-input"
                    type="date"
                    :value="scheduleImportDialog.startDate"
                    :disabled="scheduleImportDialog.status === 'submitting'"
                    @change="handleImportDialogStartDateChange"
                    @input="handleImportDialogStartDateChange"
                  />
                </label>

                <label class="schedule-shell__import-field">
                  <span class="schedule-shell__import-field-label">종료일 (선택)</span>
                  <input
                    class="schedule-shell__import-date-input"
                    type="date"
                    :value="scheduleImportDialog.endDate"
                    :disabled="scheduleImportDialog.status === 'submitting'"
                    @change="handleImportDialogEndDateChange"
                    @input="handleImportDialogEndDateChange"
                  />
                </label>
              </div>

              <p class="schedule-shell__import-help">
                기간을 비워두면 엑셀 전체 일정을 추출합니다. LLM 처리에 시간이 걸릴 수 있어요.
              </p>

              <p
                v-if="scheduleImportDialog.status === 'error' && scheduleImportDialog.errorMessage"
                class="schedule-shell__promotion-dialog-error"
              >
                {{ scheduleImportDialog.errorMessage }}
              </p>
            </div>

            <footer class="schedule-shell__promotion-dialog-footer">
              <button
                type="button"
                class="schedule-shell__promotion-dialog-secondary"
                :disabled="scheduleImportDialog.status === 'submitting'"
                @click="closeImportDialog"
              >
                취소
              </button>
              <button
                type="button"
                class="schedule-shell__promotion-dialog-primary"
                :disabled="
                  scheduleImportDialog.status === 'submitting' ||
                  !scheduleImportDialog.fileName
                "
                @click="submitImportDialog"
              >
                {{ scheduleImportDialog.status === 'submitting' ? '불러오는 중' : '불러오기' }}
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>

    <div class="schedule-shell__frame" :style="frameStyle">
      <div class="schedule-shell__left-column" :aria-hidden="!isLeftPanelOpen">
        <template v-if="isLeftPanelOpen">
          <div class="schedule-shell__left-header">
            <span class="schedule-shell__left-version-label">
              {{ leftHeaderVersionLabel }}
            </span>
          </div>

          <DesktopScheduleRowPanel
            :rows="shellLayout.rows"
            :read-only="readOnly"
            :viewport-height="rowPanelViewportHeight"
            :scroll-top="scrollTop"
            :work-type-column-width="workTypeColumnWidth"
            :hovered-row-id="hoveredRowId"
            :selected-row-ids="selectedRowIds"
            :editing-division-id="editingDivisionId"
            :editing-work-type-id="editingWorkTypeId"
            :editing-sub-work-type-id="editingSubWorkTypeId"
            :create-division-footer-height="createDivisionFooterHeight"
            :show-create-division-button="createDivisionFooterHeight > 0"
            @scroll-top-change="handleRowPanelScroll"
            @select-row="emit('select-row', $event)"
            @start-division-rename="emit('start-division-rename', $event)"
            @commit-division-rename="emit('commit-division-rename', $event)"
            @cancel-division-rename="emit('cancel-division-rename')"
            @start-work-type-rename="emit('start-work-type-rename', $event)"
            @commit-work-type-rename="emit('commit-work-type-rename', $event)"
            @cancel-work-type-rename="emit('cancel-work-type-rename')"
            @start-sub-work-type-rename="emit('start-sub-work-type-rename', $event)"
            @commit-sub-work-type-rename="emit('commit-sub-work-type-rename', $event)"
            @cancel-sub-work-type-rename="emit('cancel-sub-work-type-rename')"
            @create-division-reference="emit('create-division-reference')"
            @reorder-divisions="emit('reorder-divisions', $event)"
            @reorder-work-types="emit('reorder-work-types', $event)"
            @reorder-sub-work-types="emit('reorder-sub-work-types', $event)"
            @work-type-column-width-change="emit('work-type-column-width-change', $event)"
            @header-context-menu="emit('header-context-menu', $event)"
            @row-context-menu="emit('row-context-menu', $event)"
            @readonly-edit-attempt="emit('readonly-edit-attempt')"
          />

          <div class="schedule-shell__left-bottom-spacer" aria-hidden="true" />
        </template>
      </div>

      <button
        v-if="!compactView && isLeftPanelOpen"
        type="button"
        class="schedule-shell__left-resize-handle"
        aria-label="공정표 왼쪽 영역 너비 조절"
        title="드래그해서 왼쪽 영역 너비 조절"
        @pointerdown="startRowPanelResize"
      />

      <div class="schedule-shell__main">
        <div class="schedule-shell__timeline-pane">
          <DesktopScheduleTimelineHeader
            :timeline="timeline"
            :scroll-left="scrollLeft"
            :hovered-date="hoveredDate"
          />
        </div>

        <div class="schedule-shell__date-divider" aria-hidden="true" />

        <DesktopScheduleChartBody
          ref="chartBodyRef"
          :timeline="timeline"
          :shell-layout="shellLayout"
          :read-only="readOnly"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          :scroll-left="scrollLeft"
          :interaction-cancel-version="interactionCancelVersion"
          :selected-row-ids="selectedRowIds"
          :selected-item-ids="selectedItemIds"
          :selected-work-connection-ids="selectedWorkConnectionIds"
          :selected-milestone-ids="selectedMilestoneIds"
          :connection-creation-state="connectionCreationState"
          :editing-item-id="editingItemId"
          :editing-milestone-id="editingMilestoneId"
          :schedule-version-review="scheduleVersionReview"
          :execution-progress-compare-visible="isExecutionProgressCompareEnabled"
          :execution-progress-compare-leaving="isExecutionProgressCompareLeaving"
          :is-ai-verification-mode-active="isAiVerificationModeActive"
          :ai-verification-flagged-item-ids="aiVerificationFlaggedItemIds"
          :bottom-spacer-height="createDivisionFooterHeight"
          @toggle-ai-verification-flag="emit('toggle-ai-verification-flag', $event)"
          :zoom-scale="zoomScale"
          @scroll-change="handleChartScroll"
          @clear-selection="emit('clear-selection')"
          @select-bars="emit('select-bars', $event)"
          @select-row="emit('select-row', $event)"
          @delete-selection="emit('delete-selection')"
          @readonly-edit-attempt="emit('readonly-edit-attempt')"
          @item-context-menu="emit('item-context-menu', $event)"
          @work-connection-context-menu="emit('work-connection-context-menu', $event)"
          @milestone-context-menu="emit('milestone-context-menu', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
          @canvas-context-menu="emit('canvas-context-menu', $event)"
          @cancel-connection-create="emit('cancel-connection-create')"
          @complete-connection-create="emit('complete-connection-create', $event)"
          @start-item-rename="emit('start-item-rename', $event)"
          @commit-item-rename="emit('commit-item-rename', $event)"
          @cancel-item-rename="emit('cancel-item-rename')"
          @start-milestone-rename="emit('start-milestone-rename', $event)"
          @commit-milestone-rename="emit('commit-milestone-rename', $event)"
          @cancel-milestone-rename="emit('cancel-milestone-rename')"
          @milestone-activate="emit('milestone-activate', $event)"
          @move-start="emit('move-start', $event)"
          @move-draft="emit('move-draft', $event)"
          @move-end="emit('move-end')"
          @resize-start="emit('resize-start', $event)"
          @resize-draft="emit('resize-draft', $event)"
          @resize-end="emit('resize-end')"
          @hover-cell="handleHoverCell"
          @cell-selection-change="emit('cell-selection-change', $event)"
        />

      </div>
    </div>
    </section>
  </div>
</template>
