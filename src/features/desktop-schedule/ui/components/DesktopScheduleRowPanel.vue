<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { ComponentPublicInstance } from "vue";

import type { DesktopScheduleShellRow } from "@/features/desktop-schedule/model/desktop-schedule.types";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleRowPanel.css";

type RowPanelEntry = {
  kind: "row";
  key: string;
  row: DesktopScheduleShellRow;
  subWorkTypeLabel: HeaderLabel;
};

type WorkTypeGroupEntry = {
  key: string;
  label: string;
  displayLabel: HeaderLabel;
  divisionId: number | null;
  workTypeId: number | null;
  top: number;
  height: number;
};

type DivisionGroupEntry = {
  key: string;
  divisionId: number | null;
  top: number;
  height: number;
  headerHeight: number;
};

type HeaderLabel = {
  text: string;
  isHint: boolean;
};

type ReferenceDragState =
  | { kind: "division"; divisionId: number; startClientY: number; currentClientY: number }
  | {
      kind: "work-type";
      divisionId: number;
      workTypeId: number;
      startClientY: number;
      currentClientY: number;
    };

const DEFAULT_DIVISION_NAME = "분류 (건축)";
const DEFAULT_DIVISION_NAME_NEXT = "분류 (건축공사)";
const DEFAULT_WORK_TYPE_NAME = "상위 공사명 (철콘공사)";
const DEFAULT_DIVISION_NAMES = new Set([DEFAULT_DIVISION_NAME, DEFAULT_DIVISION_NAME_NEXT]);
const DEFAULT_WORK_TYPE_NAMES = new Set([DEFAULT_WORK_TYPE_NAME]);
const DEFAULT_SUB_WORK_TYPE_NAMES = new Set(["하위 공사명 (철근)", "하위 공사명 (타설)"]);

const DIVISION_HINT_TEXT = "건축공사";
const WORK_TYPE_HINT_TEXT = "철콘공사";
const SUB_WORK_TYPE_HINT_TEXT = "타설";
const REFERENCE_DRAG_LISTENER_OPTIONS = true;
const WORK_TYPE_COLUMN_MIN_WIDTH = 72;
const WORK_TYPE_COLUMN_MAX_WIDTH = 240;
const COLUMN_RESIZE_LISTENER_OPTIONS = true;
const SCROLL_SYNC_EPSILON = 0.01;

const props = defineProps<{
  rows: DesktopScheduleShellRow[];
  readOnly: boolean;
  viewportHeight: number;
  scrollTop: number;
  workTypeColumnWidth: number;
  hoveredRowId?: string | null;
  selectedRowIds: string[];
  editingDivisionId?: number | null;
  editingWorkTypeId?: number | null;
  editingSubWorkTypeId?: number | null;
}>();

