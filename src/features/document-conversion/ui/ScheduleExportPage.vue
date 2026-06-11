<script setup lang="ts">
import { computed, ref } from "vue";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import {
  desktopScheduleApi,
  findMainScheduleVersion,
  getSelectedDesktopScheduleVersionId,
} from "@/features/desktop-schedule/api/desktop-schedule.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

type ScheduleRange = "3week" | "3month";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthOptions() {
  const base = new Date();
  const options: Array<{ value: string; label: string }> = [];

  for (let offset = -12; offset <= 12; offset += 1) {
    const date = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");

    options.push({
      value: `${date.getFullYear()}-${month}`,
      label: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
    });
  }

  return options;
}

const RANGES: Array<{ key: ScheduleRange; label: string }> = [
  { key: "3week", label: "3주 공정표" },
  { key: "3month", label: "3개월 공정표" },
];

const selectedRange = ref<ScheduleRange>("3week");
const startDate = ref(formatDate(new Date()));
const monthOptions = buildMonthOptions();
const startMonth = ref(formatDate(new Date()).slice(0, 7));
const isExporting = ref(false);

const exportStartDate = computed(() => {
  if (selectedRange.value === "3week") {
    return startDate.value;
  }

  return startMonth.value ? `${startMonth.value}-01` : "";
});

const rangeHint = computed(() =>
  selectedRange.value === "3week"
    ? "선택한 날짜부터 3주(21일) 범위로 생성됩니다."
    : "선택한 월의 1일부터 3개월 범위로 생성됩니다.",
);

