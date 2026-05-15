<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import chevronLeftIcon from "@fluentui/svg-icons/icons/chevron_left_16_regular.svg";
import chevronRightIcon from "@fluentui/svg-icons/icons/chevron_right_16_regular.svg";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import {
  useHolidayManagement,
  type CalendarCell,
} from "@/features/project-admin/holiday/state/useHolidayManagement";

const {
  currentYear,
  currentMonth,
  isLoading,
  isUpdating,
  inactiveFlow,
  calendarGrid,
  loadCalendar,
  goToPrevMonth,
  goToNextMonth,
  toggleHoliday,
  startInactiveFlow,
  selectInactiveDate,
  resetInactiveSelection,
  cancelInactiveFlow,
  confirmInactiveFlow,
  isInSelectedRange,
} = useHolidayManagement();

const dayHeaders = ["일", "월", "화", "수", "목", "금", "토"];

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  cell: CalendarCell | null;
}

const ctxMenu = ref<ContextMenuState>({ open: false, x: 0, y: 0, cell: null });

function isInteractable(cell: CalendarCell) {
  return cell.isCurrentMonth && cell.isInProjectRange;
}

function dayHeaderClass(index: number) {
  if (index === 0) return "holiday-area__day-head--sun";
  if (index === 6) return "holiday-area__day-head--sat";
  return "";
}

function dayNumberClass(cell: CalendarCell) {
  const d = new Date(cell.date);
  const day = d.getDay();
  if (!cell.isCurrentMonth || !cell.isInProjectRange) return "holiday-area__day-num--muted";
  if (day === 6) return "holiday-area__day-num--sat";
  if (day === 0 || (cell.isHoliday && cell.isActivated)) return "holiday-area__day-num--sun";
  return "";
}

function cellModifiers(cell: CalendarCell) {
  const inactive = !cell.isCurrentMonth || !cell.isInProjectRange;
  const inRange = isInSelectedRange(cell.date);
  const isSelecting = inactiveFlow.value.mode !== "idle";
  return {
    "holiday-area__cell--holiday": cell.isHoliday && cell.isActivated && !inactive && !inRange,
    "holiday-area__cell--deactivated": !cell.isActivated && !inactive && !inRange,
    "holiday-area__cell--in-range": inRange && !inactive,
    "holiday-area__cell--inactive": inactive,
    "holiday-area__cell--selecting": isSelecting && !inactive,
  };
}

function onCellClick(cell: CalendarCell) {
  if (inactiveFlow.value.mode === "idle") return;
  if (!isInteractable(cell)) return;
  selectInactiveDate(cell.date);
}

function onCellContextMenu(e: MouseEvent, cell: CalendarCell) {
  if (!isInteractable(cell)) return;
  e.preventDefault();
  ctxMenu.value = { open: true, x: e.clientX, y: e.clientY, cell };
}

function closeCtxMenu() {
  ctxMenu.value.open = false;
  ctxMenu.value.cell = null;
}

function ctxToggleHoliday() {
  if (ctxMenu.value.cell) void toggleHoliday(ctxMenu.value.cell);
  closeCtxMenu();
}

function ctxStartInactiveFlow(mode: "set" | "release") {
  startInactiveFlow(mode);
  closeCtxMenu();
}

function formatDisplayDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

const monthLabel = computed(() => `${currentYear.value}년 ${currentMonth.value + 1}월`);

onMounted(() => {
  void loadCalendar();
  if (typeof window !== "undefined") {
    window.addEventListener("click", closeCtxMenu);
  }
});
</script>

