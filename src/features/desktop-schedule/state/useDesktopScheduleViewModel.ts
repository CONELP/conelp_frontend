import { computed, ref } from "vue";

import { desktopScheduleSeed } from "@/features/desktop-schedule/data/desktop-schedule.seed";
import type {
  DesktopScheduleDependency,
  DesktopScheduleItem,
  DesktopScheduleLink,
  DesktopScheduleMilestone,
  DesktopScheduleRow,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
  DESKTOP_SCHEDULE_MILESTONE_ROW_ID,
  DESKTOP_SCHEDULE_SHELL_DEFAULTS,
  DESKTOP_SCHEDULE_TIMELINE_DEFAULTS,
  DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS,
  desktopScheduleService,
} from "@/features/desktop-schedule/services/desktop-schedule.service";
import {
  createClosedDesktopScheduleContextMenuState,
  createEmptyDesktopScheduleSelectionState,
  type DesktopScheduleContextMenuCommand,
  type DesktopScheduleContextMenuItem,
  type DesktopScheduleContextMenuTarget,
} from "@/features/desktop-schedule/state/desktop-schedule-interaction-state";

type ItemMoveSession = {
  type: "move";
  anchor: "item" | "summary";
  itemIds: string[];
  rowIds: string[];
  baseItems: DesktopScheduleItem[];
  baseRows: DesktopScheduleRow[];
  baseLaneByItemId: Record<string, number>;
  maxLaneIndexByRowId: Record<string, number>;
  pinnedLaneByItemId: Record<string, number>;
};

type MilestoneMoveSession = {
  type: "move";
  anchor: "milestone";
  milestoneIds: string[];
  baseMilestones: DesktopScheduleMilestone[];
};

type MoveSession = ItemMoveSession | MilestoneMoveSession;

type ResizeSession = {
  type: "resize";
  target: "item";
  itemId: string;
  edge: "left" | "right";
  baseItems: DesktopScheduleItem[];
};

type SummaryResizeSession = {
  type: "resize";
  target: "summary";
  rowId: string;
  edge: "left" | "right";
  baseRows: DesktopScheduleRow[];
};

type ConnectionCreationState = {
  kind: "dependency" | "link";
  sourceItemId: string;
};

type ColorPaletteTarget = Extract<DesktopScheduleContextMenuTarget, { kind: "row" | "item" }>;

type ColorPaletteState = {
  open: boolean;
  x: number;
  y: number;
  target: ColorPaletteTarget | null;
  selectedColor: string | null;
};

function createClosedColorPaletteState(): ColorPaletteState {
  return {
    open: false,
    x: 0,
    y: 0,
    target: null,
    selectedColor: null,
  };
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function promptForName(label: string, currentName: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextName = window.prompt(label, currentName);

  if (nextName === null) {
    return null;
  }

  const trimmedName = nextName.trim();
  return trimmedName.length > 0 ? trimmedName : null;
}

function promptForGapDays(currentGapDays = 0): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextValue = window.prompt(
    "링크 gap 일수를 입력하세요. 예) -2, 0, +2",
    currentGapDays >= 0 ? `+${currentGapDays}` : `${currentGapDays}`,
  );

  if (nextValue === null) {
    return null;
  }

  const normalizedValue = nextValue.trim().replace(/\s+/g, "");

  if (!/^[+-]?\d+$/.test(normalizedValue)) {
    window.alert("정수 일수를 입력해야 합니다. 예) -2, 0, +2");
    return null;
  }

  return Number.parseInt(normalizedValue, 10);
}

