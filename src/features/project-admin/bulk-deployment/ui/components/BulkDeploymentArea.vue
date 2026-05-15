<script setup lang="ts">
import { computed, onMounted } from "vue";

import addIcon from "@fluentui/svg-icons/icons/add_16_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import AdminSelect from "@/shared/ui/admin/Select.vue";
import { useBulkDeployment } from "@/features/project-admin/bulk-deployment/state/useBulkDeployment";

const {
  startDate,
  endDate,
  isSubmittingAttendance,
  isSubmittingEquipment,
  laborTypesByWorkType,
  equipmentSpecs,
  workTypes,
  attendanceBoxes,
  equipmentRows,
  canSubmitAttendance,
  canSubmitEquipment,
  initDates,
  loadReferenceData,
  addAttendanceBox,
  removeAttendanceBox,
  selectWorkType,
  addEquipmentRow,
  removeEquipmentRow,
  submitAttendance,
  submitEquipment,
} = useBulkDeployment();

onMounted(async () => {
  await Promise.all([initDates(), loadReferenceData()]);
});

const workTypeOptions = computed(() =>
  laborTypesByWorkType.value.map((g) => ({ value: g.workTypeId, label: g.workTypeName })),
);
const equipmentSpecOptions = computed(() =>
  equipmentSpecs.value.map((es) => ({
    value: es.id,
    label: `${es.name} (${es.equipmentTypeName})`,
  })),
);
const workTypeOptionsForEquip = computed(() =>
  workTypes.value.map((wt) => ({ value: wt.id, label: wt.name })),
);
</script>

