<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

import reorderIcon from "@fluentui/svg-icons/icons/re_order_dots_vertical_16_regular.svg";
import editIcon from "@fluentui/svg-icons/icons/edit_16_regular.svg";
import checkIcon from "@fluentui/svg-icons/icons/checkmark_16_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";

interface ListItem {
  id: number;
  [key: string]: unknown;
}

const props = withDefaults(
  defineProps<{
    items: ListItem[];
    selectedId?: number | null;
    displayKey?: string;
    displaySuffix?: (item: ListItem) => string;
    disabled?: boolean;
    emptyMessage?: string;
    selectable?: boolean;
    unitEditable?: boolean;
    unitKey?: string;
    unitLabel?: string;
  }>(),
  {
    selectedId: null,
    displayKey: "name",
    displaySuffix: undefined,
    disabled: false,
    emptyMessage: "항목 없음",
    selectable: true,
    unitEditable: false,
    unitKey: "unit",
    unitLabel: "단위",
  },
);

const emit = defineEmits<{
  select: [id: number];
  delete: [id: number, name: string];
  "update-name": [payload: { id: number; name: string; unit?: string }];
  reorder: [ids: number[]];
}>();

const localItems = ref<ListItem[]>([]);
const editingId = ref<number | null>(null);
const editingName = ref("");
const editingUnit = ref("");
const editInputRef = ref<HTMLInputElement | null>(null);
const draggingId = ref<number | null>(null);
const dragOverId = ref<number | null>(null);

watch(
  () => props.items,
  (newItems) => {
    localItems.value = [...newItems];
  },
  { immediate: true, deep: true },
);

function onDragStart(e: DragEvent, id: number) {
  draggingId.value = id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  }
}

function onDragOver(e: DragEvent, id: number) {
  if (draggingId.value == null) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  dragOverId.value = id;
}

function onDragLeave(id: number) {
  if (dragOverId.value === id) dragOverId.value = null;
}

function onDrop(e: DragEvent, targetId: number) {
  e.preventDefault();
  const sourceId = draggingId.value;
  draggingId.value = null;
  dragOverId.value = null;
  if (sourceId == null || sourceId === targetId) return;

  const sourceIndex = localItems.value.findIndex((item) => item.id === sourceId);
  const targetIndex = localItems.value.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;

  const next = [...localItems.value];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  localItems.value = next;
  emit(
    "reorder",
    next.map((item) => item.id),
  );
}

function onDragEnd() {
  draggingId.value = null;
  dragOverId.value = null;
}

function onItemClick(id: number) {
  if (props.selectable && editingId.value !== id) {
    emit("select", id);
  }
}

function startEditing(item: ListItem) {
  editingId.value = item.id;
  editingName.value = String(item[props.displayKey] ?? "");
  if (props.unitEditable) {
    editingUnit.value = String(item[props.unitKey] ?? "");
  }
  nextTick(() => {
    editInputRef.value?.focus();
    editInputRef.value?.select();
  });
}

function confirmEdit() {
  if (editingId.value == null) return;
  const trimmed = editingName.value.trim();
  if (trimmed) {
    const payload: { id: number; name: string; unit?: string } = {
      id: editingId.value,
      name: trimmed,
    };
    if (props.unitEditable) payload.unit = editingUnit.value.trim();
    emit("update-name", payload);
  }
  editingId.value = null;
  editingName.value = "";
  editingUnit.value = "";
}

function cancelEdit() {
  editingId.value = null;
  editingName.value = "";
  editingUnit.value = "";
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.isComposing) return;
  if (e.key === "Enter") {
    confirmEdit();
  } else if (e.key === "Escape") {
    cancelEdit();
  }
}

function handleOutsidePointer(e: PointerEvent) {
  if (editingId.value == null) return;
  const target = e.target as HTMLElement | null;
  if (!target) return;
  if (target.closest('[data-editing-row="true"]')) return;
  if (target.closest('[role="dialog"]')) return;
  confirmEdit();
}