export function useDesktopScheduleViewModel() {
  const snapshot = desktopScheduleService.buildSnapshot(
    desktopScheduleSeed.sourceBundle,
    desktopScheduleSeed.milestones,
  );
  const workingRows = ref<DesktopScheduleRow[]>(snapshot.rows.map((row) => ({ ...row })));
  const workingItems = ref<DesktopScheduleItem[]>(snapshot.items.map((item) => ({ ...item })));
  const workingDependencies = ref<DesktopScheduleDependency[]>(
    snapshot.dependencies.map((dependency) => ({ ...dependency })),
  );
  const workingLinks = ref<DesktopScheduleLink[]>(snapshot.links.map((link) => ({ ...link })));
  const workingMilestones = ref<DesktopScheduleMilestone[]>(
    snapshot.milestones.map((milestone) => ({ ...milestone })),
  );
  const selectionState = ref(createEmptyDesktopScheduleSelectionState());
  const contextMenuState = ref(createClosedDesktopScheduleContextMenuState());
  const colorPaletteState = ref(createClosedColorPaletteState());
  const dayWidth = ref<number>(DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.dayWidth);
  const chartScrollTop = ref(0);
  const chartScrollLeft = ref(0);
  const lanePreferenceByItemId = ref<Record<string, number>>({});
  const interactionSession = ref<MoveSession | ResizeSession | SummaryResizeSession | null>(null);
  const connectionCreationState = ref<ConnectionCreationState | null>(null);
  const renamingItemId = ref<string | null>(null);
  const renamingMilestoneId = ref<string | null>(null);

  const rowById = computed(() => new Map(workingRows.value.map((row) => [row.id, row])));
  const currentZoomIndex = computed(() => {
    const exactIndex = DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.findIndex(
      (level) => level === dayWidth.value,
    );

    if (exactIndex >= 0) {
      return exactIndex;
    }

    return DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.reduce((closestIndex, level, index, levels) => {
      return Math.abs(level - dayWidth.value) < Math.abs(levels[closestIndex]! - dayWidth.value)
        ? index
        : closestIndex;
    }, 0);
  });
  const canZoomOut = computed(() => currentZoomIndex.value > 0);
  const canZoomIn = computed(
    () => currentZoomIndex.value < DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1,
  );
  const maxZoomIndex = computed(() => DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1);
  const zoomScale = computed(() => {
    const rawScale = Math.sqrt(dayWidth.value / DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.dayWidth);
    return Math.min(Math.max(rawScale, 0.68), 1.46);
  });
  const rowHeight = computed(() =>
    Math.round(DESKTOP_SCHEDULE_SHELL_DEFAULTS.rowHeight * zoomScale.value),
  );
  const barHeight = computed(() =>
    Math.round(DESKTOP_SCHEDULE_SHELL_DEFAULTS.barHeight * zoomScale.value),
  );
  const timeline = computed(() =>
    desktopScheduleService.buildTimeline(workingItems.value, {
      dayWidth: dayWidth.value,
    }),
  );
  const shellLayout = computed(() =>
    desktopScheduleService.buildShellLayout(workingRows.value, workingItems.value, timeline.value, {
      rowHeight: rowHeight.value,
      barHeight: barHeight.value,
      preferredLaneByItemId: lanePreferenceByItemId.value,
      pinnedLaneByItemId:
        interactionSession.value?.type === "move" &&
        interactionSession.value.anchor !== "milestone" &&
        interactionSession.value.itemIds.length > 0
          ? interactionSession.value.pinnedLaneByItemId
          : undefined,
      dependencies: workingDependencies.value,
      links: workingLinks.value,
      milestones: workingMilestones.value,
    }),
  );

  const scheduleMeta = computed(() => ({
    windowLabel: `${formatShortDate(timeline.value.startDate)} - ${formatShortDate(
      timeline.value.endDate,
    )}`,
    generatedLabel: formatDateTime(snapshot.metadata.generatedAt),
    sourceLabel: snapshot.metadata.source === "mock-seed" ? "더미 데이터" : "실데이터",
  }));

  function closeContextMenu() {
    contextMenuState.value = createClosedDesktopScheduleContextMenuState();
  }

  function closeColorPalette() {
    colorPaletteState.value = createClosedColorPaletteState();
  }

  function syncChartScroll(position: { left: number; top: number }) {
    chartScrollLeft.value = position.left;
    chartScrollTop.value = position.top;
    closeContextMenu();
    closeColorPalette();
  }

  function clearSelection() {
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    connectionCreationState.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
    closeColorPalette();
  }

  function addParentRow() {
    workingRows.value = desktopScheduleService.addParentRow(workingRows.value);
    closeContextMenu();
  }

  function addChildRow(parentRowId: string) {
    workingRows.value = desktopScheduleService.addChildRow(workingRows.value, parentRowId);
    closeContextMenu();
  }

  function toggleRowCollapse(rowId: string) {
    workingRows.value = desktopScheduleService.toggleRowCollapse(workingRows.value, rowId);
    closeContextMenu();
  }

  function selectBars(payload: { itemIds: string[]; rowIds: string[]; milestoneIds?: string[] }) {
    selectionState.value = {
      ...selectionState.value,
      rowIds: payload.rowIds,
      itemIds: payload.itemIds,
      dependencyIds: [],
      linkIds: [],
      criticalPathIds: [],
      groupIds: [],
      milestoneIds: payload.milestoneIds ?? [],
    };
    closeContextMenu();
  }

  function selectRows(payload: { rowIds: string[] }) {
    const selectableRowIds = payload.rowIds.filter((rowId) => {
      const row = rowById.value.get(rowId);
      return row?.kind === "child-process" || row?.kind === "parent-process";
    });

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      rowIds: selectableRowIds,
    };
    closeContextMenu();
  }

  function deleteSelection() {
    const selectedRowIds = selectionState.value.rowIds.filter((rowId) => rowById.value.has(rowId));
    const selectedRowIdSet = new Set(selectedRowIds);
    const rowItemIds = workingItems.value
      .filter((item) => selectedRowIdSet.has(item.rowId))
      .map((item) => item.id);
    const itemIdsToDelete = Array.from(new Set([...selectionState.value.itemIds, ...rowItemIds]));

    if (selectedRowIds.length > 0) {
      workingRows.value = desktopScheduleService.deleteRows(workingRows.value, selectedRowIds);
    }

    if (itemIdsToDelete.length > 0) {
      workingItems.value = desktopScheduleService.deleteItems(workingItems.value, itemIdsToDelete);
      workingDependencies.value = desktopScheduleService.removeDependenciesForItems(
        workingDependencies.value,
        itemIdsToDelete,
      );
      workingLinks.value = desktopScheduleService.removeLinksForItems(
        workingLinks.value,
        itemIdsToDelete,
      );
    }

    if (selectionState.value.dependencyIds.length > 0) {
      workingDependencies.value = desktopScheduleService.removeDependenciesByIds(
        workingDependencies.value,
        selectionState.value.dependencyIds,
      );
    }

    if (selectionState.value.linkIds.length > 0) {
      workingLinks.value = desktopScheduleService.removeLinksByIds(
        workingLinks.value,
        selectionState.value.linkIds,
      );
    }

    if (selectionState.value.milestoneIds.length > 0) {
      workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
        workingMilestones.value,
        selectionState.value.milestoneIds,
      );
    }

    if (renamingItemId.value && itemIdsToDelete.includes(renamingItemId.value)) {
      renamingItemId.value = null;
    }

    if (
      renamingMilestoneId.value &&
      selectionState.value.milestoneIds.includes(renamingMilestoneId.value)
    ) {
      renamingMilestoneId.value = null;
    }

    selectionState.value = createEmptyDesktopScheduleSelectionState();
    connectionCreationState.value = null;
    closeContextMenu();
  }

  function canCreateItemOnCanvasTarget(
    target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>,
  ) {
    if (!target.rowId || !target.date) {
      return false;
    }

    return rowById.value.get(target.rowId)?.kind === "child-process";
  }

  function canCreateMilestoneOnCanvasTarget(
    target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>,
  ) {
    return target.rowId === DESKTOP_SCHEDULE_MILESTONE_ROW_ID && !!target.date;
  }

  function openItemContextMenu(payload: { itemId: string; x: number; y: number }) {
    const nextSelectedItemIds = selectionState.value.itemIds.includes(payload.itemId)
      ? selectionState.value.itemIds
      : [payload.itemId];

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: nextSelectedItemIds,
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "item",
        itemId: payload.itemId,
      },
    };
  }

  function openDependencyContextMenu(payload: { dependencyId: string; x: number; y: number }) {
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      dependencyIds: [payload.dependencyId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "dependency",
        dependencyId: payload.dependencyId,
      },
    };
  }

  function openLinkContextMenu(payload: { linkId: string; x: number; y: number }) {
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      linkIds: [payload.linkId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "link",
        linkId: payload.linkId,
      },
    };
  }

  function openMilestoneContextMenu(payload: { milestoneId: string; x: number; y: number }) {
    if (!workingMilestones.value.some((milestone) => milestone.id === payload.milestoneId)) {
      return;
    }

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [payload.milestoneId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "milestone",
        milestoneId: payload.milestoneId,
      },
    };
  }

  function openRowContextMenu(payload: { rowId: string; x: number; y: number }) {
    if (!rowById.value.has(payload.rowId)) {
      return;
    }

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      rowIds: [payload.rowId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "row",
        rowId: payload.rowId,
      },
    };
  }

  function openCanvasContextMenu(payload: {
    x: number;
    y: number;
    rowId: string | null;
    date: string | null;
  }) {
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "canvas",
        rowId: payload.rowId,
        date: payload.date,
      },
    };
  }

  function getScopedItemIds(targetItemId: string) {
    return selectionState.value.itemIds.includes(targetItemId)
      ? selectionState.value.itemIds
      : [targetItemId];
  }

  function openColorPalette(target: ColorPaletteTarget, selectedColor: string | null | undefined) {
    colorPaletteState.value = {
      open: true,
      x: contextMenuState.value.x,
      y: contextMenuState.value.y,
      target,
      selectedColor: selectedColor ?? null,
    };
    closeContextMenu();
  }

  function applyColorSelection(colorHex: string | null) {
    const target = colorPaletteState.value.target;

    if (!target) {
      closeColorPalette();
      return;
    }

    if (target.kind === "row") {
      workingRows.value = desktopScheduleService.updateRowColor(
        workingRows.value,
        target.rowId,
        colorHex,
      );
      selectionState.value = {
        ...createEmptyDesktopScheduleSelectionState(),
        rowIds: [target.rowId],
      };
      closeColorPalette();
      return;
    }

    const scopedItemIds = getScopedItemIds(target.itemId);
    workingItems.value = desktopScheduleService.updateItemColor(
      workingItems.value,
      scopedItemIds,
      colorHex,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: scopedItemIds,
    };
    closeColorPalette();
  }

  function createItemOnCanvasTarget(payload: { rowId: string; startDate: string }) {
    const targetRow = rowById.value.get(payload.rowId);
    const seedItem = workingItems.value.find((item) => item.rowId === payload.rowId);

    const previousItemIds = new Set(workingItems.value.map((item) => item.id));
    workingItems.value = desktopScheduleService.createItem(workingRows.value, workingItems.value, {
      rowId: payload.rowId,
      startDate: payload.startDate,
      name: targetRow?.name ?? seedItem?.subWorkType ?? targetRow?.source.subWorkType ?? "",
      division: seedItem?.division ?? "",
      workType: seedItem?.workType ?? targetRow?.source.workType ?? "",
      subWorkType: seedItem?.subWorkType ?? targetRow?.source.subWorkType ?? targetRow?.name ?? "",
    });

    const createdItem = workingItems.value.find((item) => !previousItemIds.has(item.id));
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: createdItem ? [createdItem.id] : [],
    };
    closeContextMenu();
  }

  function startItemRename(itemId: string) {
    const targetItem = workingItems.value.find((item) => item.id === itemId);

    if (!targetItem) {
      renamingItemId.value = null;
      closeContextMenu();
      return;
    }
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: [itemId],
    };
    renamingItemId.value = itemId;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }

  function commitItemRename(payload: { itemId: string; name: string }) {
    const trimmedName = payload.name.trim();

    renamingItemId.value = null;

    if (!trimmedName) {
      closeContextMenu();
      return;
    }

    workingItems.value = desktopScheduleService.updateItemName(
      workingItems.value,
      payload.itemId,
      trimmedName,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: [payload.itemId],
    };
    closeContextMenu();
  }

  function cancelItemRename() {
    renamingItemId.value = null;
    closeContextMenu();
  }

  function startMilestoneRename(milestoneId: string) {
    const targetMilestone = workingMilestones.value.find((milestone) => milestone.id === milestoneId);

    if (!targetMilestone) {
      renamingMilestoneId.value = null;
      closeContextMenu();
      return;
    }

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [milestoneId],
    };
    renamingItemId.value = null;
    renamingMilestoneId.value = milestoneId;
    closeContextMenu();
  }

  function commitMilestoneRename(payload: { milestoneId: string; label: string }) {
    const trimmedLabel = payload.label.trim();

    renamingMilestoneId.value = null;

    if (!trimmedLabel) {
      closeContextMenu();
      return;
    }

    workingMilestones.value = desktopScheduleService.updateMilestoneLabel(
      workingMilestones.value,
      payload.milestoneId,
      trimmedLabel,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [payload.milestoneId],
    };
    closeContextMenu();
  }

  function cancelMilestoneRename() {
    renamingMilestoneId.value = null;
    closeContextMenu();
  }

  const contextMenuItems = computed<DesktopScheduleContextMenuItem[]>(() => {
    const target = contextMenuState.value.target;
    if (!contextMenuState.value.open || !target) {
      return [];
    }

    if (target.kind === "item") {
      return [
        { id: "toggle-dependency", label: "dependency 생성", command: "toggle-dependency", icon: "link" },
        { id: "toggle-link", label: "link 생성", command: "toggle-link", icon: "link" },
        { id: "change-item-color", label: "색상 변경", command: "change-color", icon: "palette" },
        {
          id: "change-item-properties",
          label: "이름 변경",
          command: "change-properties",
          icon: "pencil",
        },
        {
          id: "delete-item",
          label: "삭제",
          command: "delete-item",
          icon: "trash",
          danger: true,
        },
      ];
    }

    if (target.kind === "dependency") {
      return [
        {
          id: "remove-dependency",
          label: "dependency 제거",
          command: "remove-dependency",
          icon: "unlink",
          danger: true,
        },
      ];
    }

    if (target.kind === "link") {
      return [
        {
          id: "remove-link",
          label: "link 제거",
          command: "remove-link",
          icon: "unlink",
          danger: true,
        },
      ];
    }

    if (target.kind === "milestone") {
      return [
        {
          id: "change-milestone-properties",
          label: "이름 변경",
          command: "change-properties",
          icon: "pencil",
        },
        {
          id: "remove-milestone",
          label: "마일스톤 제거",
          command: "remove-milestone",
          icon: "trash",
          danger: true,
        },
      ];
    }

    if (target.kind === "row") {
      const row = rowById.value.get(target.rowId);

      if (!row) {
        return [];
      }

      if (row.kind === "child-process") {
        return [
          {
            id: "change-child-color",
            label: "색상 설정",
            command: "change-color",
            icon: "palette",
          },
        ];
      }

      return [
        {
          id: "change-parent-properties",
          label: "속성 변경",
          command: "change-properties",
          icon: "pencil",
        },
      ];
    }

    if (target.kind === "canvas") {
      if (canCreateMilestoneOnCanvasTarget(target)) {
        return [
          {
            id: "create-milestone",
            label: "마일스톤 생성",
            command: "create-milestone",
            icon: "plus",
          },
        ];
      }

      return [
        {
          id: "create-item",
          label: "작업 생성",
          command: "create-item",
          icon: "plus",
          disabled: !canCreateItemOnCanvasTarget(target),
        },
      ];
    }

    return [];
  });

  function executeContextMenuCommand(command: DesktopScheduleContextMenuCommand) {
    const target = contextMenuState.value.target;

    if (!target) {
      return;
    }

    if (
      command === "create-milestone" &&
      target.kind === "canvas" &&
      canCreateMilestoneOnCanvasTarget(target) &&
      target.date
    ) {
      activateMilestone({ date: target.date });
      return;
    }

    if (
      command === "create-item" &&
      target.kind === "canvas" &&
      canCreateItemOnCanvasTarget(target) &&
      target.rowId &&
      target.date
    ) {
      createItemOnCanvasTarget({
        rowId: target.rowId,
        startDate: target.date,
      });
      return;
    }

    if (target.kind === "row") {
      const targetRow = rowById.value.get(target.rowId);

      if (!targetRow) {
        closeContextMenu();
        return;
      }

      if (command === "change-color") {
        openColorPalette(target, targetRow.colorHex);
        return;
      }

      if (targetRow.kind === "parent-process" && command === "change-properties") {
        const nextName = promptForName("상위 공정명을 입력하세요.", targetRow.name);
        if (nextName) {
          workingRows.value = desktopScheduleService.updateRowName(
            workingRows.value,
            target.rowId,
            nextName,
          );
        }
        closeContextMenu();
        return;
      }
    }

    if (target.kind === "item") {
      const scopedItemIds = getScopedItemIds(target.itemId);

      if (command === "toggle-dependency") {
        connectionCreationState.value = {
          kind: "dependency",
          sourceItemId: target.itemId,
        };
        selectionState.value = {
          ...createEmptyDesktopScheduleSelectionState(),
          itemIds: [target.itemId],
        };
        closeContextMenu();
        return;
      }

      if (command === "toggle-link") {
        connectionCreationState.value = {
          kind: "link",
          sourceItemId: target.itemId,
        };
        selectionState.value = {
          ...createEmptyDesktopScheduleSelectionState(),
          itemIds: [target.itemId],
        };
        closeContextMenu();
        return;
      }

      if (command === "delete-item") {
        workingItems.value = desktopScheduleService.deleteItems(workingItems.value, scopedItemIds);
        workingDependencies.value = desktopScheduleService.removeDependenciesForItems(
          workingDependencies.value,
          scopedItemIds,
        );
        workingLinks.value = desktopScheduleService.removeLinksForItems(
          workingLinks.value,
          scopedItemIds,
        );
        if (renamingItemId.value && scopedItemIds.includes(renamingItemId.value)) {
          renamingItemId.value = null;
        }
        selectionState.value = createEmptyDesktopScheduleSelectionState();
        closeContextMenu();
        return;
      }

      if (command === "change-color") {
        const targetItem = workingItems.value.find((item) => item.id === target.itemId);
        openColorPalette(target, targetItem?.colorHex);
        return;
      }

      if (command === "change-properties") {
        startItemRename(target.itemId);
        return;
      }
    }

    if (target.kind === "dependency" && command === "remove-dependency") {
      workingDependencies.value = desktopScheduleService.removeDependenciesByIds(
        workingDependencies.value,
        [target.dependencyId],
      );
      closeContextMenu();
      return;
    }

    if (target.kind === "link" && command === "remove-link") {
      workingLinks.value = desktopScheduleService.removeLinksByIds(workingLinks.value, [target.linkId]);
      closeContextMenu();
      return;
    }

    if (target.kind === "milestone" && command === "remove-milestone") {
      workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
        workingMilestones.value,
        [target.milestoneId],
      );
      if (renamingMilestoneId.value === target.milestoneId) {
        renamingMilestoneId.value = null;
      }
      selectionState.value = createEmptyDesktopScheduleSelectionState();
      closeContextMenu();
      return;
    }

    if (target.kind === "milestone" && command === "change-properties") {
      startMilestoneRename(target.milestoneId);
      return;
    }

  }

  function cancelConnectionCreation() {
    connectionCreationState.value = null;
  }

  function completeConnectionCreation(targetItemId: string) {
    const connectionCreation = connectionCreationState.value;

    if (!connectionCreation) {
      return;
    }

    if (connectionCreation.sourceItemId !== targetItemId) {
      if (connectionCreation.kind === "dependency") {
        workingDependencies.value = desktopScheduleService.createDependency(
          workingDependencies.value,
          {
            sourceItemId: connectionCreation.sourceItemId,
            targetItemId,
          },
        );
      } else {
        const gapDays = promptForGapDays();
        if (gapDays === null) {
          return;
        }

        const nextLinks = desktopScheduleService.createLink(workingLinks.value, {
          sourceItemId: connectionCreation.sourceItemId,
          targetItemId,
          gapDays,
        });

        if (nextLinks !== workingLinks.value) {
          workingLinks.value = nextLinks;
          workingItems.value = desktopScheduleService.constrainItemsToRelationshipGaps(
            workingItems.value,
            [connectionCreation.sourceItemId],
            workingDependencies.value,
            nextLinks,
          );
        }
      }

      selectionState.value = {
        ...createEmptyDesktopScheduleSelectionState(),
        itemIds: [connectionCreation.sourceItemId, targetItemId],
      };
    }

    connectionCreationState.value = null;
    closeContextMenu();
  }

  function activateMilestone(payload: { date: string; milestoneId?: string }) {
    closeContextMenu();

    if (payload.milestoneId) {
      const existingMilestone = workingMilestones.value.find(
        (milestone) => milestone.id === payload.milestoneId,
      );

      if (!existingMilestone) {
        return;
      }

      workingMilestones.value = desktopScheduleService.upsertMilestone(workingMilestones.value, {
        date: existingMilestone.date,
        label: existingMilestone.label,
        rowId: null,
      });
      return;
    }

    const previousMilestoneIds = new Set(workingMilestones.value.map((milestone) => milestone.id));
    workingMilestones.value = desktopScheduleService.createMilestone(workingMilestones.value, {
      date: payload.date,
      label: "마일스톤",
      rowId: null,
    });
    const createdMilestone = workingMilestones.value.find(
      (milestone) => !previousMilestoneIds.has(milestone.id),
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: createdMilestone ? [createdMilestone.id] : [],
    };
  }

  function startMoveSession(
    payload:
      | { kind: "item"; itemId: string }
      | { kind: "summary"; rowId: string }
      | { kind: "milestone"; milestoneId: string },
  ) {
    if (payload.kind === "milestone") {
      const selectedMilestoneIds = selectionState.value.milestoneIds.includes(payload.milestoneId)
        ? selectionState.value.milestoneIds
        : [payload.milestoneId];

      selectionState.value = {
        ...createEmptyDesktopScheduleSelectionState(),
        milestoneIds: selectedMilestoneIds,
      };
      interactionSession.value = {
        type: "move",
        anchor: "milestone",
        milestoneIds: selectedMilestoneIds,
        baseMilestones: workingMilestones.value.map((milestone) => ({ ...milestone })),
      };
      closeContextMenu();
      return;
    }

    const selectedItemIds =
      payload.kind === "item" && selectionState.value.itemIds.includes(payload.itemId)
        ? selectionState.value.itemIds
        : payload.kind === "item"
          ? [payload.itemId]
          : selectionState.value.itemIds;
    const selectedRowIds =
      payload.kind === "summary" && selectionState.value.rowIds.includes(payload.rowId)
        ? selectionState.value.rowIds
        : payload.kind === "summary"
          ? [payload.rowId]
          : selectionState.value.rowIds;
    const baseLaneByItemId = Object.fromEntries(
      (shellLayout.value?.bars ?? [])
        .filter((bar) => bar.kind === "item" && selectedItemIds.includes(bar.itemId))
        .map((bar) => [bar.itemId, bar.laneIndex]),
    );
    const maxLaneIndexByRowId = Object.fromEntries(
      Object.entries(
        (shellLayout.value?.bars ?? []).reduce<Record<string, number>>((acc, bar) => {
          acc[bar.rowId] = Math.max(acc[bar.rowId] ?? 0, bar.laneIndex);
          return acc;
        }, {}),
      ),
    );

    selectBars({
      itemIds: selectedItemIds,
      rowIds: selectedRowIds,
    });
    interactionSession.value = {
      type: "move",
      anchor: payload.kind,
      itemIds: selectedItemIds,
      rowIds: selectedRowIds,
      baseItems: workingItems.value.map((item) => ({ ...item })),
      baseRows: workingRows.value.map((row) => ({ ...row })),
      baseLaneByItemId,
      maxLaneIndexByRowId,
      pinnedLaneByItemId: baseLaneByItemId,
    };
  }

  function previewMoveSession(payload: { deltaDays: number; deltaLanes: number }) {
    const session = interactionSession.value;

    if (!session || session.type !== "move") {
      return;
    }

    if (session.anchor === "milestone") {
      workingMilestones.value = desktopScheduleService.moveMilestones(
        session.baseMilestones,
        session.milestoneIds,
        payload.deltaDays,
      );
      return;
    }

    if (session.rowIds.length > 0) {
      workingRows.value = desktopScheduleService.moveSummaryRows(
        session.baseRows,
        session.rowIds,
        payload.deltaDays,
      );
    }

    if (session.itemIds.length === 0) {
      return;
    }

    const rowIdByItemId = new Map(
      session.baseItems
        .filter((item) => session.itemIds.includes(item.id))
        .map((item) => [item.id, item.rowId] as const),
    );
    const laneBoundsByRowId = Object.entries(session.baseLaneByItemId).reduce<
      Record<string, { minLane: number; maxLane: number }>
    >((acc, [itemId, laneIndex]) => {
      const rowId = rowIdByItemId.get(itemId);
      if (!rowId) {
        return acc;
      }

      const existing = acc[rowId];
      if (!existing) {
        acc[rowId] = { minLane: laneIndex, maxLane: laneIndex };
        return acc;
      }

      existing.minLane = Math.min(existing.minLane, laneIndex);
      existing.maxLane = Math.max(existing.maxLane, laneIndex);
      return acc;
    }, {});

    interactionSession.value = {
      ...session,
      pinnedLaneByItemId: Object.fromEntries(
        Object.entries(session.baseLaneByItemId).map(([itemId, laneIndex]) => {
          const rowId = rowIdByItemId.get(itemId);
          if (!rowId) {
            return [itemId, laneIndex] as const;
          }

          const rowBounds = laneBoundsByRowId[rowId];
          const maxLaneIndex = session.maxLaneIndexByRowId[rowId] ?? rowBounds?.maxLane ?? laneIndex;
          const deltaLanes = session.anchor === "item" ? payload.deltaLanes : 0;
          const clampedDeltaLanes = Math.min(
            Math.max(deltaLanes, -(rowBounds?.minLane ?? laneIndex)),
            maxLaneIndex - (rowBounds?.maxLane ?? laneIndex),
          );

          return [itemId, laneIndex + clampedDeltaLanes] as const;
        }),
      ),
    };

    workingItems.value = desktopScheduleService.moveItems(
      session.baseItems,
      session.itemIds,
      payload.deltaDays,
      workingDependencies.value,
      workingLinks.value,
    );
  }

  function endMoveSession() {
    const session = interactionSession.value;
    if (!session || session.type !== "move") {
      return;
    }

    if (session.anchor === "milestone") {
      interactionSession.value = null;
      return;
    }

    if (session.itemIds.length === 0) {
      interactionSession.value = null;
      return;
    }

    const affectedRowIds = new Set(
      workingItems.value
        .filter((item) => session.itemIds.includes(item.id))
        .map((item) => item.rowId),
    );
    lanePreferenceByItemId.value = {
      ...lanePreferenceByItemId.value,
      ...Object.fromEntries(
        (shellLayout.value?.bars ?? [])
          .filter((bar) => affectedRowIds.has(bar.rowId))
          .map((bar) => [bar.itemId, bar.laneIndex]),
      ),
    };

    interactionSession.value = null;
  }

  function startResizeSession(
    payload:
      | { kind: "item"; itemId: string; edge: "left" | "right" }
      | { kind: "summary"; rowId: string; edge: "left" | "right" },
  ) {
    if (payload.kind === "summary") {
      clearSelection();
      interactionSession.value = {
        type: "resize",
        target: "summary",
        rowId: payload.rowId,
        edge: payload.edge,
        baseRows: workingRows.value.map((row) => ({ ...row })),
      };
      return;
    }

    selectBars({
      itemIds: [payload.itemId],
      rowIds: [],
    });
    interactionSession.value = {
      type: "resize",
      target: "item",
      itemId: payload.itemId,
      edge: payload.edge,
      baseItems: workingItems.value.map((item) => ({ ...item })),
    };
  }

  function previewResizeSession(payload: { deltaDays: number }) {
    const session = interactionSession.value;
    if (!session || session.type !== "resize") {
      return;
    }

    if (session.target === "summary") {
      workingRows.value = desktopScheduleService.resizeSummaryRow(
        session.baseRows,
        session.rowId,
        session.edge,
        payload.deltaDays,
      );
      return;
    }

    workingItems.value = desktopScheduleService.resizeItem(
      session.baseItems,
      session.itemId,
      session.edge,
      payload.deltaDays,
      workingDependencies.value,
      workingLinks.value,
    );
  }

  function endResizeSession() {
    if (interactionSession.value?.type === "resize") {
      interactionSession.value = null;
    }
  }

  function setDayWidth(nextDayWidth: number, viewportWidth: number) {
    if (nextDayWidth === dayWidth.value) {
      return;
    }

    chartScrollLeft.value = desktopScheduleService.getScrollLeftForZoom(
      timeline.value,
      nextDayWidth,
      chartScrollLeft.value,
      viewportWidth,
    );
    dayWidth.value = nextDayWidth;
    closeContextMenu();
  }

  function zoomIn(viewportWidth: number) {
    if (!canZoomIn.value) {
      return;
    }
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value + 1]!, viewportWidth);
  }

  function setZoomIndex(nextZoomIndex: number, viewportWidth: number) {
    const clampedZoomIndex = Math.min(Math.max(Math.round(nextZoomIndex), 0), maxZoomIndex.value);
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[clampedZoomIndex]!, viewportWidth);
  }

  function zoomOut(viewportWidth: number) {
    if (!canZoomOut.value) {
      return;
    }
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value - 1]!, viewportWidth);
  }

  return {
    scheduleMeta,
    selectionState,
    contextMenuState,
    contextMenuItems,
    colorPaletteState,
    connectionCreationState,
    renamingItemId,
    renamingMilestoneId,
    timeline,
    shellLayout,
    chartScrollTop,
    chartScrollLeft,
    zoomScale,
    currentZoomIndex,
    maxZoomIndex,
    canZoomIn,
    canZoomOut,
    clearSelection,
    syncChartScroll,
    addParentRow,
    addChildRow,
    toggleRowCollapse,
    selectBars,
    selectRows,
    deleteSelection,
    openItemContextMenu,
    openDependencyContextMenu,
    openLinkContextMenu,
    openMilestoneContextMenu,
    openRowContextMenu,
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
  };
}
