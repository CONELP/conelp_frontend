<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";
import refreshIcon from "@fluentui/svg-icons/icons/arrow_clockwise_16_regular.svg";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminSelect from "@/shared/ui/admin/Select.vue";
import AdminCheckbox from "@/shared/ui/admin/Checkbox.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useComponentCode } from "@/features/project-admin/master-data/state/useComponentCode";

const {
  componentTypes,
  loadComponentTypes,
  getComponentTypeName,
  componentCodes,
  selectedComponentTypeId,
  newComponentCode,
  isCreatingCode,
  isDeletingCode,
  addComponentCode,
  deleteComponentCode,
  selectedComponentCodeIds,
  isAllComponentCodesSelected,
  toggleComponentCode,
  toggleAllComponentCodes,
  filteredMappings,
  isCreatingMapping,
  isDeletingMapping,
  deleteCcodeDetail,
  divisions,
  workTypes,
  subWorkTypes,
  workSteps,
  materialTypes,
  materialSpecs,
  mappingForm,
  isLoadingWorkTypes,
  isLoadingSubWorkTypes,
  isLoadingWorkSteps,
  isLoadingMaterialSpecs,
  loadDivisions,
  loadMaterialTypes,
  loadAllMappings,
  addMapping,
  selectedWorkStepIds,
  isAllWorkStepsSelected,
  toggleWorkStep,
  toggleAllWorkSteps,
  selectedMappingIds,
  isAllMappingsSelected,
  toggleMapping,
  toggleAllMappings,
  materialApplyForm,
  isApplyingMaterial,
  applyMaterialToSelectedMappings,
  isCreatingTasks,
  createTasksResult,
  showCreateTasksResult,
  createTasks,
} = useComponentCode();

const isMappingTableExpanded = ref(true);
const isComponentCodeListExpanded = ref(true);
const isWorkStepListExpanded = ref(true);

onMounted(() => {
  void loadDivisions();
  void loadMaterialTypes();
  void loadAllMappings();
  void loadComponentTypes();
});

function selectComponentType(id: number) {
  selectedComponentTypeId.value = id;
}

const componentTypeOptions = computed(() =>
  componentTypes.value.map((ct) => ({ value: ct.id, label: ct.name })),
);

const divisionOptions = computed(() =>
  divisions.value.map((d) => ({ value: String(d.id), label: d.name })),
);
const workTypeOptions = computed(() =>
  workTypes.value.map((w) => ({ value: String(w.id), label: w.name })),
);
const subWorkTypeOptions = computed(() =>
  subWorkTypes.value.map((s) => ({ value: String(s.id), label: s.name })),
);

const materialTypeOptions = computed(() =>
  materialTypes.value.map((m) => ({
    value: String(m.id),
    label: m.unit ? `${m.name} (${m.unit})` : m.name,
  })),
);
const materialSpecOptions = computed(() =>
  materialSpecs.value.map((m) => ({ value: String(m.id), label: m.name })),
);

const selectedComponentCodesLabel = computed(() => {
  if (selectedComponentCodeIds.value.length === 0) return "선택 안함";
  if (isAllComponentCodesSelected.value) return "모두선택";
  return `${selectedComponentCodeIds.value.length}개 선택`;
});

const selectedWorkStepsLabel = computed(() => {
  if (selectedWorkStepIds.value.length === 0) return "선택 안함";
  if (isAllWorkStepsSelected.value) return "모두선택";
  return `${selectedWorkStepIds.value.length}개 선택`;
});

const canAddMapping = computed(() => {
  return (
    !isCreatingMapping.value &&
    selectedComponentCodeIds.value.length > 0 &&
    selectedWorkStepIds.value.length > 0
  );
});

function refreshMappings() {
  void loadAllMappings();
}

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

function onCodeEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addComponentCode();
}
</script>