watch(editingId, (id) => {
  if (id != null) {
    document.addEventListener("pointerdown", handleOutsidePointer, true);
  } else {
    document.removeEventListener("pointerdown", handleOutsidePointer, true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsidePointer, true);
});
</script>

<template>
  <div class="sortable-list">
    <div
      v-for="item in localItems"
      :key="item.id"
      class="sortable-list__item"
      :class="{
        'sortable-list__item--selected': selectable && selectedId === item.id,
        'sortable-list__item--editing': editingId === item.id,
        'sortable-list__item--drag-over': dragOverId === item.id && draggingId !== item.id,
        'sortable-list__item--disabled': disabled,
      }"
      :data-editing-row="editingId === item.id ? 'true' : undefined"
      @click="onItemClick(item.id)"
      @dragover="onDragOver($event, item.id)"
      @dragleave="onDragLeave(item.id)"
      @drop="onDrop($event, item.id)"
    >
      <button
        type="button"
        class="sortable-list__handle"
        :draggable="!disabled && editingId !== item.id"
        :aria-label="'순서 변경'"
        @click.stop
        @dragstart="onDragStart($event, item.id)"
        @dragend="onDragEnd"
      >
        <img :src="reorderIcon" alt="" aria-hidden="true" />
      </button>

      <template v-if="editingId === item.id">
        <input
          ref="editInputRef"
          v-model="editingName"
          class="sortable-list__input"
          :class="{ 'sortable-list__input--name-with-unit': unitEditable }"
          @keydown="onEditKeydown"
          @click.stop
        />
        <input
          v-if="unitEditable"
          v-model="editingUnit"
          :placeholder="unitLabel"
          class="sortable-list__input sortable-list__input--unit"
          @keydown="onEditKeydown"
          @click.stop
        />
      </template>
      <template v-else>
        <span class="sortable-list__label">
          {{ item[displayKey] }}
          <span v-if="displaySuffix" class="sortable-list__suffix">{{ displaySuffix(item) }}</span>
        </span>
      </template>

      <slot v-if="editingId === item.id" name="edit-actions" :item="item" />

      <button
        v-if="editingId === item.id"
        type="button"
        class="sortable-list__action sortable-list__action--confirm"
        :title="'확인'"
        @click.stop="confirmEdit"
      >
        <img :src="checkIcon" alt="" aria-hidden="true" />
      </button>
      <button
        v-else
        type="button"
        class="sortable-list__action sortable-list__action--edit"
        :disabled="disabled"
        :title="'수정'"
        @click.stop="startEditing(item)"
      >
        <img :src="editIcon" alt="" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="sortable-list__action sortable-list__action--delete"
        :disabled="disabled"
        :title="'삭제'"
        @click.stop="emit('delete', item.id, String(item[displayKey]))"
      >
        <img :src="dismissIcon" alt="" aria-hidden="true" />
      </button>
    </div>

    <p v-if="localItems.length === 0" class="sortable-list__empty">{{ emptyMessage }}</p>
  </div>
</template>

<style scoped>
.sortable-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 4px;
}
.sortable-list__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface-1);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.sortable-list__item:hover {
  background: #fafafa;
}
.sortable-list__item--selected {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}
.sortable-list__item--drag-over {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.sortable-list__item--editing {
  background: var(--surface-1);
  cursor: default;
}
.sortable-list__item--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sortable-list__handle {
  background: transparent;
  border: none;
  padding: 2px;
  cursor: grab;
  color: var(--ink-faint);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
}
.sortable-list__item:hover .sortable-list__handle {
  opacity: 1;
}
.sortable-list__handle:active {
  cursor: grabbing;
}
.sortable-list__handle img {
  width: 14px;
  height: 14px;
}

.sortable-list__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sortable-list__suffix {
  color: var(--ink-faint);
  margin-left: 4px;
}

.sortable-list__input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font: inherit;
  font-size: 12px;
  border: 1px solid var(--outline-soft);
  border-radius: 6px;
  outline: none;
}
.sortable-list__input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-outline);
}
.sortable-list__input--name-with-unit {
  flex-basis: 60%;
}
.sortable-list__input--unit {
  flex-basis: 35%;
}

.sortable-list__action {
  background: transparent;
  border: none;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 120ms ease, background 120ms ease;
  flex-shrink: 0;
}
.sortable-list__item:hover .sortable-list__action,
.sortable-list__action--confirm {
  opacity: 1;
}
.sortable-list__action img {
  width: 14px;
  height: 14px;
}
.sortable-list__action--edit:hover {
  background: var(--primary-soft);
}
.sortable-list__action--confirm {
  color: var(--primary);
}
.sortable-list__action--confirm:hover {
  background: var(--primary-soft);
}
.sortable-list__action--delete:hover {
  background: rgba(185, 28, 28, 0.1);
}
.sortable-list__action:disabled {
  opacity: 0.3 !important;
  cursor: not-allowed;
}

.sortable-list__empty {
  font-size: 12px;
  color: var(--ink-faint);
  text-align: center;
  padding: 16px 0;
  margin: 0;
}
</style>