const emit = defineEmits<{
  "scroll-top-change": [scrollTop: number];
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
  "work-type-column-width-change": [width: number];
  "header-context-menu": [
    payload: {
      target:
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
  "row-context-menu": [payload: { rowId: string; x: number; y: number }];
}>();

const containerRef = ref<HTMLElement | null>(null);
const divisionRenameInputRef = ref<HTMLInputElement | null>(null);
const workTypeRenameInputRef = ref<HTMLInputElement | null>(null);
const subWorkTypeRenameInputRef = ref<HTMLInputElement | null>(null);
const divisionRenameDraft = ref("");
const workTypeRenameDraft = ref("");
const subWorkTypeRenameDraft = ref("");
const shouldCommitDivisionRenameOnBlur = ref(true);
const shouldCommitWorkTypeRenameOnBlur = ref(true);
const shouldCommitSubWorkTypeRenameOnBlur = ref(true);
const referenceDragState = ref<ReferenceDragState | null>(null);
const workTypeColumnResizeState = ref<{ startClientX: number; startWidth: number } | null>(null);
let syncingFromProp = false;
const selectedRowIdSet = computed(() => new Set(props.selectedRowIds));
const panelStyle = computed(() => ({
  height: `${props.viewportHeight}px`,
  "--schedule-work-type-column-width": `${props.workTypeColumnWidth}px`,
}));

const panelEntries = computed<RowPanelEntry[]>(() =>
  props.rows.map((row) => ({
    kind: "row",
    key: `row:${row.id}`,
    row,
    subWorkTypeLabel: createHeaderLabel(row.subWorkType ?? row.name, {
      defaultNames: DEFAULT_SUB_WORK_TYPE_NAMES,
      hintText: SUB_WORK_TYPE_HINT_TEXT,
    }),
  })),
);

function createHeaderLabel(
  value: string,
  options: { defaultNames: Set<string>; hintText: string },
): HeaderLabel {
  const trimmedValue = value.trim();

  if (!trimmedValue || options.defaultNames.has(trimmedValue)) {
    return {
      text: options.hintText,
      isHint: true,
    };
  }

  return {
    text: value,
    isHint: false,
  };
}

function getDivisionLabel(row: DesktopScheduleShellRow) {
  return createHeaderLabel(row.name, {
    defaultNames: DEFAULT_DIVISION_NAMES,
    hintText: DIVISION_HINT_TEXT,
  });
}

const workTypeGroups = computed<WorkTypeGroupEntry[]>(() => {
  const groups: WorkTypeGroupEntry[] = [];

  props.rows.forEach((row) => {
    if (row.kind !== "child-process") {
      return;
    }

    const groupKey = `${row.divisionId ?? row.division ?? ""}:${row.workTypeId ?? row.workType ?? ""}`;
    const previousGroup = groups[groups.length - 1];

    if (previousGroup?.key === groupKey) {
      previousGroup.height = row.top + row.height - previousGroup.top;
      return;
    }

    const label = row.workType ?? "";

    groups.push({
      key: groupKey,
      label,
      displayLabel: createHeaderLabel(label, {
        defaultNames: DEFAULT_WORK_TYPE_NAMES,
        hintText: WORK_TYPE_HINT_TEXT,
      }),
      divisionId: row.divisionId ?? null,
      workTypeId: row.workTypeId ?? null,
      top: row.top,
      height: row.height,
    });
  });

  return groups;
});

const divisionGroups = computed<DivisionGroupEntry[]>(() => {
  const divisionRows = props.rows.filter((row) => row.kind === "division");

  return divisionRows.map((row, index) => {
    const nextDivisionRow = divisionRows[index + 1];
    const bottom = nextDivisionRow?.top ?? contentHeight.value;

    return {
      key: row.id,
      divisionId: row.divisionId ?? null,
      top: row.top,
      height: Math.max(bottom - row.top, row.height),
      headerHeight: row.height,
    };
  });
});

const contentHeight = computed(() => {
  const lastRow = props.rows[props.rows.length - 1];
  return lastRow ? lastRow.top + lastRow.height : 0;
});

const referenceDropIndicatorStyle = computed(() => {
  const dragState = referenceDragState.value;

  if (!dragState) {
    return null;
  }

  const contentY = getDragContentY(dragState.currentClientY);
  if (contentY === null) {
    return null;
  }

  if (dragState.kind === "division") {
    const groups = getDraggableDivisionGroups();
    const dropIndex = getDivisionDropIndex(groups, contentY);
    const indicatorTop = getDropIndicatorTop(groups, dropIndex);

    return {
      top: `${indicatorTop}px`,
      left: "0",
      width: "100%",
    };
  }

  const groups = getDraggableWorkTypeGroups(dragState.divisionId);
  const dropIndex = getWorkTypeDropIndex(groups, contentY);
  const indicatorTop = getDropIndicatorTop(groups, dropIndex);

  return {
    top: `${indicatorTop}px`,
    left: "0",
    width: "100%",
  };
});

const activeWorkTypeDragPreview = computed(() => {
  const dragState = referenceDragState.value;

  if (dragState?.kind !== "work-type") {
    return null;
  }

  const group = workTypeGroups.value.find((workTypeGroup) => (
    workTypeGroup.workTypeId === dragState.workTypeId
  ));

  if (!group) {
    return null;
  }

  const entries = panelEntries.value.filter((entry) => (
    entry.row.kind === "child-process" && entry.row.workTypeId === dragState.workTypeId
  ));

  return {
    group,
    entries,
    style: {
      top: `${group.top}px`,
      height: `${group.height}px`,
      transform: `translateY(${dragState.currentClientY - dragState.startClientY}px)`,
    },
  };
});

function normalizeHexColor(colorHex: string) {
  const sanitized = colorHex.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(sanitized)) {
    return sanitized
      .split("")
      .map((character) => `${character}${character}`)
      .join("");
  }

  return /^[0-9a-fA-F]{6}$/.test(sanitized) ? sanitized : null;
}

function toAlphaColor(colorHex: string, alpha: number) {
  const normalizedHex = normalizeHexColor(colorHex);
  if (!normalizedHex) {
    return colorHex;
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getRowInlineStyle(row: DesktopScheduleShellRow) {
  const style: Record<string, string> = {
    top: `${row.top}px`,
    height: `${row.height}px`,
  };
  const dragState = referenceDragState.value;

  if (row.kind === "child-process" && row.colorHex) {
    style["--schedule-row-color-soft"] = toAlphaColor(row.colorHex, 0.16);
  }

  if (
    row.kind === "division" &&
    row.divisionId &&
    dragState?.kind === "division" &&
    dragState.divisionId === row.divisionId
  ) {
    style.transform = `translateY(${dragState.currentClientY - dragState.startClientY}px)`;
    style.zIndex = "6";
  }

  return style;
}

function getWorkTypeGroupInlineStyle(group: WorkTypeGroupEntry) {
  const style: Record<string, string> = {
    top: `${group.top}px`,
    height: `${group.height}px`,
  };

  return style;
}

function getWorkTypeDragPreviewSubRowStyle(entry: RowPanelEntry, group: WorkTypeGroupEntry) {
  const style: Record<string, string> = {
    top: `${entry.row.top - group.top}px`,
    height: `${entry.row.height}px`,
  };

  if (entry.row.colorHex) {
    style["--schedule-row-color-soft"] = toAlphaColor(entry.row.colorHex, 0.16);
  }

  return style;
}

function syncContainerScrollFromProps() {
  const element = containerRef.value;
  if (!element) {
    return;
  }

  if (Math.abs(element.scrollTop - props.scrollTop) < SCROLL_SYNC_EPSILON) {
    return;
  }

  syncingFromProp = true;
  element.scrollTop = props.scrollTop;
  requestAnimationFrame(() => {
    syncingFromProp = false;
  });
}

watch(() => props.scrollTop, syncContainerScrollFromProps);

onMounted(() => {
  void nextTick(() => {
    syncContainerScrollFromProps();
  });
});

onUnmounted(() => {
  removeReferenceDragWindowListeners();
  removeWorkTypeColumnResizeListeners();
});

watch(
  () => props.editingDivisionId,
  async (nextEditingDivisionId) => {
    if (nextEditingDivisionId === null || nextEditingDivisionId === undefined) {
      divisionRenameDraft.value = "";
      return;
    }

    const targetRow = props.rows.find((row) => row.divisionId === nextEditingDivisionId);
    const targetLabel = targetRow ? getDivisionLabel(targetRow) : null;
    divisionRenameDraft.value = targetLabel?.isHint ? "" : (targetRow?.name ?? "");
    shouldCommitDivisionRenameOnBlur.value = true;

    await nextTick();
    divisionRenameInputRef.value?.focus();
    divisionRenameInputRef.value?.select();
  },
);

watch(
  () => props.editingWorkTypeId,
  async (nextEditingWorkTypeId) => {
    if (nextEditingWorkTypeId === null || nextEditingWorkTypeId === undefined) {
      workTypeRenameDraft.value = "";
      return;
    }

    const targetGroup = workTypeGroups.value.find(
      (group) => group.workTypeId === nextEditingWorkTypeId,
    );
    workTypeRenameDraft.value = targetGroup?.displayLabel.isHint ? "" : (targetGroup?.label ?? "");
    shouldCommitWorkTypeRenameOnBlur.value = true;

    await nextTick();
    workTypeRenameInputRef.value?.focus();
    workTypeRenameInputRef.value?.select();
  },
);

watch(
  () => props.editingSubWorkTypeId,
  async (nextEditingSubWorkTypeId) => {
    if (nextEditingSubWorkTypeId === null || nextEditingSubWorkTypeId === undefined) {
      subWorkTypeRenameDraft.value = "";
      return;
    }

    const targetEntry = panelEntries.value.find(
      (entry) => entry.row.subWorkTypeId === nextEditingSubWorkTypeId,
    );
    subWorkTypeRenameDraft.value = targetEntry?.subWorkTypeLabel.isHint
      ? ""
      : (targetEntry?.row.subWorkType ?? targetEntry?.row.name ?? "");
    shouldCommitSubWorkTypeRenameOnBlur.value = true;

    await nextTick();
    subWorkTypeRenameInputRef.value?.focus();
    subWorkTypeRenameInputRef.value?.select();
  },
);

function handleScroll(event: Event) {
  if (syncingFromProp) {
    syncingFromProp = false;
    return;
  }

  const target = event.target as HTMLElement;
  emit("scroll-top-change", target.scrollTop);
}

function handleRowPointerDown(row: DesktopScheduleShellRow, event: PointerEvent) {
  if (event.button !== 0 || row.kind !== "child-process") {
    return;
  }

  emit("select-row", row.id);
}

function handleRowContextMenu(row: DesktopScheduleShellRow, event: MouseEvent) {
  event.preventDefault();

  if (props.readOnly) {
    return;
  }

  if (row.kind === "division" && row.divisionId && row.divisionId > 0) {
    emit("header-context-menu", {
      target: {
        kind: "division-header",
        divisionId: row.divisionId,
        name: row.name,
      },
      x: event.clientX,
      y: event.clientY,
    });
    return;
  }

  if (
    row.kind === "child-process" &&
    row.workTypeId &&
    row.workTypeId > 0 &&
    row.subWorkTypeId &&
    row.subWorkTypeId > 0
  ) {
    emit("header-context-menu", {
      target: {
        kind: "sub-work-type-header",
        workTypeId: row.workTypeId,
        subWorkTypeId: row.subWorkTypeId,
        rowId: row.id,
        name: row.subWorkType ?? row.name,
      },
      x: event.clientX,
      y: event.clientY,
    });
    return;
  }

  emit("row-context-menu", {
    rowId: row.id,
    x: event.clientX,
    y: event.clientY,
  });
}

function handleWorkTypeContextMenu(group: WorkTypeGroupEntry, event: MouseEvent) {
  event.preventDefault();

  if (props.readOnly) {
    return;
  }

  if (!group.divisionId || group.divisionId < 0 || !group.workTypeId || group.workTypeId < 0) {
    return;
  }

  emit("header-context-menu", {
    target: {
      kind: "work-type-header",
      divisionId: group.divisionId,
      workTypeId: group.workTypeId,
      name: group.label,
    },
    x: event.clientX,
    y: event.clientY,
  });
}

function getDragContentY(clientY: number) {
  const element = containerRef.value;
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return clientY - rect.top + element.scrollTop;
}

function getDropIndex(groups: { top: number; height: number }[], contentY: number) {
  const nextIndex = groups.findIndex((group) => contentY < group.top + group.height / 2);
  return nextIndex >= 0 ? nextIndex : groups.length;
}

function getDraggableDivisionGroups() {
  return divisionGroups.value.filter(
    (group): group is DivisionGroupEntry & { divisionId: number } =>
      group.divisionId !== null && group.divisionId > 0,
  );
}

function getDraggableWorkTypeGroups(divisionId: number) {
  return workTypeGroups.value.filter(
    (group): group is WorkTypeGroupEntry & { divisionId: number; workTypeId: number } =>
      group.divisionId === divisionId &&
      group.workTypeId !== null &&
      group.workTypeId > 0,
  );
}

function getDivisionDropIndex(groups: Array<DivisionGroupEntry & { divisionId: number }>, contentY: number) {
  const nextIndex = groups.findIndex((group) => contentY < group.top + group.headerHeight / 2);
  if (nextIndex >= 0) {
    return nextIndex;
  }

  const currentGroupIndex = groups.findIndex((group) => contentY < group.top + group.height);
  return currentGroupIndex >= 0 ? currentGroupIndex + 1 : groups.length;
}

function getWorkTypeDropIndex(
  groups: Array<WorkTypeGroupEntry & { divisionId: number; workTypeId: number }>,
  contentY: number,
) {
  return getDropIndex(groups, contentY);
}

function getDropIndicatorTop(groups: { top: number; height: number }[], dropIndex: number) {
  if (groups.length === 0) {
    return 0;
  }

  if (dropIndex <= 0) {
    return groups[0]!.top;
  }

  const targetGroup = groups[dropIndex];
  if (targetGroup) {
    return targetGroup.top;
  }

  const lastGroup = groups[groups.length - 1]!;
  return lastGroup.top + lastGroup.height;
}

function moveIdToDropIndex(ids: number[], activeId: number, dropIndex: number) {
  const currentIndex = ids.indexOf(activeId);
  if (currentIndex < 0) {
    return ids;
  }

  const nextIds = ids.filter((id) => id !== activeId);
  const insertionIndex = Math.min(
    Math.max(dropIndex > currentIndex ? dropIndex - 1 : dropIndex, 0),
    nextIds.length,
  );

  nextIds.splice(insertionIndex, 0, activeId);
  return nextIds;
}

function hasOrderChanged(previousIds: number[], nextIds: number[]) {
  return previousIds.length !== nextIds.length ||
    previousIds.some((id, index) => id !== nextIds[index]);
}

function removeReferenceDragWindowListeners() {
  document.removeEventListener(
    "pointermove",
    handleReferenceDragPointerMove,
    REFERENCE_DRAG_LISTENER_OPTIONS,
  );
  document.removeEventListener(
    "pointerup",
    handleReferenceDragPointerUp,
    REFERENCE_DRAG_LISTENER_OPTIONS,
  );
}

function removeWorkTypeColumnResizeListeners() {
  document.removeEventListener(
    "pointermove",
    handleWorkTypeColumnResizePointerMove,
    COLUMN_RESIZE_LISTENER_OPTIONS,
  );
  document.removeEventListener(
    "pointerup",
    handleWorkTypeColumnResizePointerUp,
    COLUMN_RESIZE_LISTENER_OPTIONS,
  );
}

function clampColumnWidth(value: number) {
  return Math.min(Math.max(value, WORK_TYPE_COLUMN_MIN_WIDTH), WORK_TYPE_COLUMN_MAX_WIDTH);
}

function handleWorkTypeColumnResizePointerMove(event: PointerEvent) {
  const resizeState = workTypeColumnResizeState.value;
  if (!resizeState) {
    return;
  }

  if (event.buttons === 0) {
    handleWorkTypeColumnResizePointerUp();
    return;
  }

  event.preventDefault();
  emit(
    "work-type-column-width-change",
    clampColumnWidth(resizeState.startWidth + event.clientX - resizeState.startClientX),
  );
}

function handleWorkTypeColumnResizePointerUp() {
  workTypeColumnResizeState.value = null;
  removeWorkTypeColumnResizeListeners();
}

function startWorkTypeColumnResize(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  workTypeColumnResizeState.value = {
    startClientX: event.clientX,
    startWidth: props.workTypeColumnWidth,
  };
  document.addEventListener(
    "pointermove",
    handleWorkTypeColumnResizePointerMove,
    COLUMN_RESIZE_LISTENER_OPTIONS,
  );
  document.addEventListener(
    "pointerup",
    handleWorkTypeColumnResizePointerUp,
    COLUMN_RESIZE_LISTENER_OPTIONS,
  );
}

function handleReferenceDragPointerMove(event: PointerEvent) {
  if (!referenceDragState.value) {
    return;
  }

  if (event.buttons === 0) {
    handleReferenceDragPointerUp(event);
    return;
  }

  event.preventDefault();
  referenceDragState.value = {
    ...referenceDragState.value,
    currentClientY: event.clientY,
  };
}

function handleReferenceDragPointerUp(event: PointerEvent) {
  const dragState = referenceDragState.value;
  referenceDragState.value = null;
  removeReferenceDragWindowListeners();

  if (!dragState) {
    return;
  }

  const contentY = getDragContentY(event.clientY);
  if (contentY === null) {
    return;
  }

  if (dragState.kind === "division") {
    const groups = getDraggableDivisionGroups();
    const previousIds = groups.map((group) => group.divisionId);
    const nextIds = moveIdToDropIndex(
      previousIds,
      dragState.divisionId,
      getDivisionDropIndex(groups, contentY),
    );

    if (hasOrderChanged(previousIds, nextIds)) {
      emit("reorder-divisions", { divisionIds: nextIds });
    }
    return;
  }

  const groups = getDraggableWorkTypeGroups(dragState.divisionId);
  const previousIds = groups.map((group) => group.workTypeId);
  const nextIds = moveIdToDropIndex(
    previousIds,
    dragState.workTypeId,
    getWorkTypeDropIndex(groups, contentY),
  );

  if (hasOrderChanged(previousIds, nextIds)) {
    emit("reorder-work-types", {
      divisionId: dragState.divisionId,
      workTypeIds: nextIds,
    });
  }
}

function startDivisionDrag(row: DesktopScheduleShellRow, event: PointerEvent) {
  if (props.readOnly) {
    return;
  }

  if (event.button !== 0 || !row.divisionId || row.divisionId < 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  referenceDragState.value = {
    kind: "division",
    divisionId: row.divisionId,
    startClientY: event.clientY,
    currentClientY: event.clientY,
  };
  document.addEventListener(
    "pointermove",
    handleReferenceDragPointerMove,
    REFERENCE_DRAG_LISTENER_OPTIONS,
  );
  document.addEventListener(
    "pointerup",
    handleReferenceDragPointerUp,
    REFERENCE_DRAG_LISTENER_OPTIONS,
  );
}

function startWorkTypeDrag(group: WorkTypeGroupEntry, event: PointerEvent) {
  if (props.readOnly) {
    return;
  }

  if (
    event.button !== 0 ||
    !group.divisionId ||
    group.divisionId < 0 ||
    !group.workTypeId ||
    group.workTypeId < 0
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  referenceDragState.value = {
    kind: "work-type",
    divisionId: group.divisionId,
    workTypeId: group.workTypeId,
    startClientY: event.clientY,
    currentClientY: event.clientY,
  };
  document.addEventListener(
    "pointermove",
    handleReferenceDragPointerMove,
    REFERENCE_DRAG_LISTENER_OPTIONS,
  );
  document.addEventListener(
    "pointerup",
    handleReferenceDragPointerUp,
    REFERENCE_DRAG_LISTENER_OPTIONS,
  );
}

function startDivisionRename(row: DesktopScheduleShellRow) {
  if (props.readOnly) {
    return;
  }

  if (row.kind !== "division" || row.divisionId === undefined) {
    return;
  }

  emit("start-division-rename", row.divisionId);
}

function handleDivisionClick(row: DesktopScheduleShellRow) {
  if (!getDivisionLabel(row).isHint) {
    return;
  }

  startDivisionRename(row);
}

function handleDivisionDoubleClick(row: DesktopScheduleShellRow) {
  if (getDivisionLabel(row).isHint) {
    return;
  }

  startDivisionRename(row);
}

function setDivisionRenameInputRef(element: Element | ComponentPublicInstance | null) {
  divisionRenameInputRef.value = element instanceof HTMLInputElement ? element : null;
}

function commitDivisionRename(row: DesktopScheduleShellRow) {
  if (row.divisionId === undefined) {
    emit("cancel-division-rename");
    return;
  }

  const nextName = divisionRenameDraft.value.trim();

  if (!nextName) {
    emit("cancel-division-rename");
    return;
  }

  emit("commit-division-rename", {
    divisionId: row.divisionId,
    name: nextName,
  });
}

function handleDivisionRenameBlur(row: DesktopScheduleShellRow) {
  if (shouldCommitDivisionRenameOnBlur.value) {
    commitDivisionRename(row);
  } else {
    emit("cancel-division-rename");
  }

  shouldCommitDivisionRenameOnBlur.value = true;
}

function handleDivisionRenameEnter() {
  shouldCommitDivisionRenameOnBlur.value = true;
  divisionRenameInputRef.value?.blur();
}

function handleDivisionRenameEscape() {
  shouldCommitDivisionRenameOnBlur.value = false;
  divisionRenameInputRef.value?.blur();
}

function startWorkTypeRename(group: WorkTypeGroupEntry) {
  if (props.readOnly) {
    return;
  }

  if (group.workTypeId === null || group.workTypeId === undefined) {
    return;
  }

  emit("start-work-type-rename", group.workTypeId);
}

function handleWorkTypeClick(group: WorkTypeGroupEntry) {
  if (!group.displayLabel.isHint) {
    return;
  }

  startWorkTypeRename(group);
}

function handleWorkTypeDoubleClick(group: WorkTypeGroupEntry) {
  if (group.displayLabel.isHint) {
    return;
  }

  startWorkTypeRename(group);
}

function setWorkTypeRenameInputRef(element: Element | ComponentPublicInstance | null) {
  workTypeRenameInputRef.value = element instanceof HTMLInputElement ? element : null;
}

function commitWorkTypeRename(group: WorkTypeGroupEntry) {
  if (group.workTypeId === null || group.workTypeId === undefined) {
    emit("cancel-work-type-rename");
    return;
  }

  const nextName = workTypeRenameDraft.value.trim();

  if (!nextName) {
    emit("cancel-work-type-rename");
    return;
  }

  emit("commit-work-type-rename", {
    workTypeId: group.workTypeId,
    name: nextName,
  });
}

function handleWorkTypeRenameBlur(group: WorkTypeGroupEntry) {
  if (shouldCommitWorkTypeRenameOnBlur.value) {
    commitWorkTypeRename(group);
  } else {
    emit("cancel-work-type-rename");
  }

  shouldCommitWorkTypeRenameOnBlur.value = true;
}

function handleWorkTypeRenameEnter() {
  shouldCommitWorkTypeRenameOnBlur.value = true;
  workTypeRenameInputRef.value?.blur();
}

function handleWorkTypeRenameEscape() {
  shouldCommitWorkTypeRenameOnBlur.value = false;
  workTypeRenameInputRef.value?.blur();
}

function startSubWorkTypeRename(row: DesktopScheduleShellRow) {
  if (props.readOnly) {
    return;
  }

  if (row.subWorkTypeId === null || row.subWorkTypeId === undefined) {
    return;
  }

  emit("start-sub-work-type-rename", row.subWorkTypeId);
}

function handleSubWorkTypeClick(entry: RowPanelEntry) {
  if (!entry.subWorkTypeLabel.isHint) {
    return;
  }

  startSubWorkTypeRename(entry.row);
}

function handleSubWorkTypeDoubleClick(entry: RowPanelEntry) {
  if (entry.subWorkTypeLabel.isHint) {
    return;
  }

  startSubWorkTypeRename(entry.row);
}

function setSubWorkTypeRenameInputRef(element: Element | ComponentPublicInstance | null) {
  subWorkTypeRenameInputRef.value = element instanceof HTMLInputElement ? element : null;
}

function commitSubWorkTypeRename(row: DesktopScheduleShellRow) {
  if (row.subWorkTypeId === null || row.subWorkTypeId === undefined) {
    emit("cancel-sub-work-type-rename");
    return;
  }

  const nextName = subWorkTypeRenameDraft.value.trim();

  if (!nextName) {
    emit("cancel-sub-work-type-rename");
    return;
  }

  emit("commit-sub-work-type-rename", {
    subWorkTypeId: row.subWorkTypeId,
    name: nextName,
  });
}

function handleSubWorkTypeRenameBlur(row: DesktopScheduleShellRow) {
  if (shouldCommitSubWorkTypeRenameOnBlur.value) {
    commitSubWorkTypeRename(row);
  } else {
    emit("cancel-sub-work-type-rename");
  }

  shouldCommitSubWorkTypeRenameOnBlur.value = true;
}

function handleSubWorkTypeRenameEnter() {
  shouldCommitSubWorkTypeRenameOnBlur.value = true;
  subWorkTypeRenameInputRef.value?.blur();
}

function handleSubWorkTypeRenameEscape() {
  shouldCommitSubWorkTypeRenameOnBlur.value = false;
  subWorkTypeRenameInputRef.value?.blur();
}
</script>

<template>
  <div
    ref="containerRef"
    class="schedule-row-panel"
    :class="{
      'schedule-row-panel--resizing-column': workTypeColumnResizeState,
      'schedule-row-panel--readonly': readOnly,
    }"
    :style="panelStyle"
    @scroll="handleScroll"
  >
    <div class="schedule-row-panel__content" :style="{ height: `${contentHeight}px` }">
      <div
        v-for="entry in panelEntries"
        :key="entry.key"
        class="schedule-row-panel__row"
        :class="{
          'schedule-row-panel__row--hovered': entry.row.id === hoveredRowId,
          'schedule-row-panel__row--selected': selectedRowIdSet.has(entry.row.id),
          'schedule-row-panel__row--division': entry.row.kind === 'division',
          'schedule-row-panel__row--milestone': entry.row.kind === 'milestone',
          'schedule-row-panel__row--child': entry.row.kind === 'child-process',
          'schedule-row-panel__row--work-type-dragging':
            entry.row.kind === 'child-process' &&
            referenceDragState?.kind === 'work-type' &&
            referenceDragState.workTypeId === entry.row.workTypeId,
        }"
        :style="getRowInlineStyle(entry.row)"
        @pointerdown="handleRowPointerDown(entry.row, $event)"
        @contextmenu="handleRowContextMenu(entry.row, $event)"
      >
        <div v-if="entry.row.kind === 'milestone'" class="schedule-row-panel__milestone-label">
          <p class="schedule-row-panel__title">
            {{ entry.row.name }}
          </p>
        </div>

        <div
          v-else-if="entry.row.kind === 'division'"
          class="schedule-row-panel__division-row"
          :class="{
            'schedule-row-panel__division-row--dragging':
              referenceDragState?.kind === 'division' &&
              referenceDragState.divisionId === entry.row.divisionId,
          }"
          @click.stop="handleDivisionClick(entry.row)"
          @dblclick.stop="handleDivisionDoubleClick(entry.row)"
        >
          <button
            v-if="!readOnly && entry.row.divisionId && entry.row.divisionId > 0"
            type="button"
            class="schedule-row-panel__drag-handle schedule-row-panel__drag-handle--division"
            :aria-label="`${entry.row.name} 순서 변경`"
            title="드래그해서 순서 변경"
            @click.stop
            @dblclick.stop
            @pointerdown="startDivisionDrag(entry.row, $event)"
          >
            ☰
          </button>

          <input
            v-if="entry.row.divisionId === editingDivisionId"
            :ref="setDivisionRenameInputRef"
            v-model="divisionRenameDraft"
            type="text"
            class="schedule-row-panel__division-rename-input"
            placeholder="건축공사"
            @click.stop
            @dblclick.stop
            @blur="handleDivisionRenameBlur(entry.row)"
            @keydown.enter.prevent="handleDivisionRenameEnter"
            @keydown.escape.prevent="handleDivisionRenameEscape"
          />
          <p
            v-else
            class="schedule-row-panel__division-title"
            :class="{
              'schedule-row-panel__division-title--hint': getDivisionLabel(entry.row).isHint,
            }"
          >
            {{ getDivisionLabel(entry.row).text }}
          </p>

        </div>

        <div v-else class="schedule-row-panel__grid">
          <span class="schedule-row-panel__work-type-placeholder" />
          <span
            class="schedule-row-panel__sub-work-type"
            @click.stop="handleSubWorkTypeClick(entry)"
            @dblclick.stop="handleSubWorkTypeDoubleClick(entry)"
          >
            <input
              v-if="entry.row.subWorkTypeId === editingSubWorkTypeId"
              :ref="setSubWorkTypeRenameInputRef"
              v-model="subWorkTypeRenameDraft"
              type="text"
              class="schedule-row-panel__inline-rename-input schedule-row-panel__inline-rename-input--sub-work-type"
              placeholder="타설"
              @click.stop
              @dblclick.stop
              @blur="handleSubWorkTypeRenameBlur(entry.row)"
              @keydown.enter.prevent="handleSubWorkTypeRenameEnter"
              @keydown.escape.prevent="handleSubWorkTypeRenameEscape"
            />
            <span
              v-else
              class="schedule-row-panel__sub-work-type-label"
              :class="{
                'schedule-row-panel__sub-work-type-label--hint': entry.subWorkTypeLabel.isHint,
              }"
            >
              {{ entry.subWorkTypeLabel.text }}
            </span>
          </span>
        </div>
      </div>

      <div class="schedule-row-panel__work-type-groups">
        <div
          v-for="group in workTypeGroups"
          :key="group.key"
          class="schedule-row-panel__work-type-group"
          :class="{
            'schedule-row-panel__work-type-group--hint': group.displayLabel.isHint,
            'schedule-row-panel__work-type-group--dragging':
              referenceDragState?.kind === 'work-type' &&
              referenceDragState.workTypeId === group.workTypeId,
          }"
          :style="getWorkTypeGroupInlineStyle(group)"
          @pointerdown.stop
          @click.stop="handleWorkTypeClick(group)"
          @dblclick.stop="handleWorkTypeDoubleClick(group)"
          @contextmenu.stop="handleWorkTypeContextMenu(group, $event)"
        >
          <button
            v-if="!readOnly && group.workTypeId && group.workTypeId > 0"
            type="button"
            class="schedule-row-panel__drag-handle schedule-row-panel__drag-handle--work-type"
            :aria-label="`${group.label} 순서 변경`"
            title="드래그해서 순서 변경"
            @click.stop
            @dblclick.stop
            @pointerdown="startWorkTypeDrag(group, $event)"
          >
            ☰
          </button>

          <input
            v-if="group.workTypeId === editingWorkTypeId"
            :ref="setWorkTypeRenameInputRef"
            v-model="workTypeRenameDraft"
            type="text"
            class="schedule-row-panel__inline-rename-input schedule-row-panel__inline-rename-input--work-type"
            placeholder="철콘공사"
            @click.stop
            @dblclick.stop
            @blur="handleWorkTypeRenameBlur(group)"
            @keydown.enter.prevent="handleWorkTypeRenameEnter"
            @keydown.escape.prevent="handleWorkTypeRenameEscape"
          />
          <span v-else>
            {{ group.displayLabel.text }}
          </span>
        </div>
      </div>

      <svg
        class="schedule-row-panel__row-grid"
        :width="workTypeColumnWidth + 100"
        :height="contentHeight"
        :viewBox="`0 0 ${workTypeColumnWidth + 100} ${contentHeight}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          v-for="entry in panelEntries.filter((candidate) => candidate.row.kind === 'child-process')"
          :key="`row-panel-row-end-${entry.row.id}`"
          class="schedule-row-panel__row-grid-line"
          :x1="workTypeColumnWidth"
          :y1="entry.row.top + entry.row.height"
          :x2="workTypeColumnWidth + 100"
          :y2="entry.row.top + entry.row.height"
        />
        <line
          v-for="entry in panelEntries.filter((candidate) => candidate.row.kind !== 'child-process')"
          :key="`row-panel-full-row-end-${entry.row.id}`"
          class="schedule-row-panel__row-grid-line"
          x1="0"
          :y1="entry.row.top + entry.row.height"
          :x2="workTypeColumnWidth + 100"
          :y2="entry.row.top + entry.row.height"
        />
        <line
          v-for="entry in panelEntries.filter((candidate) => candidate.row.kind === 'division')"
          :key="`row-panel-division-start-${entry.row.id}`"
          class="schedule-row-panel__row-grid-line schedule-row-panel__row-grid-line--strong"
          x1="0"
          :y1="entry.row.top"
          :x2="workTypeColumnWidth + 100"
          :y2="entry.row.top"
        />
        <rect
          class="schedule-row-panel__row-grid-bottom-divider"
          x="0"
          :y="Math.max(contentHeight - 2, 0)"
          :width="workTypeColumnWidth + 100"
          height="2"
        />
      </svg>

      <div
        v-if="activeWorkTypeDragPreview"
        class="schedule-row-panel__work-type-drag-preview"
        :style="activeWorkTypeDragPreview.style"
      >
        <div
          class="schedule-row-panel__work-type-drag-preview-label"
          :class="{
            'schedule-row-panel__work-type-drag-preview-label--hint':
              activeWorkTypeDragPreview.group.displayLabel.isHint,
          }"
        >
          {{ activeWorkTypeDragPreview.group.displayLabel.text }}
        </div>

        <div class="schedule-row-panel__work-type-drag-preview-rows">
          <div
            v-for="entry in activeWorkTypeDragPreview.entries"
            :key="`drag-preview-${entry.key}`"
            class="schedule-row-panel__work-type-drag-preview-row"
            :style="getWorkTypeDragPreviewSubRowStyle(entry, activeWorkTypeDragPreview.group)"
          >
            <span
              class="schedule-row-panel__sub-work-type-label"
              :class="{
                'schedule-row-panel__sub-work-type-label--hint': entry.subWorkTypeLabel.isHint,
              }"
            >
              {{ entry.subWorkTypeLabel.text }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="referenceDropIndicatorStyle"
        class="schedule-row-panel__drop-indicator"
        :style="referenceDropIndicatorStyle"
      />

      <button
        type="button"
        class="schedule-row-panel__column-resize-handle"
        aria-label="상위공정 칼럼 너비 조절"
        title="드래그해서 상위공정 칼럼 너비 조절"
        @pointerdown="startWorkTypeColumnResize"
      />

    </div>
  </div>
</template>
