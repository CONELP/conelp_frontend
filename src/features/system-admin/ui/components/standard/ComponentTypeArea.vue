<script setup lang="ts">
import { onMounted, ref } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useComponentTypeMaster } from "@/features/system-admin/state/standard/useComponentTypeMaster";

const {
  componentTypes,
  newComponentTypeName,
  isCreating,
  isDeleting,
  loadComponentTypes,
  addComponentType,
  deleteComponentType,
  updateComponentTypeName,
  reorderComponentTypes,
} = useComponentTypeMaster();

onMounted(() => {
  void loadComponentTypes();
});

const showDeleteDialog = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref("");

function openDeleteDialog(id: number, name: string) {
  deleteTargetId.value = id;
  deleteTargetName.value = name;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value != null) await deleteComponentType(deleteTargetId.value);
}

function onEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addComponentType();
}
</script>

<template>
  <section class="ct-area">
    <p class="ct-area__label">부재 타입 (ComponentType)</p>
    <div class="ct-area__row">
      <AdminInput
        v-model="newComponentTypeName"
        placeholder="이름 입력"
        @keydown="onEnter"
      />
      <AdminButton
        size="sm"
        :disabled="isCreating || !newComponentTypeName.trim()"
        @click="addComponentType"
      >
        추가
      </AdminButton>
    </div>
    <SortableReferenceList
      :items="componentTypes"
      :disabled="isDeleting"
      empty-message="항목 없음"
      @delete="(id, name) => openDeleteDialog(id, name)"
      @update-name="({ id, name }) => updateComponentTypeName(id, name)"
      @reorder="reorderComponentTypes"
    />

    <ConfirmDialog
      :open="showDeleteDialog"
      title="삭제 확인"
      :message="`'${deleteTargetName}' 항목을 삭제하시겠습니까?`"
      confirm-label="삭제"
      destructive
      @update:open="showDeleteDialog = $event"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.ct-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 480px;
}
.ct-area__label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.ct-area__row {
  display: flex;
  gap: 6px;
}
</style>