<template>
  <div class="bd-area">
    <section class="bd-area__period">
      <AdminLabel>기간 설정</AdminLabel>
      <div class="bd-area__date-row">
        <AdminInput v-model="startDate" type="date" />
        <span class="bd-area__tilde">~</span>
        <AdminInput v-model="endDate" type="date" />
      </div>
      <p class="bd-area__hint">
        기간 내 균등 분배됩니다. (예: 100명 / 13일 → 앞 9일 8명, 뒤 4일 7명)
      </p>
    </section>

    <div class="bd-area__grid">
      <!-- 출역인원 -->
      <section class="bd-area__section">
        <header class="bd-area__section-head">
          <AdminLabel>출역인원</AdminLabel>
          <AdminButton variant="outline" size="sm" @click="addAttendanceBox">
            <img :src="addIcon" alt="" aria-hidden="true" class="bd-area__btn-icon" />
            공종 추가
          </AdminButton>
        </header>

        <div class="bd-area__boxes">
          <div v-for="box in attendanceBoxes" :key="box.id" class="bd-area__box">
            <div class="bd-area__box-head">
              <div v-if="box.workTypeId" class="bd-area__box-title">
                {{ box.workTypeName }}
              </div>
              <div v-else class="bd-area__box-select">
                <AdminSelect
                  :model-value="null"
                  :options="workTypeOptions"
                  placeholder="공종 선택"
                  @update:model-value="(v) => v != null && selectWorkType(box.id, Number(v))"
                />
              </div>
              <button
                type="button"
                class="bd-area__icon-btn"
                :disabled="attendanceBoxes.length <= 1"
                aria-label="제거"
                @click="removeAttendanceBox(box.id)"
              >
                <img :src="dismissIcon" alt="" aria-hidden="true" />
              </button>
            </div>

            <div class="bd-area__box-body">
              <div v-if="!box.workTypeId" class="bd-area__empty">공종을 선택해주세요.</div>
              <template v-else>
                <div
                  v-for="row in box.laborRows"
                  :key="row.laborTypeId"
                  class="bd-area__labor-row"
                >
                  <span class="bd-area__labor-name">{{ row.laborTypeName }}</span>
                  <div class="bd-area__labor-input">
                    <AdminInput
                      :model-value="row.totalCount"
                      type="number"
                      placeholder="총 인원"
                      @update:model-value="row.totalCount = Number($event) || 0"
                    />
                    <span class="bd-area__unit">명</span>
                  </div>
                </div>
                <div v-if="box.laborRows.length === 0" class="bd-area__empty">
                  등록된 직종이 없습니다.
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="bd-area__actions">
          <AdminButton
            :disabled="!canSubmitAttendance || isSubmittingAttendance"
            @click="submitAttendance"
          >
            {{ isSubmittingAttendance ? "처리 중..." : "출역 대량 입력" }}
          </AdminButton>
        </div>
      </section>

      <!-- 출역장비 -->
      <section class="bd-area__section">
        <header class="bd-area__section-head">
          <AdminLabel>출역장비</AdminLabel>
          <AdminButton variant="outline" size="sm" @click="addEquipmentRow">
            <img :src="addIcon" alt="" aria-hidden="true" class="bd-area__btn-icon" />
            추가
          </AdminButton>
        </header>

        <div class="bd-area__rows">
          <div v-for="row in equipmentRows" :key="row.id" class="bd-area__equip-row">
            <AdminSelect
              v-model="row.equipmentSpecId"
              :options="equipmentSpecOptions"
              placeholder="장비규격 선택"
            />
            <AdminSelect
              v-model="row.workTypeId"
              :options="workTypeOptionsForEquip"
              placeholder="공종"
              class="bd-area__equip-wt"
            />
            <AdminInput
              :model-value="row.totalCount"
              type="number"
              placeholder="총 대수"
              class="bd-area__equip-count"
              @update:model-value="row.totalCount = Number($event) || 0"
            />
            <span class="bd-area__unit">대</span>
            <button
              type="button"
              class="bd-area__icon-btn"
              :disabled="equipmentRows.length <= 1"
              aria-label="제거"
              @click="removeEquipmentRow(row.id)"
            >
              <img :src="dismissIcon" alt="" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="bd-area__actions">
          <AdminButton
            :disabled="!canSubmitEquipment || isSubmittingEquipment"
            @click="submitEquipment"
          >
            {{ isSubmittingEquipment ? "처리 중..." : "장비 대량 입력" }}
          </AdminButton>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.bd-area {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.bd-area__period {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bd-area__date-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bd-area__date-row :deep(.admin-input) {
  width: 180px;
}
.bd-area__tilde {
  color: var(--ink-muted);
}
.bd-area__hint {
  margin: 0;
  font-size: 11px;
  color: var(--ink-faint);
}
.bd-area__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.bd-area__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bd-area__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bd-area__btn-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
}
.bd-area__boxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bd-area__box {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  background: var(--surface-1);
}
.bd-area__box-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--outline-soft);
  background: var(--surface-3);
}
.bd-area__box-title {
  font-size: 13px;
  font-weight: 600;
}
.bd-area__box-select {
  flex: 1;
}
.bd-area__box-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bd-area__empty {
  text-align: center;
  font-size: 13px;
  color: var(--ink-faint);
  padding: 8px 0;
}
.bd-area__labor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bd-area__labor-name {
  font-size: 13px;
  color: var(--ink-muted);
}
.bd-area__labor-input {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bd-area__labor-input :deep(.admin-input) {
  width: 80px;
  text-align: center;
}
.bd-area__unit {
  font-size: 13px;
  color: var(--ink-muted);
}
.bd-area__rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bd-area__equip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bd-area__equip-row :deep(.admin-select) {
  flex: 1;
}
.bd-area__equip-wt :deep(.admin-select) {
  width: 120px;
}
.bd-area__equip-count :deep(.admin-input) {
  width: 90px;
}
.bd-area__actions {
  display: flex;
  justify-content: flex-end;
}
.bd-area__icon-btn {
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--ink-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.bd-area__icon-btn:hover:not(:disabled) {
  background: rgba(185, 28, 28, 0.1);
  color: #b91c1c;
}
.bd-area__icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.bd-area__icon-btn img {
  width: 14px;
  height: 14px;
}
@media (max-width: 960px) {
  .bd-area__grid {
    grid-template-columns: 1fr;
  }
}
</style>
