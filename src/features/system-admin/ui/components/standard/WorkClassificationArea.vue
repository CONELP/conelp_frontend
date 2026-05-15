<script setup lang="ts">
import { onMounted, ref } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useWorkClassification } from "@/features/system-admin/state/standard/useWorkClassification";

const {
  divisions,
  workTypes,
  subWorkTypes,
  selectedDivisionId,
  selectedWorkTypeId,
  selectedSubWorkTypeId,
  newDivisionName,
  newWorkTypeName,
  newSubWorkTypeName,
  isCreating,
  isDeleting,
  loadDivisions,
  selectDivision,
  selectWorkType,
  selectSubWorkType,
  addDivision,
  addWorkType,
  addSubWorkType,
  deleteDivision,
  deleteWorkType,
  deleteSubWorkType,
  updateDivisionName,
  updateWorkTypeName,
  updateSubWorkTypeName,
  reorderDivisions,
  reorderWorkTypes,
  reorderSubWorkTypes,
} = useWorkClassification();

onMounted(() => {
  void loadDivisions();
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

function onDivisionEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addDivision();
}
function onWorkTypeEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addWorkType();
}
function onSubWorkTypeEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addSubWorkType();
}
</script>

<template>
  <section class="wc-area">
    <h3 class="wc-area__title">공종분류</h3>
    <div class="wc-area__grid">
      <div class="wc-area__col">
        <p class="wc-area__label">분류 (Division)</p>
        <div class="wc-area__row">
          <AdminInput
            v-model="newDivisionName"
            placeholder="이름 입력"
            @keydown="onDivisionEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newDivisionName.trim()"
            @click="addDivision"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="divisions"
          :selected-id="selectedDivisionId"
          :disabled="isDeleting"
          @select="selectDivision"
          @delete="(id, name) => openDeleteDialog(id, name, deleteDivision)"
          @update-name="({ id, name }) => updateDivisionName(id, name)"
          @reorder="reorderDivisions"
        />
      </div>

      <div class="wc-area__col">
        <p class="wc-area__label">공종 (WorkType)</p>
        <div class="wc-area__row">
          <AdminInput
            v-model="newWorkTypeName"
            placeholder="이름 입력"
            :disabled="!selectedDivisionId"
            @keydown="onWorkTypeEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newWorkTypeName.trim() || !selectedDivisionId"
            @click="addWorkType"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="workTypes"
          :selected-id="selectedWorkTypeId"
          :disabled="isDeleting"
          :empty-message="!selectedDivisionId ? '분류를 선택하세요' : '항목 없음'"
          @select="selectWorkType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteWorkType)"
          @update-name="({ id, name }) => updateWorkTypeName(id, name)"
          @reorder="reorderWorkTypes"
        />
      </div>

      <div class="wc-area__col">
        <p class="wc-area__label">세부공종 (SubWorkType)</p>
        <div class="wc-area__row">
          <AdminInput
            v-model="newSubWorkTypeName"
            placeholder="이름 입력"
            :disabled="!selectedWorkTypeId"
            @keydown="onSubWorkTypeEnter"
          />
          <AdminButton
            size="sm"
            :disabled="isCreating || !newSubWorkTypeName.trim() || !selectedWorkTypeId"
            @click="addSubWorkType"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="subWorkTypes"
          :selected-id="selectedSubWorkTypeId"
          :disabled="isDeleting"
          :empty-message="selectedWorkTypeId ? '항목 없음' : '공종을 선택하세요'"
          @select="selectSubWorkType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteSubWorkType)"
          @update-name="({ id, name }) => updateSubWorkTypeName(id, name)"
          @reorder="reorderSubWorkTypes"
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
.wc-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.wc-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.wc-area__grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
.wc-area__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.wc-area__label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.wc-area__row {
  display: flex;
  gap: 6px;
}
@media (max-width: 960px) {
  .wc-area__grid {
    grid-template-columns: 1fr;
  }
}
</style>
