<script setup lang="ts">
import { ref, watch } from "vue";

import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import { superDocumentApi } from "@/features/system-admin/services/super-document.api";
import SourcePhoto from "@/features/system-admin/ui/components/SourcePhoto.vue";
import {
  SOURCE_FIELD_LABELS,
  SUPER_DOC_TYPE_LABELS,
} from "@/features/system-admin/model/super-document.types";
import type {
  SuperDocumentJob,
  SuperDocumentSource,
  SuperDocumentSourceLine,
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

function labelFor(key: string): string {
  return SOURCE_FIELD_LABELS[key] ?? key;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldEntries(record: Record<string, unknown>): [string, unknown][] {
  return Object.entries(record).filter(([key]) => key !== "photos");
}

function linePhotos(line: SuperDocumentSourceLine) {
  return line.photos ?? [];
}

async function load(job: SuperDocumentJob) {
  isLoading.value = true;
  errorMessage.value = "";
  source.value = null;
  try {
    source.value = await superDocumentApi.getDocumentSource(job.jobId, job.projectId);
  } catch (error) {
    errorMessage.value = (error as Error).message || "원본 정보를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => [props.open, props.job?.jobId] as const,
  ([open, jobId]) => {
    if (open && jobId != null && props.job) {
      void load(props.job);
    }
    if (!open) {
      source.value = null;
      errorMessage.value = "";
    }
  },
  { immediate: true },
);
</script>

<template>
  <AdminDialog
    :open="open"
    width="xl"
    :title="
      job
        ? `원본 사진 · 추출정보 — ${SUPER_DOC_TYPE_LABELS[job.docType]} (${job.projectName})`
        : '원본 사진 · 추출정보'
    "
    @update:open="emit('update:open', $event)"
  >
    <div class="doc-source">
      <p v-if="isLoading" class="doc-source__state">불러오는 중…</p>
      <p v-else-if="errorMessage" class="doc-source__state doc-source__state--error">
        {{ errorMessage }}
      </p>

      <template v-else-if="source">
        <!-- 문서 단위 헤더 (MIR) -->
        <section
          v-if="source.header && fieldEntries(source.header).length"
          class="doc-source__section"
        >
          <h4 class="doc-source__heading">추출 헤더</h4>
          <dl class="doc-source__defs">
            <div
              v-for="[key, value] in fieldEntries(source.header)"
              :key="key"
              class="doc-source__def"
            >
              <dt>{{ labelFor(key) }}</dt>
              <dd>{{ formatValue(value) }}</dd>
            </div>
          </dl>
        </section>

        <!-- 문서 단위 사진 (MIR) -->
        <section v-if="source.photos.length" class="doc-source__section">
          <h4 class="doc-source__heading">문서 사진</h4>
          <div class="doc-source__photos">
            <SourcePhoto
              v-for="(photo, i) in source.photos"
              :key="`doc-photo-${i}`"
              :gs-url="photo.url"
              :project-id="job?.projectId"
              :type="photo.type"
              :description="photo.description"
            />
          </div>
        </section>

        <!-- 라인별 추출정보 + 사진 (MIR/CAT/CCST) -->
        <section v-if="source.lines.length" class="doc-source__section">
          <h4 class="doc-source__heading">추출 라인 ({{ source.lines.length }})</h4>
          <div class="doc-source__lines">
            <div
              v-for="(line, idx) in source.lines"
              :key="`line-${idx}`"
              class="doc-source__line"
            >
              <div class="doc-source__line-no">라인 {{ idx + 1 }}</div>
              <dl class="doc-source__defs">
                <div
                  v-for="[key, value] in fieldEntries(line)"
                  :key="key"
                  class="doc-source__def"
                >
                  <dt>{{ labelFor(key) }}</dt>
                  <dd>{{ formatValue(value) }}</dd>
                </div>
              </dl>
              <div v-if="linePhotos(line).length" class="doc-source__photos">
                <SourcePhoto
                  v-for="(photo, i) in linePhotos(line)"
                  :key="`line-${idx}-photo-${i}`"
                  :gs-url="photo.url"
                  :project-id="job?.projectId"
                  :type="photo.type"
                  :description="photo.description"
                />
              </div>
            </div>
          </div>
        </section>

        <p
          v-if="!source.header && !source.photos.length && !source.lines.length"
          class="doc-source__state"
        >
          추출된 사진/정보가 없습니다.
        </p>
      </template>
    </div>
  </AdminDialog>
</template>

<style scoped>
.doc-source {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.doc-source__state {
  text-align: center;
  color: var(--ink-faint);
  padding: 24px 0;
  margin: 0;
}
.doc-source__state--error {
  color: #b91c1c;
}
.doc-source__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.doc-source__heading {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-muted);
}
.doc-source__defs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px 16px;
  margin: 0;
}
.doc-source__def {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.doc-source__def dt {
  font-size: 11px;
  color: var(--ink-faint);
}
.doc-source__def dd {
  margin: 0;
  font-size: 13px;
  color: var(--ink);
  word-break: break-word;
}
.doc-source__lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.doc-source__line {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--surface-1);
}
.doc-source__line-no {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
}
.doc-source__photos {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
