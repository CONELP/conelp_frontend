<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";

import { superDocumentApi } from "@/features/system-admin/services/super-document.api";
import ZoomableImage from "@/features/system-admin/ui/components/ZoomableImage.vue";
import SourceThumbnail from "@/features/system-admin/ui/components/SourceThumbnail.vue";
import {
  SOURCE_FIELD_LABELS,
  SUPER_DOC_TYPE_LABELS,
} from "@/features/system-admin/model/super-document.types";
import type {
  SuperDocumentJob,
  SuperDocumentSource,
  SuperDocumentSourceLine,
  SuperDocumentSourcePhoto,
} from "@/features/system-admin/model/super-document.types";

const props = defineProps<{
  open: boolean;
  job: SuperDocumentJob | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const source = ref<SuperDocumentSource | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

const activeUnitIndex = ref(0);
const activePhotoIndex = ref(0);
const dataPanelOpen = ref(true);

interface ComparisonUnit {
  label: string;
  photos: SuperDocumentSourcePhoto[];
  // CAT/CCST: 라인 필드 / MIR: 문서 헤더
  fields: Record<string, unknown> | null;
  // MIR 의 라인 테이블 (CAT/CCST 는 빈 배열)
  lines: SuperDocumentSourceLine[];
}

function fieldsOf(line: SuperDocumentSourceLine): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(line)) {
    if (key !== "photos") result[key] = value;
  }
  return result;
}

// docType별 응답을 "비교 단위" 목록으로 정규화.
const units = computed<ComparisonUnit[]>(() => {
  const s = source.value;
  if (!s) return [];
  if (s.docType === "MIR") {
    return [
      {
        label: "문서",
        photos: s.photos ?? [],
        fields: s.header ?? null,
        lines: s.lines ?? [],
      },
    ];
  }
  // CAT / CCST — 라인마다 사진 + 데이터
  return (s.lines ?? []).map((line, index) => ({
    label: `라인 ${index + 1}`,
    photos: line.photos ?? [],
    fields: fieldsOf(line),
    lines: [],
  }));
});

const showNav = computed(() => units.value.length > 1);
const activeUnit = computed<ComparisonUnit | null>(
  () => units.value[activeUnitIndex.value] ?? null,
);
const activePhoto = computed<SuperDocumentSourcePhoto | null>(
  () => activeUnit.value?.photos[activePhotoIndex.value] ?? null,
);

const fieldEntries = computed<[string, unknown][]>(() => {
  const fields = activeUnit.value?.fields;
  if (!fields) return [];
  return Object.entries(fields);
});

// MIR 라인 테이블 컬럼 (photos 제외, 등장 순서 유지)
const lineColumns = computed<string[]>(() => {
  const lines = activeUnit.value?.lines ?? [];
  const seen: string[] = [];
  for (const line of lines) {
    for (const key of Object.keys(line)) {
      if (key !== "photos" && !seen.includes(key)) seen.push(key);
    }
  }
  return seen;
});

