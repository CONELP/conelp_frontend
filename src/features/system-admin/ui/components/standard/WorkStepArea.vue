<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminSelect from "@/shared/ui/admin/Select.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useWorkStepMaster } from "@/features/system-admin/state/standard/useWorkStepMaster";

const {
  divisions,
  workTypes,
  subWorkTypes,
  componentTypes,
  workSteps,
  selectedDivisionId,
  selectedWorkTypeId,
  selectedSubWorkTypeId,
  newWorkStepName,
  newWorkStepComponentTypeId,
  isCreating,
  isDeleting,
  loadDivisions,
  loadComponentTypes,
  addWorkStep,
  deleteWorkStep,
  updateWorkStepName,
  updateWorkStepComponentType,
  reorderWorkSteps,
  getComponentTypeName,
} = useWorkStepMaster();

onMounted(() => {
  void loadDivisions();
  void loadComponentTypes();
});

const divisionOptions = computed(() =>
  divisions.value.map((d) => ({ value: d.id, label: d.name })),
);
const workTypeOptions = computed(() =>
  workTypes.value.map((w) => ({ value: w.id, label: w.name })),
);
const subWorkTypeOptions = computed(() =>
  subWorkTypes.value.map((s) => ({ value: s.id, label: s.name })),
);
const componentTypeOptions = computed(() =>
  componentTypes.value.map((c) => ({ value: c.id, label: c.name })),
);

const showDeleteDialog = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref("");

function openDeleteDialog(id: number, name: string) {
  deleteTargetId.value = id;
  deleteTargetName.value = name;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value != null) await deleteWorkStep(deleteTargetId.value);
}

const showCtypeDialog = ref(false);
const ctypeTargetId = ref<number | null>(null);
const ctypeTargetName = ref("");
const ctypeSelected = ref<number | null>(null);

function openCtypeDialog(workStepId: number) {
  const ws = workSteps.value.find((w) => w.id === workStepId);
  if (!ws) return;
  ctypeTargetId.value = ws.id;
  ctypeTargetName.value = ws.name;
  ctypeSelected.value = ws.componentTypeId ?? null;
  showCtypeDialog.value = true;
}

async function saveCtype() {
  if (ctypeTargetId.value != null && ctypeSelected.value != null) {
    await updateWorkStepComponentType(ctypeTargetId.value, ctypeSelected.value);
  }
  showCtypeDialog.value = false;
}

function workStepSuffix(item: { id: number; [key: string]: unknown }): string {
  const cid = item.componentTypeId as number | undefined;
  if (cid == null) return "";
  const name = getComponentTypeName(cid);
  return name ? ` · ${name}` : "";
}

function onStepEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addWorkStep();
}
</script>

<template>
  <section class="ws-area">
    <h3 class="ws-area__title">작업절차 (WorkStep)</h3>

    <div class="ws-area__cascading">
      <div class="ws-area__col">
        <p class="ws-area__label">분류 (Division)</p>
        <AdminSelect
          v-model="selectedDivisionId"
          :options="divisionOptions"
          placeholder="분류 선택"
        />
      </div>
      <div class="ws-area__col">
        <p class="ws-area__label">공종 (WorkType)</p>
        <AdminSelect
          v-model="selectedWorkTypeId"
          :options="workTypeOptions"
          :placeholder="selectedDivisionId ? '공종 선택' : '분류를 먼저 선택'"
          :disabled="!selectedDivisionId"
        />
      </div>
      <div class="ws-area__col">
        <p class="ws-area__label">세부공종 (SubWorkType)</p>
        <AdminSelect
          v-model="selectedSubWorkTypeId"
          :options="subWorkTypeOptions"
          :placeholder="selectedWorkTypeId ? '세부공종 선택' : '공종을 먼저 선택'"
          :disabled="!selectedWorkTypeId"
        />
      </div>
    </div>

    <div class="ws-area__create">
      <AdminSelect
        v-model="newWorkStepComponentTypeId"
        :options="componentTypeOptions"
        placeholder="부재타입 선택"
        :disabled="!selectedSubWorkTypeId"
      />
      <div class="ws-area__row">
        <AdminInput
          v-model="newWorkStepName"
          placeholder="작업절차 이름"
          :disabled="!selectedSubWorkTypeId || newWorkStepComponentTypeId == null"
          @keydown="onStepEnter"
        />
        <AdminButton
          size="sm"
          :disabled="
            isCreating ||
            !newWorkStepName.trim() ||
            !selectedSubWorkTypeId ||
            newWorkStepComponentTypeId == null
          "
          @click="addWorkStep"
        >
          추가
        </AdminButton>
      </div>
    </div>

    <SortableReferenceList
      :items="workSteps"
      :disabled="isDeleting"
      :empty-message="selectedSubWorkTypeId ? '항목 없음' : '세부공종을 선택하세요'"
      :display-suffix="workStepSuffix"
      @select="(id) => openCtypeDialog(id)"
      @delete="(id, name) => openDeleteDialog(id, name)"
      @update-name="({ id, name }) => updateWorkStepName(id, name)"
      @reorder="reorderWorkSteps"
    />

    <ConfirmDialog
      :open="showDeleteDialog"
      title="삭제 확인"
      :message="`'${deleteTargetName}' 작업절차를 삭제하시겠습니까?`"
      confirm-label="삭제"
      destructive
      @update:open="showDeleteDialog = $event"
      @confirm="confirmDelete"
    />

    <AdminDialog
      :open="showCtypeDialog"
      :title="`부재타입 변경 — ${ctypeTargetName}`"
      width="sm"
      @update:open="showCtypeDialog = $event"
    >
      <AdminSelect
        v-model="ctypeSelected"
        :options="componentTypeOptions"
        placeholder="부재타입 선택"
      />
      <template #footer>
        <AdminButton variant="outline" @click="showCtypeDialog = false">취소</AdminButton>
        <AdminButton :disabled="ctypeSelected == null" @click="saveCtype">저장</AdminButton>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.ws-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ws-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.ws-area__cascading {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}
.ws-area__col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ws-area__label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.ws-area__create {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ws-area__row {
  display: flex;
  gap: 6px;
}
@media (max-width: 720px) {
  .ws-area__cascading,
  .ws-area__create {
    grid-template-columns: 1fr;
  }
}
</style>
