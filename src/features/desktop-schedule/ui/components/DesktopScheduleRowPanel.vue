<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { DesktopScheduleShellRow } from "@/features/desktop-schedule/model/desktop-schedule.types";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleRowPanel.css";

type RowPanelEntry = {
  kind: "row";
  key: string;
  row: DesktopScheduleShellRow;
  subWorkTypeLabel: string;
};

type WorkTypeGroupEntry = {
  key: string;
  label: string;
  top: number;
  height: number;
};

const props = defineProps<{
  rows: DesktopScheduleShellRow[];
  viewportHeight: number;
  scrollTop: number;
  hoveredRowId?: string | null;
  selectedRowIds: string[];
}>();

const emit = defineEmits<{
  "scroll-top-change": [scrollTop: number];
  "select-row": [rowId: string];
  "row-context-menu": [payload: { rowId: string; x: number; y: number }];
}>();

const containerRef = ref<HTMLElement | null>(null);
let syncingFromProp = false;
const selectedRowIdSet = computed(() => new Set(props.selectedRowIds));

const panelEntries = computed<RowPanelEntry[]>(() =>
  props.rows.map((row) => ({
    kind: "row",
    key: `row:${row.id}`,
    row,
    subWorkTypeLabel: row.subWorkType ?? row.name,
  })),
);

const workTypeGroups = computed<WorkTypeGroupEntry[]>(() => {
  const groups: WorkTypeGroupEntry[] = [];

  props.rows.forEach((row) => {
    if (row.kind !== "child-process") {
      return;
    }

    const groupKey = `${row.division ?? ""}:${row.workType ?? ""}`;
    const previousGroup = groups[groups.length - 1];

    if (previousGroup?.key === groupKey) {
      previousGroup.height = row.top + row.height - previousGroup.top;
      return;
    }

    groups.push({
      key: groupKey,
      label: row.workType ?? "",
      top: row.top,
      height: row.height,
    });
  });

  return groups;
});

const contentHeight = computed(() => {
  const lastRow = props.rows[props.rows.length - 1];
  return lastRow ? lastRow.top + lastRow.height : 0;
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

  if (row.kind === "child-process" && row.colorHex) {
    style["--schedule-row-color-soft"] = toAlphaColor(row.colorHex, 0.16);
  }

  return style;
}

watch(
  () => props.scrollTop,
  (nextScrollTop) => {
    const element = containerRef.value;
    if (!element) {
      return;
    }

    if (Math.abs(element.scrollTop - nextScrollTop) < 1) {
      return;
    }

    syncingFromProp = true;
    element.scrollTop = nextScrollTop;
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
  emit("row-context-menu", {
    rowId: row.id,
    x: event.clientX,
    y: event.clientY,
  });
}
</script>

<template>
  <div
    ref="containerRef"
    class="schedule-row-panel"
    :style="{ height: `${viewportHeight}px` }"
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

        <div v-else-if="entry.row.kind === 'division'" class="schedule-row-panel__division-row">
          <p class="schedule-row-panel__division-title">
            {{ entry.row.name }}
          </p>
        </div>

        <div v-else class="schedule-row-panel__grid">
          <span class="schedule-row-panel__work-type-placeholder" />
          <span class="schedule-row-panel__sub-work-type">
            {{ entry.subWorkTypeLabel }}
          </span>
        </div>
      </div>

      <div class="schedule-row-panel__work-type-groups" aria-hidden="true">
        <div
          v-for="group in workTypeGroups"
          :key="group.key"
          class="schedule-row-panel__work-type-group"
          :style="{ top: `${group.top}px`, height: `${group.height}px` }"
          @pointerdown.stop
          @contextmenu.prevent.stop
        >
          {{ group.label }}
        </div>
      </div>
    </div>
  </div>
</template>