<template>
  <section class="cc-area">
    <!-- 부재 분류 -->
    <div class="cc-area__section">
      <h3 class="cc-area__title">부재분류</h3>
      <div class="cc-area__grid">
        <div class="cc-area__col">
          <p class="cc-area__col-label">부재 타입 (ComponentType)</p>
          <p class="cc-area__hint">※ 부재 타입은 시스템 관리자가 관리합니다. 여기서는 선택만 가능</p>
          <SortableReferenceList
            :items="componentTypes"
            :selected-id="selectedComponentTypeId"
            empty-message="항목 없음"
            @select="selectComponentType"
          />
        </div>

        <div class="cc-area__col">
          <p class="cc-area__col-label">부재 코드 (ComponentCode)</p>
          <div class="cc-area__row">
            <AdminInput
              v-model="newComponentCode"
              placeholder="코드 입력"
              :disabled="selectedComponentTypeId == null"
              @keydown="onCodeEnter"
            />
            <AdminButton
              size="sm"
              :disabled="
                isCreatingCode || !newComponentCode.trim() || selectedComponentTypeId == null
              "
              @click="addComponentCode"
            >
              추가
            </AdminButton>
          </div>
          <div class="cc-area__simple-list">
            <div v-for="cc in componentCodes" :key="cc.id" class="cc-area__simple-item">
              <span class="cc-area__simple-name">{{ cc.code }}</span>
              <button
                type="button"
                class="cc-area__icon-btn cc-area__icon-btn--danger"
                :disabled="isDeletingCode"
                aria-label="삭제"
                @click.stop="openDeleteDialog(cc.id, cc.code, deleteComponentCode)"
              >
                <img :src="dismissIcon" alt="" aria-hidden="true" />
              </button>
            </div>
            <p
              v-if="selectedComponentTypeId != null && componentCodes.length === 0"
              class="cc-area__empty"
            >
              항목 없음
            </p>
            <p v-if="selectedComponentTypeId == null" class="cc-area__empty">
              부재 타입을 선택하세요
            </p>
          </div>
        </div>
      </div>
    </div>

    <hr class="cc-area__divider" />

    <!-- 부재코드-작업절차-자재규격 매핑 -->
    <div class="cc-area__section">
      <h3 class="cc-area__title">부재코드-작업절차-자재규격 연결</h3>

      <div class="cc-area__grid">
        <!-- 부재코드 다중선택 -->
        <div class="cc-area__col">
          <div class="cc-area__col-head">
            <p class="cc-area__col-label">부재코드 선택</p>
            <span class="cc-area__selected">{{ selectedComponentCodesLabel }}</span>
          </div>

          <AdminSelect
            :model-value="selectedComponentTypeId"
            :options="componentTypeOptions"
            placeholder="부재타입 선택"
            @update:model-value="(v) => v != null && selectComponentType(Number(v))"
          />

          <div v-if="selectedComponentTypeId != null" class="cc-area__group">
            <button
              type="button"
              class="cc-area__group-head"
              @click="isComponentCodeListExpanded = !isComponentCodeListExpanded"
            >
              <span>부재코드 목록</span>
              <span class="cc-area__caret">{{ isComponentCodeListExpanded ? "▼" : "▶" }}</span>
            </button>
            <div v-show="isComponentCodeListExpanded" class="cc-area__group-body">
              <label v-if="componentCodes.length > 0" class="cc-area__check cc-area__check--all">
                <AdminCheckbox
                  :model-value="isAllComponentCodesSelected"
                  @update:model-value="toggleAllComponentCodes"
                />
                모두선택
              </label>
              <label v-for="cc in componentCodes" :key="cc.id" class="cc-area__check">
                <AdminCheckbox
                  :model-value="selectedComponentCodeIds.includes(cc.id)"
                  @update:model-value="() => toggleComponentCode(cc.id)"
                />
                {{ cc.code }}
              </label>
              <p v-if="componentCodes.length === 0" class="cc-area__empty">항목 없음</p>
            </div>
          </div>
          <p v-else class="cc-area__empty cc-area__empty--bordered">부재타입을 먼저 선택하세요</p>
        </div>

        <!-- 작업절차 다중선택 -->
        <div class="cc-area__col">
          <div class="cc-area__col-head">
            <p class="cc-area__col-label">작업절차 선택</p>
            <span class="cc-area__selected">{{ selectedWorkStepsLabel }}</span>
          </div>

          <div class="cc-area__cascading">
            <AdminSelect
              v-model="mappingForm.divisionId"
              :options="divisionOptions"
              placeholder="분류"
            />
            <AdminSelect
              v-model="mappingForm.workTypeId"
              :options="workTypeOptions"
              :placeholder="isLoadingWorkTypes ? '...' : '공종'"
              :disabled="!mappingForm.divisionId || isLoadingWorkTypes"
            />
            <AdminSelect
              v-model="mappingForm.subWorkTypeId"
              :options="subWorkTypeOptions"
              :placeholder="isLoadingSubWorkTypes ? '...' : '세부공종'"
              :disabled="!mappingForm.workTypeId || isLoadingSubWorkTypes"
            />
          </div>

          <div v-if="mappingForm.subWorkTypeId && !isLoadingWorkSteps" class="cc-area__group">
            <button
              type="button"
              class="cc-area__group-head"
              @click="isWorkStepListExpanded = !isWorkStepListExpanded"
            >
              <span>작업절차 목록</span>
              <span class="cc-area__caret">{{ isWorkStepListExpanded ? "▼" : "▶" }}</span>
            </button>
            <div v-show="isWorkStepListExpanded" class="cc-area__group-body">
              <label v-if="workSteps.length > 0" class="cc-area__check cc-area__check--all">
                <AdminCheckbox
                  :model-value="isAllWorkStepsSelected"
                  @update:model-value="toggleAllWorkSteps"
                />
                모두선택
              </label>
              <label v-for="ws in workSteps" :key="ws.id" class="cc-area__check">
                <AdminCheckbox
                  :model-value="selectedWorkStepIds.includes(ws.id)"
                  @update:model-value="() => toggleWorkStep(ws.id)"
                />
                <span>
                  {{ ws.name }}
                  <span class="cc-area__check-sub">· {{ getComponentTypeName(ws.componentTypeId) }}</span>
                </span>
              </label>
              <p v-if="workSteps.length === 0" class="cc-area__empty">항목 없음</p>
            </div>
          </div>
          <div v-else-if="isLoadingWorkSteps" class="cc-area__empty cc-area__empty--bordered">
            로딩 중...
          </div>
          <p v-else class="cc-area__empty cc-area__empty--bordered">세부공종을 먼저 선택하세요</p>
        </div>
      </div>

      <div class="cc-area__actions">
        <AdminButton size="sm" :disabled="!canAddMapping" @click="addMapping">
          연결 추가
          <span
            v-if="selectedComponentCodeIds.length > 0 && selectedWorkStepIds.length > 0"
          >
            ({{ selectedComponentCodeIds.length }} × {{ selectedWorkStepIds.length }})
          </span>
        </AdminButton>
      </div>

      <!-- 매핑 테이블 -->
      <div class="cc-area__table-wrap">
        <div class="cc-area__table-head">
          <button
            type="button"
            class="cc-area__table-toggle"
            @click="isMappingTableExpanded = !isMappingTableExpanded"
          >
            <span class="cc-area__caret">{{ isMappingTableExpanded ? "▼" : "▶" }}</span>
            <span>매핑 목록 ({{ filteredMappings.length }})</span>
          </button>
          <button
            type="button"
            class="cc-area__icon-btn"
            title="새로고침"
            @click.stop="refreshMappings"
          >
            <img :src="refreshIcon" alt="" aria-hidden="true" />
          </button>
        </div>

        <div v-show="isMappingTableExpanded" class="cc-area__table-body">
          <table v-if="filteredMappings.length > 0" class="cc-area__table">
            <thead>
              <tr>
                <th class="cc-area__th cc-area__th--check">
                  <AdminCheckbox
                    :model-value="isAllMappingsSelected"
                    @update:model-value="toggleAllMappings"
                  />
                </th>
                <th class="cc-area__th">부재코드</th>
                <th class="cc-area__th">작업절차</th>
                <th class="cc-area__th">자재규격</th>
                <th class="cc-area__th">층</th>
                <th class="cc-area__th cc-area__th--check">삭제</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in filteredMappings" :key="m.id">
                <td class="cc-area__td cc-area__td--check">
                  <AdminCheckbox
                    :model-value="selectedMappingIds.includes(m.id)"
                    @update:model-value="() => toggleMapping(m.id)"
                  />
                </td>
                <td class="cc-area__td">{{ m.componentCodeName }}</td>
                <td class="cc-area__td">{{ m.workStepName }}</td>
                <td class="cc-area__td">{{ m.materialSpecName || "-" }}</td>
                <td class="cc-area__td">{{ m.floorName || "-" }}</td>
                <td class="cc-area__td cc-area__td--check">
                  <button
                    type="button"
                    class="cc-area__icon-btn cc-area__icon-btn--danger"
                    :disabled="isDeletingMapping"
                    aria-label="삭제"
                    @click.stop="openDeleteDialog(m.id, m.componentCodeName, deleteCcodeDetail)"
                  >
                    <img :src="dismissIcon" alt="" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="cc-area__empty">연결된 작업절차가 없습니다</p>

          <div v-if="selectedMappingIds.length > 0" class="cc-area__apply-bar">
            <span class="cc-area__apply-count">{{ selectedMappingIds.length }}개 선택</span>
            <AdminSelect
              v-model="materialApplyForm.materialTypeId"
              :options="materialTypeOptions"
              placeholder="자재유형"
              class="cc-area__apply-select cc-area__apply-select--type"
            />
            <AdminSelect
              v-model="materialApplyForm.materialSpecId"
              :options="materialSpecOptions"
              :placeholder="isLoadingMaterialSpecs ? '로딩...' : '자재규격'"
              :disabled="!materialApplyForm.materialTypeId || isLoadingMaterialSpecs"
              class="cc-area__apply-select"
            />
            <AdminButton
              size="sm"
              :disabled="!materialApplyForm.materialSpecId || isApplyingMaterial"
              @click="applyMaterialToSelectedMappings"
            >
              자재 적용
            </AdminButton>
          </div>
        </div>
      </div>
    </div>

    <hr class="cc-area__divider" />

    <div class="cc-area__actions cc-area__actions--end">
      <AdminButton :disabled="isCreatingTasks" @click="createTasks">
        {{ isCreatingTasks ? "생성 중..." : "세부작업 생성" }}
      </AdminButton>
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

    <AdminDialog
      :open="showCreateTasksResult"
      title="세부작업 생성 완료"
      width="sm"
      @update:open="showCreateTasksResult = $event"
    >
      <div v-if="createTasksResult" class="cc-area__result">
        <div class="cc-area__result-row">
          <span class="cc-area__result-label">생성된 작업 수</span>
          <span class="cc-area__result-value">{{ createTasksResult.createdCount }}건</span>
        </div>
        <div class="cc-area__result-row">
          <span class="cc-area__result-label">건너뛴 중복 작업 수</span>
          <span class="cc-area__result-value">{{ createTasksResult.skippedDuplicateCount }}건</span>
        </div>
        <div class="cc-area__result-row">
          <span class="cc-area__result-label">부재코드 없는 건 수</span>
          <span class="cc-area__result-value">{{ createTasksResult.skippedNoCcodeCount }}건</span>
        </div>
      </div>
      <template #footer>
        <AdminButton @click="showCreateTasksResult = false">확인</AdminButton>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.cc-area {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.cc-area__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cc-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.cc-area__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.cc-area__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.cc-area__col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cc-area__col-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.cc-area__selected {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
}
.cc-area__hint {
  margin: 0;
  font-size: 10px;
  color: var(--ink-faint);
}
.cc-area__row {
  display: flex;
  gap: 6px;
}
.cc-area__cascading {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}
.cc-area__actions {
  display: flex;
  justify-content: flex-end;
}
.cc-area__actions--end {
  margin-top: 8px;
}
.cc-area__divider {
  border: 0;
  border-top: 1px solid var(--outline-soft);
  margin: 0;
}

.cc-area__simple-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 192px;
  overflow-y: auto;
}
.cc-area__simple-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  font-size: 13px;
}
.cc-area__simple-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cc-area__group {
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  overflow: hidden;
}
.cc-area__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface-1);
  border: none;
  cursor: pointer;
}
.cc-area__group-head:hover {
  background: var(--surface-3);
}
.cc-area__caret {
  font-size: 10px;
  color: var(--ink-muted);
}
.cc-area__group-body {
  border-top: 1px solid var(--outline-soft);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.cc-area__check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
}
.cc-area__check--all {
  font-weight: 600;
  color: var(--primary);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--outline-soft);
}
.cc-area__check-sub {
  font-size: 11px;
  color: var(--ink-faint);
}

