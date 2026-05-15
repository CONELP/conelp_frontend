<script setup lang="ts">
import { onMounted, ref } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useMaterialMaster } from "@/features/project-admin/master-data/state/useMaterialMaster";

const {
  materialTypes,
  materialSpecs,
  selectedMaterialTypeId,
  newMaterialTypeName,
  newMaterialTypeUnit,
  newMaterialSpecName,
  isCreating,
  isDeleting,
  loadMaterialTypes,
  selectMaterialType,
  addMaterialType,
  addMaterialSpec,
  deleteMaterialType,
  deleteMaterialSpec,
  updateMaterialType,
  updateMaterialSpecName,
  reorderMaterialTypes,
  reorderMaterialSpecs,
} = useMaterialMaster();

onMounted(() => {
  void loadMaterialTypes();
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
  if (!e.isComposing) void addMaterialType();
}
function onSpecEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addMaterialSpec();
}

function materialTypeSuffix(item: { id: number; [key: string]: unknown }): string {
  const unit = item.unit;
  return typeof unit === "string" && unit ? `(${unit})` : "";
}
</script>

<template>
  <section class="material-area">
    <h3 class="material-area__title">자재분류</h3>
    <div class="material-area__grid">
      <div class="material-area__col">
        <p class="material-area__col-label">자재유형 (MaterialType)</p>
        <div class="material-area__row">
          <AdminInput v-model="newMaterialTypeName" placeholder="이름 입력" @keydown="onTypeEnter" />
          <AdminInput
            v-model="newMaterialTypeUnit"
            placeholder="단위"
            class="material-area__unit"
            @keydown="onTypeEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newMaterialTypeName.trim()"
            @click="addMaterialType"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="materialTypes"
          :selected-id="selectedMaterialTypeId"
          :disabled="isDeleting"
          :display-suffix="materialTypeSuffix"
          unit-editable
          @select="selectMaterialType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialType)"
          @update-name="({ id, name, unit }) => updateMaterialType(id, name, unit)"
          @reorder="reorderMaterialTypes"
        />
      </div>

      <div class="material-area__col">
        <p class="material-area__col-label">자재규격 (MaterialSpec)</p>
        <div class="material-area__row">
          <AdminInput
            v-model="newMaterialSpecName"
            placeholder="이름 입력"
            :disabled="!selectedMaterialTypeId"
            @keydown="onSpecEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newMaterialSpecName.trim() || !selectedMaterialTypeId"
            @click="addMaterialSpec"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="materialSpecs"
          :selectable="false"
          :disabled="isDeleting"
          :empty-message="selectedMaterialTypeId ? '항목 없음' : '자재유형을 선택하세요'"
          @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialSpec)"
          @update-name="({ id, name }) => updateMaterialSpecName(id, name)"
          @reorder="reorderMaterialSpecs"
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
.material-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.material-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.material-area__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.material-area__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.material-area__col-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.material-area__row {
  display: flex;
  gap: 6px;
}
.material-area__unit {
  max-width: 80px;
}
@media (max-width: 720px) {
  .material-area__grid {
    grid-template-columns: 1fr;
  }
}
</style>