<template>
  <div class="holiday-area">
    <div class="holiday-area__nav">
      <AdminButton variant="outline" size="sm" @click="goToPrevMonth">
        <img :src="chevronLeftIcon" alt="" aria-hidden="true" />
      </AdminButton>
      <span class="holiday-area__month">{{ monthLabel }}</span>
      <AdminButton variant="outline" size="sm" @click="goToNextMonth">
        <img :src="chevronRightIcon" alt="" aria-hidden="true" />
      </AdminButton>
    </div>

    <div v-if="isLoading" class="holiday-area__loading">캘린더 로딩 중...</div>

    <div v-else class="holiday-area__grid">
      <div class="holiday-area__row holiday-area__row--head">
        <div
          v-for="(day, index) in dayHeaders"
          :key="day"
          class="holiday-area__day-head"
          :class="dayHeaderClass(index)"
        >
          {{ day }}
        </div>
      </div>

      <div
        v-for="(row, rowIndex) in calendarGrid"
        :key="rowIndex"
        class="holiday-area__row"
      >
        <div
          v-for="cell in row"
          :key="cell.date"
          class="holiday-area__cell"
          :class="cellModifiers(cell)"
          @click="onCellClick(cell)"
          @contextmenu="onCellContextMenu($event, cell)"
        >
          <span class="holiday-area__day-num" :class="dayNumberClass(cell)">
            {{ cell.dayOfMonth }}
          </span>
          <div
            v-if="cell.holidayName && cell.isCurrentMonth && cell.isInProjectRange"
            class="holiday-area__label holiday-area__label--holiday"
          >
            {{ cell.holidayName }}
          </div>
          <div
            v-if="
              !cell.isActivated &&
              cell.deactivatedReason &&
              cell.isCurrentMonth &&
              cell.isInProjectRange
            "
            class="holiday-area__label holiday-area__label--deactivated"
          >
            {{ cell.deactivatedReason }}
          </div>
          <div v-if="isUpdating" class="holiday-area__overlay" />
        </div>
      </div>
    </div>

    <!-- Context menu -->
    <div
      v-if="ctxMenu.open && ctxMenu.cell"
      class="holiday-area__ctxmenu"
      :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
      @click.stop
    >
      <button
        v-if="ctxMenu.cell.isActivated && !ctxMenu.cell.isHoliday"
        type="button"
        class="holiday-area__ctxitem"
        @click="ctxToggleHoliday"
      >
        휴일 설정
      </button>
      <button
        v-if="ctxMenu.cell.isActivated && ctxMenu.cell.isHoliday"
        type="button"
        class="holiday-area__ctxitem"
        @click="ctxToggleHoliday"
      >
        휴일 해제
      </button>
      <button
        v-if="ctxMenu.cell.isActivated"
        type="button"
        class="holiday-area__ctxitem"
        @click="ctxStartInactiveFlow('set')"
      >
        비활성일 설정
      </button>
      <button
        v-if="!ctxMenu.cell.isActivated"
        type="button"
        class="holiday-area__ctxitem"
        @click="ctxStartInactiveFlow('release')"
      >
        비활성일 해제
      </button>
    </div>

    <!-- 비활성일 인라인 패널 -->
    <div v-if="inactiveFlow.mode !== 'idle'" class="holiday-area__panel">
      <p v-if="inactiveFlow.step === 'select_start'" class="holiday-area__panel-text">
        {{ inactiveFlow.mode === "set" ? "비활성일 설정" : "비활성일 해제" }} — 시작일을 선택하세요
      </p>
      <p v-else-if="inactiveFlow.step === 'select_end'" class="holiday-area__panel-text">
        시작일:
        <span class="holiday-area__panel-strong">{{ formatDisplayDate(inactiveFlow.startDate) }}</span>
        — 종료일을 선택하세요
      </p>
      <template v-else-if="inactiveFlow.step === 'confirm'">
        <div class="holiday-area__panel-row">
          <span class="holiday-area__panel-text">시작일:</span>
          <span class="holiday-area__panel-strong">{{
            formatDisplayDate(inactiveFlow.startDate)
          }}</span>
          <span class="holiday-area__panel-text">종료일:</span>
          <span class="holiday-area__panel-strong">{{
            formatDisplayDate(inactiveFlow.endDate)
          }}</span>
        </div>
        <div v-if="inactiveFlow.mode === 'set'" class="holiday-area__panel-input">
          <AdminInput v-model="inactiveFlow.reason" placeholder="비활성 사유를 입력하세요" />
        </div>
        <div class="holiday-area__panel-actions">
          <AdminButton variant="outline" size="sm" @click="resetInactiveSelection">
            날짜 변경하기
          </AdminButton>
          <AdminButton
            size="sm"
            :disabled="
              isUpdating || (inactiveFlow.mode === 'set' && !inactiveFlow.reason.trim())
            "
            @click="confirmInactiveFlow"
          >
            {{
              isUpdating
                ? "처리 중..."
                : inactiveFlow.mode === "set"
                ? "비활성일 설정"
                : "비활성일 해제"
            }}
          </AdminButton>
          <AdminButton variant="ghost" size="sm" @click="cancelInactiveFlow">취소</AdminButton>
        </div>
      </template>
    </div>

    <div class="holiday-area__legend">
      <div class="holiday-area__legend-item">
        <div class="holiday-area__swatch holiday-area__swatch--holiday" />
        <span>휴일</span>
      </div>
      <div class="holiday-area__legend-item">
        <div class="holiday-area__swatch holiday-area__swatch--deactivated" />
        <span>비활성일</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.holiday-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.holiday-area__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.holiday-area__month {
  font-size: 16px;
  font-weight: 600;
  min-width: 140px;
  text-align: center;
}
.holiday-area__loading {
  text-align: center;
  height: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted);
  font-size: 13px;
}
.holiday-area__grid {
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  overflow: hidden;
}
.holiday-area__row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.holiday-area__day-head {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 0;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
  color: var(--ink-muted);
}
.holiday-area__day-head + .holiday-area__day-head {
  border-left: 1px solid var(--outline-soft);
}
.holiday-area__day-head--sun {
  color: #ef4444;
}
.holiday-area__day-head--sat {
  color: #3b82f6;
}
.holiday-area__cell {
  position: relative;
  min-height: 84px;
  padding: 6px 8px;
  cursor: default;
  background: var(--surface-1);
  transition: background 120ms ease;
}
.holiday-area__cell + .holiday-area__cell {
  border-left: 1px solid var(--outline-soft);
}
.holiday-area__row + .holiday-area__row .holiday-area__cell {
  border-top: 1px solid var(--outline-soft);
}
.holiday-area__cell--holiday {
  background: #fef2f2;
}
.holiday-area__cell--deactivated {
  background: #fff7ed;
}
.holiday-area__cell--in-range {
  background: #dbeafe;
  box-shadow: inset 0 0 0 1px #60a5fa;
}
.holiday-area__cell--inactive {
  opacity: 0.4;
  pointer-events: none;
}
.holiday-area__cell--selecting {
  cursor: pointer;
}
.holiday-area__cell--selecting:hover {
  background: var(--surface-3);
}
.holiday-area__day-num {
  font-size: 13px;
  font-weight: 600;
}
.holiday-area__day-num--sun {
  color: #ef4444;
}
.holiday-area__day-num--sat {
  color: #3b82f6;
}
.holiday-area__day-num--muted {
  color: var(--ink-faint);
}
.holiday-area__label {
  font-size: 10px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.holiday-area__label--holiday {
  color: #b91c1c;
}
.holiday-area__label--deactivated {
  color: #c2410c;
}
.holiday-area__overlay {
  position: absolute;
  inset: 0;
  background: rgba(244, 244, 244, 0.3);
  pointer-events: none;
}

.holiday-area__ctxmenu {
  position: fixed;
  z-index: 100;
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  box-shadow: var(--shadow-soft);
  padding: 4px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
}
.holiday-area__ctxitem {
  padding: 6px 12px;
  font: inherit;
  font-size: 13px;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
.holiday-area__ctxitem:hover {
  background: var(--surface-3);
}

.holiday-area__panel {
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.holiday-area__panel-text {
  margin: 0;
  font-size: 13px;
  color: var(--ink-muted);
}
.holiday-area__panel-strong {
  font-weight: 600;
  color: var(--ink);
}
.holiday-area__panel-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.holiday-area__panel-input :deep(.admin-input) {
  max-width: 360px;
}
.holiday-area__panel-actions {
  display: flex;
  gap: 8px;
}

.holiday-area__legend {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--ink-muted);
}
.holiday-area__legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.holiday-area__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid var(--outline-soft);
}
.holiday-area__swatch--holiday {
  background: #fef2f2;
}
.holiday-area__swatch--deactivated {
  background: #fff7ed;
}
</style>