function labelFor(key: string): string {
  return SOURCE_FIELD_LABELS[key] ?? key;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function close() {
  emit("update:open", false);
}

function goUnit(delta: number) {
  if (!units.value.length) return;
  const next = activeUnitIndex.value + delta;
  if (next < 0 || next >= units.value.length) return;
  activeUnitIndex.value = next;
  activePhotoIndex.value = 0;
}

async function load(job: SuperDocumentJob) {
  isLoading.value = true;
  errorMessage.value = "";
  source.value = null;
  activeUnitIndex.value = 0;
  activePhotoIndex.value = 0;
  try {
    source.value = await superDocumentApi.getDocumentSource(job.jobId, job.projectId);
  } catch (error) {
    errorMessage.value = (error as Error).message || "원본 정보를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === "Escape") {
    close();
  } else if (event.key === "ArrowLeft") {
    goUnit(-1);
  } else if (event.key === "ArrowRight") {
    goUnit(1);
  }
}

watch(
  () => [props.open, props.job?.jobId] as const,
  ([open, jobId]) => {
    if (typeof document !== "undefined") {
      if (open) {
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeydown);
      } else {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeydown);
      }
    }

    if (open && jobId != null && props.job) {
      void load(props.job);
    } else if (!open) {
      source.value = null;
      errorMessage.value = "";
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="srcd">
      <div v-if="open" class="srcd-backdrop" role="presentation" @click="close">
        <div class="srcd-panel" role="dialog" aria-modal="true" @click.stop>
          <header class="srcd-header">
            <div class="srcd-title">
              <span class="srcd-title__main">
                {{ job ? `${SUPER_DOC_TYPE_LABELS[job.docType]} · ${job.projectName}` : "원본 사진 · 추출정보" }}
              </span>
              <span v-if="showNav && activeUnit" class="srcd-title__unit">
                {{ activeUnit.label }} ({{ activeUnitIndex + 1 }}/{{ units.length }})
              </span>
            </div>
            <div class="srcd-actions">
              <div v-if="showNav" class="srcd-nav">
                <button
                  type="button"
                  class="srcd-iconbtn"
                  aria-label="이전 라인"
                  :disabled="activeUnitIndex === 0"
                  @click="goUnit(-1)"
                >
                  ◀
                </button>
                <button
                  type="button"
                  class="srcd-iconbtn"
                  aria-label="다음 라인"
                  :disabled="activeUnitIndex === units.length - 1"
                  @click="goUnit(1)"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                class="srcd-toggle"
                :class="{ 'srcd-toggle--on': dataPanelOpen }"
                :aria-pressed="dataPanelOpen"
                @click="dataPanelOpen = !dataPanelOpen"
              >
                데이터 {{ dataPanelOpen ? "▤" : "▥" }}
              </button>
              <button type="button" class="srcd-iconbtn srcd-close" aria-label="닫기" @click="close">
                ×
              </button>
            </div>
          </header>

          <div class="srcd-body">
            <div class="srcd-stage-wrap">
              <div v-if="isLoading" class="srcd-message">불러오는 중…</div>
              <div v-else-if="errorMessage" class="srcd-message srcd-message--error">
                {{ errorMessage }}
              </div>
              <div v-else-if="!units.length" class="srcd-message">추출된 사진/정보가 없습니다.</div>

              <template v-else>
                <div class="srcd-stage">
                  <ZoomableImage
                    v-if="activePhoto"
                    :key="activePhoto.url"
                    :gs-url="activePhoto.url"
                    :project-id="job?.projectId"
                    :alt="activePhoto.description ?? activePhoto.type ?? '원본 사진'"
                  />
                  <div v-else class="srcd-message srcd-message--onstage">
                    이 항목에는 사진이 없습니다.
                  </div>
                </div>

                <div
                  v-if="activeUnit && activeUnit.photos.length > 1"
                  class="srcd-thumbs"
                  role="tablist"
                  aria-label="사진 선택"
                >
                  <SourceThumbnail
                    v-for="(photo, i) in activeUnit.photos"
                    :key="`${activeUnitIndex}-${i}`"
                    :gs-url="photo.url"
                    :project-id="job?.projectId"
                    :active="i === activePhotoIndex"
                    :label="photo.description ?? photo.type ?? `사진 ${i + 1}`"
                    @select="activePhotoIndex = i"
                  />
                </div>
              </template>
            </div>

            <aside v-if="dataPanelOpen && units.length" class="srcd-data">
              <div v-if="activePhoto && (activePhoto.type || activePhoto.description)" class="srcd-photometa">
                <span v-if="activePhoto.type" class="srcd-photometa__type">{{ activePhoto.type }}</span>
                <span v-if="activePhoto.description">{{ activePhoto.description }}</span>
              </div>

              <section v-if="fieldEntries.length" class="srcd-section">
                <h4 class="srcd-heading">추출 데이터</h4>
                <dl class="srcd-defs">
                  <div v-for="[key, value] in fieldEntries" :key="key" class="srcd-def">
                    <dt>{{ labelFor(key) }}</dt>
                    <dd>{{ formatValue(value) }}</dd>
                  </div>
                </dl>
              </section>

              <section v-if="activeUnit && activeUnit.lines.length" class="srcd-section">
                <h4 class="srcd-heading">라인 ({{ activeUnit.lines.length }})</h4>
                <div class="srcd-table-wrap">
                  <table class="srcd-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th v-for="col in lineColumns" :key="col">{{ labelFor(col) }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(line, i) in activeUnit.lines" :key="i">
                        <td>{{ i + 1 }}</td>
                        <td v-for="col in lineColumns" :key="col">{{ formatValue(line[col]) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <p
                v-if="!fieldEntries.length && !(activeUnit && activeUnit.lines.length)"
                class="srcd-message"
              >
                추출 데이터가 없습니다.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.srcd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 2vh 2.5vw;
}
.srcd-panel {
  width: 95vw;
  height: 92vh;
  background: var(--surface-1);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.srcd-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--outline-soft);
}
.srcd-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.srcd-title__main {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.srcd-title__unit {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  white-space: nowrap;
}
.srcd-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.srcd-nav {
  display: flex;
  gap: 4px;
}
.srcd-iconbtn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface-3);
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  cursor: pointer;
}
.srcd-iconbtn:hover:not(:disabled) {
  background: #e6e6e6;
}
.srcd-iconbtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.srcd-close {
  font-size: 20px;
  line-height: 1;
}
.srcd-toggle {
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  background: var(--surface-3);
  color: var(--ink);
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  cursor: pointer;
}
.srcd-toggle--on {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary);
}

