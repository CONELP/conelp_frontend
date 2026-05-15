<script setup lang="ts">
import { onMounted, ref } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useEquipmentMaster } from "@/features/system-admin/state/standard/useEquipmentMaster";

const {
  equipmentTypes,
  equipmentSpecs,
  selectedEquipmentTypeId,
  newEquipmentTypeName,
  newEquipmentSpecName,
  isCreating,
  isDeleting,
  loadEquipmentTypes,
  selectEquipmentType,
  addEquipmentType,
  addEquipmentSpec,
  deleteEquipmentType,
  deleteEquipmentSpec,
  updateEquipmentTypeName,
  updateEquipmentSpecName,
  reorderEquipmentTypes,
  reorderEquipmentSpecs,
} = useEquipmentMaster();

onMounted(() => {
  void loadEquipmentTypes();
});

const showDeleteDialog = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref("");
const deleteAction = ref<((id: number) => Promise<void>) | null>(null);

function openDeleteDialog(id: number, name: string, fn: (id: number) => Promise<void>) {
  deleteTargetId.value = id;
  deleteTargetName.value = name;
  deleteAction.value = fn;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value != null && deleteAction.value) {
    await deleteAction.value(deleteTargetId.value);
  }
}

function onTypeEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addEquipmentType();
}
function onSpecEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addEquipmentSpec();
}
</script>

<template>
  <section class="eq-area">
    <h3 class="eq-area__title">장비분류</h3>
    <div class="eq-area__grid">
      <div class="eq-area__col">
        <p class="eq-area__label">장비유형 (EquipmentType)</p>
        <div class="eq-area__row">
          <AdminInput
            v-model="newEquipmentTypeName"
            placeholder="이름 입력"
            @keydown="onTypeEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newEquipmentTypeName.trim()"
            @click="addEquipmentType"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="equipmentTypes"
          :selected-id="selectedEquipmentTypeId"
          :disabled="isDeleting"
          @select="selectEquipmentType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteEquipmentType)"
          @update-name="({ id, name }) => updateEquipmentTypeName(id, name)"
          @reorder="reorderEquipmentTypes"
        />
      </div>

      <div class="eq-area__col">
        <p class="eq-area__label">장비규격 (EquipmentSpec)</p>
        <div class="eq-area__row">
          <AdminInput
            v-model="newEquipmentSpecName"
            placeholder="이름 입력"
            :disabled="!selectedEquipmentTypeId"
            @keydown="onSpecEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newEquipmentSpecName.trim() || !selectedEquipmentTypeId"
            @click="addEquipmentSpec"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="equipmentSpecs"
          :selectable="false"
          :disabled="isDeleting"
          :empty-message="selectedEquipmentTypeId ? '항목 없음' : '장비유형을 선택하세요'"
          @delete="(id, name) => openDeleteDialog(id, name, deleteEquipmentSpec)"
          @update-name="({ id, name }) => updateEquipmentSpecName(id, name)"
          @reorder="reorderEquipmentSpecs"
        />
      </div>
    </div>

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
.eq-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.eq-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.eq-area__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.eq-area__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.eq-area__label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.eq-area__row {
  display: flex;
  gap: 6px;
}
@media (max-width: 720px) {
  .eq-area__grid {
    grid-template-columns: 1fr;
  }
}
</style>
