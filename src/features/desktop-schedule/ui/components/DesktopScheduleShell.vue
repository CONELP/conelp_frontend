<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  type ComponentPublicInstance,
} from "vue";

import type {
  DesktopScheduleShellLayout,
  DesktopScheduleTimelineLayout,
  DesktopScheduleVersionPromotionState,
  DesktopScheduleVersionReviewState,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import DesktopScheduleChartBody from "@/features/desktop-schedule/ui/components/DesktopScheduleChartBody.vue";
import DesktopScheduleRowPanel from "@/features/desktop-schedule/ui/components/DesktopScheduleRowPanel.vue";
import DesktopScheduleTimelineHeader from "@/features/desktop-schedule/ui/components/DesktopScheduleTimelineHeader.vue";
import redoIcon from "@fluentui/svg-icons/icons/arrow_redo_20_regular.svg";
import undoIcon from "@fluentui/svg-icons/icons/arrow_undo_20_regular.svg";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleContextMenu.css";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleShell.css";

const SHELL_HEADER_HEIGHT = 116;
const SHELL_HEADER_MONTH_HEIGHT = 32;
const SHELL_HEADER_WEEK_HEIGHT = 28;
const SHELL_TOOLBAR_HEIGHT = 48;
const SHELL_STACK_GAP = 8;
const READONLY_NOTICE_HEIGHT = 40;
const ROW_PANEL_MIN_WIDTH = 180;
const ROW_PANEL_MAX_WIDTH = 520;
const WIDTH_RESIZE_LISTENER_OPTIONS = true;

type ConnectionCreationState = {
  kind: "work-connection";
  sourceItemId: string;
};

type ScheduleVersionOption = {
  id: number;
  versionName: string;
  isMain: boolean;
};

const props = defineProps<{
  timeline: DesktopScheduleTimelineLayout;
  shellLayout: DesktopScheduleShellLayout;
  readOnly: boolean;
  scheduleVersions: ScheduleVersionOption[];
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
  "reorder-divisions": [payload: { divisionIds: number[] }];
  "reorder-work-types": [payload: { divisionId: number; workTypeIds: number[] }];
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
  "move-preview": [payload: { deltaDays: number; deltaLanes: number }];
  "move-end": [];
  "resize-start": [
    payload:
      | { kind: "item"; itemId: string; edge: "left" | "right" }
      | { kind: "summary"; rowId: string; edge: "left" | "right" },
  ];
  "resize-preview": [payload: { deltaDays: number }];
  "resize-end": [];
  undo: [];
  redo: [];
  "select-schedule-version": [scheduleVersionId: number];
  "create-draft-version": [versionName: string];
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
const readonlyNoticeStackHeight = computed(() =>
  props.readOnly ? READONLY_NOTICE_HEIGHT + SHELL_STACK_GAP : 0,
);
const bodyViewportHeight = computed(() =>
  Math.max(
    shellHeight.value -
      scaledShellHeaderHeight.value -
      SHELL_TOOLBAR_HEIGHT -
      readonlyNoticeStackHeight.value,
    200,
  ),
);
const zoomSliderValue = computed(() => Math.min(Math.max(props.zoomIndex, 0), props.zoomMax));
const zoomSliderProgress = computed(() =>
  props.zoomMax > 0 ? (zoomSliderValue.value / props.zoomMax) * 100 : 0,
);
const leftHeaderVersionLabel = computed(() =>
  props.readOnly ? props.versionModeLabel : props.versionName,
);
const mainScheduleVersion = computed(() =>
  props.scheduleVersions.find((version) => version.isMain) ?? null,
);
const draftScheduleVersions = computed(() =>
  props.scheduleVersions.filter((version) => !version.isMain),
);
const isMainScheduleVersionSelected = computed(
  () =>
    mainScheduleVersion.value !== null &&
    mainScheduleVersion.value.id === props.selectedScheduleVersionId,
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
    !props.scheduleVersionPromotion.summary,
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
const frameStyle = computed(() => ({
  gridTemplateColumns: `${props.rowPanelWidth}px minmax(0, 1fr)`,
}));
const shellStyle = computed(() => ({
  height: `${shellHeight.value}px`,
  "--schedule-zoom-scale": `${props.zoomScale}`,
  "--schedule-header-height": `${scaledShellHeaderHeight.value}px`,
  "--schedule-header-month-height": `${scaledHeaderMonthHeight.value}px`,
  "--schedule-header-week-height": `${scaledHeaderWeekHeight.value}px`,
  "--schedule-header-day-height": `${scaledHeaderDayHeight.value}px`,
  "--schedule-row-panel-width": `${props.rowPanelWidth}px`,
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

  if (
    !(target instanceof Node) ||
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
    if (props.scheduleVersionPromotion.open) {
      closeScheduleVersionPromotionDialog();
      return;
    }

    closeVersionOverlays();
  }
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
    `'${version.versionName}' 작업본을 삭제할까요?\n삭제하면 이 작업본의 공정표 데이터도 함께 정리됩니다.`,
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
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  document.removeEventListener("keydown", handleDocumentKeyDown, true);
  document.removeEventListener("pointermove", handleDraftRailPointerMove, true);
  document.removeEventListener("pointerup", endDraftRailPointerDrag, true);
  document.removeEventListener("pointercancel", endDraftRailPointerDrag, true);
  removeRowPanelResizeListeners();
});
</script>

<template>
  <div
    class="schedule-shell"
    :class="{
      'schedule-shell--resizing': rowPanelResizeState,
      'schedule-shell--readonly': readOnly,
    }"
    :style="shellStyle"
  >
    <p v-if="readOnly" class="schedule-shell__readonly-notice" role="note">
      <span class="schedule-shell__readonly-notice-chip">읽기 전용</span>
      <span>기준 공정표는 직접 수정할 수 없어요. 작업본을 만들어 수정해 주세요.</span>
    </p>

    <div class="schedule-shell__toolbar" aria-label="공정표 도구">
      <div ref="versionMenuRootRef" class="schedule-shell__version">
        <button
          v-if="mainScheduleVersion"
          type="button"
          class="schedule-shell__version-chip"
          :class="{
            'schedule-shell__version-chip--readonly': readOnly,
            'schedule-shell__version-chip--selected': isMainScheduleVersionSelected,
          }"
          aria-label="기준 공정표 선택"
          @click="selectScheduleVersion(mainScheduleVersion)"
        >
          <span class="schedule-shell__version-mode">기준 공정표</span>
        </button>

        <span
          v-if="mainScheduleVersion"
          class="schedule-shell__version-divider"
          aria-hidden="true"
        />

        <div
          ref="draftRailRef"
          class="schedule-shell__draft-rail"
          :class="{ 'schedule-shell__draft-rail--dragging': draftRailDragState }"
          aria-label="작업본 목록"
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
                aria-label="작업본 이름"
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

          </div>
        </div>

        <button
          v-if="readOnly"
          type="button"
          class="schedule-shell__draft-button"
          :disabled="!canCreateDraftVersion"
          @click="createDraftVersionWithDefaultName"
        >
          + 작업본 만들기
        </button>

        <Teleport to="body">
          <div
            v-if="activeVersionActionMenu && activeVersionActionMenuVersion"
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

      <button
        v-if="canCompareScheduleVersion"
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
        v-if="canPromoteScheduleVersion"
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

      <div class="schedule-shell__toolbar-spacer" aria-hidden="true" />

      <span class="schedule-shell__toolbar-divider" aria-hidden="true" />

      <div class="schedule-shell__actions" aria-label="작업 되돌리기">
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
    </div>

    <Teleport to="body">
      <Transition name="schedule-shell__promotion-dialog-transition">
        <div
          v-if="scheduleVersionPromotion.open"
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
                이 작업본을 기준 공정표로 반영할까요?
              </h2>
              <p>
                기존 공정표는 더 이상 기준으로 쓰이지 않아요.<br />
                반영 후에는 이 작업본이 기준 공정표로 표시됩니다.
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

    <div class="schedule-shell__frame" :style="frameStyle">
      <div class="schedule-shell__left-column">
        <div class="schedule-shell__left-header">
          <span class="schedule-shell__left-version-label">
            {{ leftHeaderVersionLabel }}
          </span>
        </div>

        <DesktopScheduleRowPanel
          :rows="shellLayout.rows"
          :read-only="readOnly"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          :work-type-column-width="workTypeColumnWidth"
          :hovered-row-id="hoveredRowId"
          :selected-row-ids="selectedRowIds"
          :editing-division-id="editingDivisionId"
          :editing-work-type-id="editingWorkTypeId"
          :editing-sub-work-type-id="editingSubWorkTypeId"
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
          @reorder-divisions="emit('reorder-divisions', $event)"
          @reorder-work-types="emit('reorder-work-types', $event)"
          @work-type-column-width-change="emit('work-type-column-width-change', $event)"
          @header-context-menu="emit('header-context-menu', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
          @readonly-edit-attempt="emit('readonly-edit-attempt')"
        />
      </div>

      <button
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
          @move-preview="emit('move-preview', $event)"
          @move-end="emit('move-end')"
          @resize-start="emit('resize-start', $event)"
          @resize-preview="emit('resize-preview', $event)"
          @resize-end="emit('resize-end')"
          @hover-cell="handleHoverCell"
        />

      </div>
    </div>
  </div>
</template>
