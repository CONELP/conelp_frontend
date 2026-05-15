<script setup lang="ts">
import { onMounted, ref } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useLaborType } from "@/features/system-admin/state/standard/useLaborType";

const {
  divisions,
  workTypes,
  laborTypes,
  selectedDivisionId,
  selectedWorkTypeId,
  newLaborTypeName,
  isCreating,
  isDeleting,
  loadDivisions,
  selectDivision,
  selectWorkType,
  addLaborType,
  deleteLaborType,
  updateLaborTypeName,
  reorderLaborTypes,
} = useLaborType();

onMounted(() => {
  void loadDivisions();
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
  if (deleteTargetId.value != null) await deleteLaborType(deleteTargetId.value);
}

function onEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addLaborType();
}
</script>

<template>
  <section class="labor-area">
    <h3 class="labor-area__title">직종 관리 (LaborType)</h3>
    <div class="labor-area__grid">
      <div class="labor-area__col">
        <p class="labor-area__label">분류 (Division)</p>
        <SortableReferenceList
          :items="divisions"
          :selected-id="selectedDivisionId"
          :disabled="isDeleting"
          @select="selectDivision"
        />
      </div>

      <div class="labor-area__col">
        <p class="labor-area__label">공종 (WorkType)</p>
        <SortableReferenceList
          :items="workTypes"
          :selected-id="selectedWorkTypeId"
          :disabled="isDeleting"
          :empty-message="selectedDivisionId ? '항목 없음' : '분류를 선택하세요'"
          @select="selectWorkType"
        />
      </div>

      <div class="labor-area__col">
        <p class="labor-area__label">직종 (LaborType)</p>
        <div class="labor-area__row">
          <AdminInput
            v-model="newLaborTypeName"
            placeholder="직종명 입력"
            :disabled="!selectedWorkTypeId"
            @keydown="onEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newLaborTypeName.trim() || !selectedWorkTypeId"
            @click="addLaborType"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="laborTypes"
          :selectable="false"
          :disabled="isDeleting"
          :empty-message="selectedWorkTypeId ? '항목 없음' : '공종을 선택하세요'"
          @delete="(id, name) => openDeleteDialog(id, name)"
          @update-name="({ id, name }) => updateLaborTypeName(id, name)"
          @reorder="reorderLaborTypes"
        />
      </div>
    </div>

    <ConfirmDialog
      :open="showDeleteDialog"
      title="삭제 확인"
      :message="`'${deleteTargetName}' 직종을 삭제하시겠습니까?`"
      confirm-label="삭제"
      destructive
      @update:open="showDeleteDialog = $event"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.labor-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.labor-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.labor-area__grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
.labor-area__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.labor-area__label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.labor-area__row {
  display: flex;
  gap: 6px;
}
@media (max-width: 960px) {
  .labor-area__grid {
    grid-template-columns: 1fr;
  }
}
</style>