.srcd-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.srcd-stage-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #1f1f1f;
}
.srcd-stage {
  flex: 1;
  min-height: 0;
  position: relative;
}
.srcd-thumbs {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.35);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.srcd-message {
  margin: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--ink-faint);
  font-size: 13px;
  padding: 24px;
}
.srcd-message--error {
  color: #b91c1c;
}
.srcd-message--onstage {
  color: rgba(255, 255, 255, 0.7);
}

.srcd-data {
  flex: 0 0 380px;
  width: 380px;
  border-left: 1px solid var(--outline-soft);
  background: var(--surface-1);
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.srcd-photometa {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: var(--surface-3);
  border-radius: var(--radius-control);
  font-size: 12px;
  color: var(--ink-muted);
}
.srcd-photometa__type {
  font-weight: 700;
  color: var(--ink);
}
.srcd-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.srcd-heading {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-muted);
}
.srcd-defs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
  margin: 0;
}
.srcd-def {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.srcd-def dt {
  font-size: 11px;
  color: var(--ink-faint);
}
.srcd-def dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  word-break: break-word;
}
.srcd-table-wrap {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.srcd-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.srcd-table th,
.srcd-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--outline-soft);
  text-align: left;
  white-space: nowrap;
}
.srcd-table th {
  background: var(--surface-3);
  color: var(--ink-muted);
  font-weight: 600;
}
.srcd-table tbody tr:last-child td {
  border-bottom: none;
}

.srcd-enter-active,
.srcd-leave-active {
  transition: opacity 150ms ease;
}
.srcd-enter-active .srcd-panel,
.srcd-leave-active .srcd-panel {
  transition: transform 180ms ease;
}
.srcd-enter-from,
.srcd-leave-to {
  opacity: 0;
}
.srcd-enter-from .srcd-panel,
.srcd-leave-to .srcd-panel {
  transform: scale(0.98);
}

@media (max-width: 960px) {
  .srcd-body {
    flex-direction: column;
  }
  .srcd-data {
    flex: 0 0 auto;
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--outline-soft);
    max-height: 38%;
  }
  .srcd-defs {
    grid-template-columns: 1fr;
  }
}
</style>
