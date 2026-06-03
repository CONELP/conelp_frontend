<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

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
      <section class="mat-inout-shell mat-inout-panel" aria-labelledby="mat-inout-title">
        <div class="mat-inout-title-block">
          <h1 id="mat-inout-title" class="mat-inout-intro__title">
              <span class="mat-inout-title-line">자재 수불 현황표</span>
              <span class="mat-inout-title-line">기간을 선택해주세요.</span>
          </h1>
        </div>

        <div class="mat-inout-panel__content">
          <section class="mat-inout-date-card" aria-label="자재 수불 현황표 기간 입력">
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

            <div class="mat-inout-quick-select">
              <span class="mat-inout-quick-select__label">간편 선택</span>
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
            </div>
          </section>

          <p v-if="rangeErrorMessage" class="mat-inout-error" role="alert">
            {{ rangeErrorMessage }}
          </p>
        </div>

        <footer class="mat-inout-panel__footer">
          <button
            type="button"
            class="mat-inout-generate"
            :disabled="Boolean(rangeErrorMessage)"
            @click="onGenerate"
        >
            생성하기
          </button>
        </footer>
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
  --surface-radius: 0.95rem;
  display: flex;
  min-height: calc(100vh - 4rem);
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem 0 3.5rem;
  box-sizing: border-box;
}

.mat-inout-shell {
  width: 100%;
  max-width: 76rem;
  margin: 0 auto;
  padding: 0 1rem;
  box-sizing: border-box;
}

.mat-inout-panel {
  display: flex;
  flex-direction: column;
  min-height: 46rem;
  padding: 1.55rem 1.55rem 4.55rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 1.3rem;
  background: #fff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.03);
}

.mat-inout-title-block {
  display: grid;
  width: min(100%, 32rem);
  gap: 0.82rem;
  margin-right: auto;
  margin-bottom: 4rem;
  margin-left: auto;
  padding-top: 3rem;
}

.mat-inout-intro__title,
.mat-inout-error {
  margin: 0;
}

.mat-inout-intro__title {
  color: #111827;
  font-family: var(--font-display);
  font-size: clamp(1.56rem, 2vw, 2rem);
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.03em;
}

.mat-inout-title-line {
  display: block;
}

.mat-inout-title-line + .mat-inout-title-line {
  margin-top: 1.08rem;
}

.mat-inout-panel__content {
  display: grid;
  width: min(100%, 32rem);
  gap: 0.68rem;
  margin: 0 auto;
}

.mat-inout-date-card {
  display: grid;
  gap: 0.78rem;
  padding: 0.9rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.8rem;
  background: #f8fafc;
}

.mat-inout-presets {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.mat-inout-preset {
  display: inline-flex;
  min-height: 2.28rem;
  min-width: max-content;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 0.78rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.5rem;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    box-shadow 140ms ease,
    color 140ms ease;
}

.mat-inout-quick-select {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.62rem;
  padding-top: 0.1rem;
}

.mat-inout-quick-select__label {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.25;
  white-space: nowrap;
}

.mat-inout-preset:hover,
.mat-inout-preset:focus-visible {
  border-color: rgba(37, 99, 235, 0.28);
  background: #f8fafc;
  color: #111827;
}

.mat-inout-preset:focus-visible {
  outline: 2px solid rgba(100, 116, 139, 0.22);
  outline-offset: 2px;
}

.mat-inout-preset--active {
  border-width: 2px;
  border-color: var(--primary);
  background: #f8fafc;
  color: #111827;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  font-weight: 700;
}

.mat-inout-dates {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  width: min(100%, 31rem);
  gap: 0.52rem;
  align-items: end;
  margin: 0 auto;
}

.mat-inout-field {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
}

.mat-inout-field__label {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
}

.mat-inout-field__input {
  width: 100%;
  height: 2.42rem;
  min-width: 0;
  padding: 0 0.72rem;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 650;
}

.mat-inout-field__input:focus {
  border-color: rgba(37, 99, 235, 0.42);
  outline: 2px solid rgba(37, 99, 235, 0.12);
  outline-offset: 0;
}

.mat-inout-dates__sep {
  display: inline-flex;
  width: 1.25rem;
  height: 2.42rem;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 800;
}

.mat-inout-error {
  padding: 0.72rem 0.82rem;
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 0.72rem;
  background: #fff7f7;
  color: #b42318;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.42;
}

.mat-inout-panel__footer {
  display: grid;
  width: min(100%, 32rem);
  margin-top: auto;
  margin-right: auto;
  margin-left: auto;
  padding-top: 2.4rem;
}

.mat-inout-generate {
  display: inline-flex;
  width: 100%;
  min-height: 3.45rem;
  align-items: center;
  justify-content: center;
  padding: 0.98rem 1.15rem;
  border: 0;
  border-radius: var(--surface-radius);
  background: var(--primary);
  color: #fff;
  font-family: inherit;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
}

.mat-inout-generate:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.24);
  outline-offset: 2px;
}

.mat-inout-generate:disabled {
  background: #d7d9de;
  color: #fff;
  cursor: default;
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .mat-inout-title-block,
  .mat-inout-panel__content,
  .mat-inout-panel__footer {
    opacity: 0;
    animation: surface-rise var(--motion-page-duration) var(--motion-page-ease)
      forwards;
    will-change: transform, opacity;
  }

  .mat-inout-title-block {
    animation-delay: 70ms;
  }

  .mat-inout-panel__content {
    animation-delay: 150ms;
  }

  .mat-inout-panel__footer {
    animation-delay: 230ms;
  }
}

@media (max-width: 767px) {
  .mat-inout-frame {
    display: flex;
    flex-direction: column;
    padding: 0.55rem;
    background: var(--canvas);
  }

  .mat-inout-page {
    flex: 1 1 auto;
    min-height: calc(100svh - 1.1rem);
    padding-block: 0;
  }

  .mat-inout-shell {
    flex: 1 1 auto;
    padding: 0;
  }

  .mat-inout-panel {
    min-height: calc(100svh - 1.1rem);
    padding: 2rem 1.2rem 1.2rem;
    border-radius: 0.72rem;
  }

  .mat-inout-title-block {
    margin-bottom: 1.45rem;
    padding-top: 0;
  }

  .mat-inout-date-card {
    border-radius: 0.72rem;
  }

  .mat-inout-panel__footer {
    padding-top: 0;
    padding-bottom: max(env(safe-area-inset-bottom, 0px), 1rem);
  }

  .mat-inout-dates {
    grid-template-columns: minmax(0, 1fr);
  }

  .mat-inout-dates__sep {
    display: none;
  }
}
</style>