.cc-area__empty {
  margin: 0;
  font-size: 12px;
  color: var(--ink-faint);
  text-align: center;
  padding: 8px 0;
}
.cc-area__empty--bordered {
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  padding: 8px 12px;
}

.cc-area__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--ink-muted);
}
.cc-area__icon-btn:hover {
  background: var(--surface-3);
  color: var(--ink);
}
.cc-area__icon-btn--danger:hover {
  background: rgba(185, 28, 28, 0.1);
}
.cc-area__icon-btn img {
  width: 14px;
  height: 14px;
}
.cc-area__icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cc-area__table-wrap {
  margin-top: 12px;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  overflow: hidden;
}
.cc-area__table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
}
.cc-area__table-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--ink);
}
.cc-area__table-body {
  border-top: 1px solid var(--outline-soft);
}
.cc-area__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.cc-area__th {
  text-align: left;
  font-weight: 600;
  padding: 8px 12px;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
}
.cc-area__th--check {
  width: 40px;
  text-align: center;
}
.cc-area__td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--outline-soft);
}
.cc-area__td--check {
  width: 40px;
  text-align: center;
}
.cc-area__table tbody tr:hover {
  background: var(--surface-3);
}
.cc-area__table tbody tr:last-child .cc-area__td {
  border-bottom: none;
}

.cc-area__apply-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--outline-soft);
  background: var(--surface-3);
  flex-wrap: wrap;
}
.cc-area__apply-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.cc-area__apply-select {
  width: 140px;
}
.cc-area__apply-select--type {
  width: 160px;
}

.cc-area__result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.cc-area__result-row {
  display: flex;
  justify-content: space-between;
}
.cc-area__result-label {
  color: var(--ink-muted);
}
.cc-area__result-value {
  font-weight: 600;
}

@media (max-width: 720px) {
  .cc-area__grid {
    grid-template-columns: 1fr;
  }
}
</style>
