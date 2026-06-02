<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

const router = useRouter();

const DOCUMENT_TYPE = "material_supply_status";

type PresetKey = "thisMonth" | "lastMonth" | "last3Months" | "last6Months" | "all";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolvePresetRange(key: PresetKey): { start: string; end: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const endToday = formatDate(today);

  switch (key) {
    case "thisMonth":
      return { start: formatDate(new Date(year, month, 1)), end: endToday };
    case "lastMonth":
      return {
        start: formatDate(new Date(year, month - 1, 1)),
        // day 0 = 전월 말일
        end: formatDate(new Date(year, month, 0)),
      };
    case "last3Months": {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);
      return { start: formatDate(start), end: endToday };
    }
    case "last6Months": {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      return { start: formatDate(start), end: endToday };
    }
    case "all":
    default:
      // startDate 생략 → 처음부터, endDate = 오늘
      return { start: "", end: endToday };
  }
}

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: "thisMonth", label: "이번 달" },
  { key: "lastMonth", label: "지난 달" },
  { key: "last3Months", label: "최근 3개월" },
  { key: "last6Months", label: "최근 6개월" },
  { key: "all", label: "전체" },
];

const startDate = ref("");
const endDate = ref(formatDate(new Date()));
const activePreset = ref<PresetKey | null>("all");

function applyPreset(key: PresetKey) {
  const range = resolvePresetRange(key);
  startDate.value = range.start;
  endDate.value = range.end;
  activePreset.value = key;
}

function onManualDateChange() {
  activePreset.value = null;
}

const rangeErrorMessage = computed(() => {
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    return "시작일이 종료일보다 늦을 수 없습니다.";
  }
  return "";
});

const periodSummary = computed(() => {
  if (startDate.value && endDate.value) {
    return `${startDate.value} ~ ${endDate.value}`;
  }
  if (startDate.value) {
    return `${startDate.value} ~ 오늘`;
  }
  if (endDate.value) {
    return `처음 ~ ${endDate.value}`;
  }
  return "처음 ~ 오늘 (전체)";
});

function onGenerate() {
  if (rangeErrorMessage.value) {
    return;
  }

  const query: Record<string, string> = { documentType: DOCUMENT_TYPE };
  if (startDate.value) {
    query.startDate = startDate.value;
  }
  if (endDate.value) {
    query.endDate = endDate.value;
  }

  analyticsClient.trackAction("document", "select_period", "success", {
    document_type: DOCUMENT_TYPE,
    has_start_date: Boolean(startDate.value),
    has_end_date: Boolean(endDate.value),
    preset: activePreset.value ?? "custom",
  });

  void router.push({ path: "/documents/generation", query });
}
</script>

<template>
  <div class="mat-inout-frame">
    <DesktopAppHeader class="mat-inout-page__desktop-header" />

    <main class="mat-inout-page">
      <section class="mat-inout-shell mat-inout-topbar">
        <RouterLink
          class="mat-inout-back"
          to="/documents"
          aria-label="서류 선택 화면으로 돌아가기"
        >
          <img
            class="mat-inout-back__icon"
            :src="backIcon"
            alt=""
            aria-hidden="true"
          />
        </RouterLink>
      </section>

      <section class="mat-inout-shell mat-inout-intro">
        <h1 class="mat-inout-intro__title">자재 수불 현황표 기간 선택</h1>
        <p class="mat-inout-intro__desc">
          집계할 자재반입 기간을 골라 주세요. 비워 두면 처음부터, 종료일만 두면
          오늘까지 전부 집계합니다.
        </p>
      </section>

      <section class="mat-inout-shell mat-inout-card">
        <div class="mat-inout-presets">
          <button
            v-for="preset in PRESETS"
            :key="preset.key"
            type="button"
            class="mat-inout-preset"
            :class="{ 'mat-inout-preset--active': activePreset === preset.key }"
            @click="applyPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="mat-inout-dates">
          <label class="mat-inout-field">
            <span class="mat-inout-field__label">시작일</span>
            <input
              v-model="startDate"
              type="date"
              class="mat-inout-field__input"
              :max="endDate || undefined"
              @change="onManualDateChange"
            />
          </label>
          <span class="mat-inout-dates__sep" aria-hidden="true">~</span>
          <label class="mat-inout-field">
            <span class="mat-inout-field__label">종료일</span>
            <input
              v-model="endDate"
              type="date"
              class="mat-inout-field__input"
              :min="startDate || undefined"
              @change="onManualDateChange"
            />
          </label>
        </div>

        <p class="mat-inout-summary">선택한 기간 · {{ periodSummary }}</p>
        <p v-if="rangeErrorMessage" class="mat-inout-error" role="alert">
          {{ rangeErrorMessage }}
        </p>

        <button
          type="button"
          class="mat-inout-generate"
          :disabled="Boolean(rangeErrorMessage)"
          @click="onGenerate"
        >
          현황표 생성하기
        </button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.mat-inout-frame {
  min-height: 100vh;
  background: var(--canvas);
}
.mat-inout-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 0 64px;
}
.mat-inout-shell {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
}
.mat-inout-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
}
.mat-inout-back__icon {
  width: 24px;
  height: 24px;
}
.mat-inout-intro__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--ink-strong);
}
.mat-inout-intro__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}
.mat-inout-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: var(--shadow-soft);
}
.mat-inout-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mat-inout-preset {
  flex: 1 1 auto;
  min-width: 84px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface-2);
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-pill);
  cursor: pointer;
}
.mat-inout-preset:hover {
  border-color: var(--outline-strong);
}
.mat-inout-preset--active {
  color: var(--surface-1);
  background: var(--primary);
  border-color: var(--primary);
}
.mat-inout-dates {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.mat-inout-field {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mat-inout-field__label {
  font-size: 12px;
  color: var(--ink-muted);
}
.mat-inout-field__input {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  color: var(--ink-strong);
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  outline: none;
  box-sizing: border-box;
}
.mat-inout-field__input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-outline);
}
.mat-inout-dates__sep {
  padding-bottom: 12px;
  color: var(--ink-faint);
}
.mat-inout-summary {
  margin: 0;
  font-size: 13px;
  color: var(--ink-muted);
}
.mat-inout-error {
  margin: 0;
  font-size: 13px;
  color: #c0392b;
}
.mat-inout-generate {
  margin-top: 2px;
  padding: 13px 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--surface-1);
  background: var(--primary);
  border: none;
  border-radius: var(--radius-control);
  cursor: pointer;
}
.mat-inout-generate:hover:not(:disabled) {
  background: var(--primary-hover);
}
.mat-inout-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