function selectRange(range: ScheduleRange) {
  selectedRange.value = range;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function resolveExportScheduleVersionId() {
  const versions = await desktopScheduleApi.getScheduleVersionList();
  const selectedId = getSelectedDesktopScheduleVersionId();
  const selectedVersion =
    typeof selectedId === "number"
      ? versions.find((version) => version.id === selectedId) ?? null
      : null;

  const version =
    selectedVersion ?? findMainScheduleVersion(versions) ?? versions[0] ?? null;

  return version?.id ?? null;
}

async function onGenerate() {
  if (isExporting.value || !exportStartDate.value) {
    return;
  }

  const range = selectedRange.value;

  isExporting.value = true;

  try {
    const scheduleVersionId = await resolveExportScheduleVersionId();

    if (scheduleVersionId === null) {
      window.alert("생성할 공정표가 없어요.");
      return;
    }

    const { blob, filename } =
      range === "3week"
        ? await desktopScheduleApi.export3WeekSchedule({
            scheduleVersionId,
            excludedSubWorkTypeIds: [],
            startDate: exportStartDate.value,
          })
        : await desktopScheduleApi.export3MonthSchedule({
            scheduleVersionId,
            excludedSubWorkTypeIds: [],
            startDate: exportStartDate.value,
          });
    const fallbackName = range === "3week" ? "3주공정표.xlsx" : "3개월공정표.xlsx";

    triggerBlobDownload(blob, filename || fallbackName);
    analyticsClient.trackAction("document", "export_schedule_excel", "success", {
      schedule_range: range,
    });
  } catch (error) {
    window.alert(
      error instanceof Error ? error.message : "엑셀을 생성하지 못했어요.",
    );
    analyticsClient.trackAction("document", "export_schedule_excel", "fail", {
      schedule_range: range,
    });
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <div class="sched-export-frame">
    <DesktopAppHeader class="sched-export-page__desktop-header" />

    <main class="sched-export-page">
      <section class="sched-export-shell sched-export-panel" aria-labelledby="sched-export-title">
        <div class="sched-export-title-block">
          <h1 id="sched-export-title" class="sched-export-intro__title">
            <span class="sched-export-title-line">공정표</span>
            <span class="sched-export-title-line">종류와 시작 시점을 선택해주세요.</span>
          </h1>
        </div>

        <div class="sched-export-panel__content">
          <section class="sched-export-card" aria-label="공정표 종류와 시작 시점 입력">
            <div class="sched-export-range-select">
              <span class="sched-export-range-select__label">종류</span>
              <div class="sched-export-ranges">
                <button
                  v-for="range in RANGES"
                  :key="range.key"
                  type="button"
                  class="sched-export-range"
                  :class="{ 'sched-export-range--active': selectedRange === range.key }"
                  :aria-pressed="selectedRange === range.key"
                  @click="selectRange(range.key)"
                >
                  {{ range.label }}
                </button>
              </div>
            </div>

            <div class="sched-export-dates">
              <label v-if="selectedRange === '3week'" class="sched-export-field">
                <span class="sched-export-field__label">시작일</span>
                <input
                  v-model="startDate"
                  type="date"
                  class="sched-export-field__input"
                />
              </label>

              <label v-else class="sched-export-field">
                <span class="sched-export-field__label">시작 월</span>
                <select v-model="startMonth" class="sched-export-field__input">
                  <option
                    v-for="option in monthOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <p class="sched-export-hint">{{ rangeHint }}</p>
          </section>
        </div>

        <footer class="sched-export-panel__footer">
          <button
            type="button"
            class="sched-export-generate"
            :disabled="isExporting || !exportStartDate"
            @click="onGenerate"
          >
            {{ isExporting ? "생성 중…" : "생성하기" }}
          </button>
        </footer>
      </section>
    </main>
  </div>
</template>

<style scoped>
.sched-export-frame {
  min-height: 100vh;
  background: var(--canvas);
}

.sched-export-page {
  --surface-radius: 0.95rem;
  display: flex;
  min-height: calc(100vh - 4rem);
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem 0 3.5rem;
  box-sizing: border-box;
}

.sched-export-shell {
  width: 100%;
  max-width: 76rem;
  margin: 0 auto;
  padding: 0 1rem;
  box-sizing: border-box;
}

.sched-export-panel {
  display: flex;
  flex-direction: column;
  min-height: 46rem;
  padding: 1.55rem 1.55rem 4.55rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 1.3rem;
  background: #fff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.03);
}

.sched-export-title-block {
  display: grid;
  width: min(100%, 32rem);
  gap: 0.82rem;
  margin-right: auto;
  margin-bottom: 4rem;
  margin-left: auto;
  padding-top: 3rem;
}

.sched-export-intro__title {
  margin: 0;
  color: #111827;
  font-family: var(--font-display);
  font-size: clamp(1.56rem, 2vw, 2rem);
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.03em;
}

.sched-export-title-line {
  display: block;
}

.sched-export-title-line + .sched-export-title-line {
  margin-top: 1.08rem;
}

.sched-export-panel__content {
  display: grid;
  width: min(100%, 32rem);
  gap: 0.68rem;
  margin: 0 auto;
}

.sched-export-card {
  display: grid;
  gap: 0.78rem;
  padding: 0.9rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.8rem;
  background: #f8fafc;
}

.sched-export-range-select {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.62rem;
}

.sched-export-range-select__label {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.25;
  white-space: nowrap;
}

.sched-export-ranges {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.sched-export-range {
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

.sched-export-range:hover,
.sched-export-range:focus-visible {
  border-color: rgba(37, 99, 235, 0.28);
  background: #f8fafc;
  color: #111827;
}

.sched-export-range:focus-visible {
  outline: 2px solid rgba(100, 116, 139, 0.22);
  outline-offset: 2px;
}

.sched-export-range--active {
  border-width: 2px;
  border-color: var(--primary);
  background: #f8fafc;
  color: #111827;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  font-weight: 700;
}

.sched-export-dates {
  display: grid;
  width: min(100%, 31rem);
  gap: 0.52rem;
  align-items: end;
  margin: 0 auto;
}

.sched-export-field {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
}

.sched-export-field__label {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
}

.sched-export-field__input {
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

.sched-export-field__input:focus {
  border-color: rgba(37, 99, 235, 0.42);
  outline: 2px solid rgba(37, 99, 235, 0.12);
  outline-offset: 0;
}

.sched-export-hint {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 650;
  line-height: 1.42;
}

.sched-export-panel__footer {
  display: grid;
  width: min(100%, 32rem);
  margin-top: auto;
  margin-right: auto;
  margin-left: auto;
  padding-top: 2.4rem;
}

.sched-export-generate {
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

.sched-export-generate:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.24);
  outline-offset: 2px;
}

.sched-export-generate:disabled {
  background: #d7d9de;
  color: #fff;
  cursor: default;
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .sched-export-title-block,
  .sched-export-panel__content,
  .sched-export-panel__footer {
    opacity: 0;
    animation: surface-rise var(--motion-page-duration) var(--motion-page-ease)
      forwards;
    will-change: transform, opacity;
  }

  .sched-export-title-block {
    animation-delay: 70ms;
  }

  .sched-export-panel__content {
    animation-delay: 150ms;
  }

  .sched-export-panel__footer {
    animation-delay: 230ms;
  }
}

@media (max-width: 767px) {
  .sched-export-frame {
    display: flex;
    flex-direction: column;
    padding: 0.55rem;
    background: var(--canvas);
  }

  .sched-export-page {
    flex: 1 1 auto;
    min-height: calc(100svh - 1.1rem);
    padding-block: 0;
  }

  .sched-export-shell {
    flex: 1 1 auto;
    padding: 0;
  }

  .sched-export-panel {
    min-height: calc(100svh - 1.1rem);
    padding: 2rem 1.2rem 1.2rem;
    border-radius: 0.72rem;
  }

  .sched-export-title-block {
    margin-bottom: 1.45rem;
    padding-top: 0;
  }

  .sched-export-card {
    border-radius: 0.72rem;
  }

  .sched-export-panel__footer {
    padding-top: 0;
    padding-bottom: max(env(safe-area-inset-bottom, 0px), 1rem);
  }
}
</style>
