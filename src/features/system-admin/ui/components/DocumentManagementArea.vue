<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import AdminSelect from "@/shared/ui/admin/Select.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import { useDocumentManagement } from "@/features/system-admin/state/useDocumentManagement";
import DocumentSourceDialog from "@/features/system-admin/ui/components/DocumentSourceDialog.vue";
import {
  SOURCE_SUPPORTED_DOC_TYPES,
  SUPER_DOC_STATUS_LABELS,
  SUPER_DOC_TYPE_LABELS,
} from "@/features/system-admin/model/super-document.types";
import type {
  SuperDocStatus,
  SuperDocType,
  SuperDocumentJob,
} from "@/features/system-admin/model/super-document.types";

const {
  documents,
  projects,
  filterProjectId,
  filterDocType,
  filterStatus,
  isLoading,
  isSaving,
  isReuploading,
  downloadingJobId,
  loadProjects,
  loadDocuments,
  resetFilters,
  updateDocNo,
  updateStatus,
  reupload,
  downloadDocument,
} = useDocumentManagement();

const docTypeOptions = (Object.keys(SUPER_DOC_TYPE_LABELS) as SuperDocType[]).map((value) => ({
  value,
  label: SUPER_DOC_TYPE_LABELS[value],
}));

const statusOptions = (Object.keys(SUPER_DOC_STATUS_LABELS) as SuperDocStatus[]).map((value) => ({
  value,
  label: SUPER_DOC_STATUS_LABELS[value],
}));

const projectOptions = computed(() =>
  projects.value.map((project) => ({ value: project.id, label: project.projectName })),
);

function docTypeLabel(docType: SuperDocType) {
  return SUPER_DOC_TYPE_LABELS[docType] ?? docType;
}

function statusLabel(status: SuperDocStatus) {
  return SUPER_DOC_STATUS_LABELS[status] ?? status;
}

function statusClass(status: SuperDocStatus) {
  return `doc-area__status--${status.toLowerCase()}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function supportsSource(docType: SuperDocType) {
  return SOURCE_SUPPORTED_DOC_TYPES.includes(docType);
}

// --- 문서번호 수정 ---
const isDocNoOpen = ref(false);
const docNoTarget = ref<SuperDocumentJob | null>(null);
const docNoInput = ref("");

function openDocNo(job: SuperDocumentJob) {
  docNoTarget.value = job;
  docNoInput.value = job.docNo ?? "";
  isDocNoOpen.value = true;
}

async function submitDocNo() {
  if (!docNoTarget.value) return;
  if (!docNoInput.value.trim()) {
    alert("문서번호를 입력해주세요.");
    return;
  }
  const ok = await updateDocNo(docNoTarget.value, docNoInput.value.trim());
  if (ok) {
    isDocNoOpen.value = false;
    docNoTarget.value = null;
  }
}

// --- 상태 변경 ---
const isStatusOpen = ref(false);
const statusTarget = ref<SuperDocumentJob | null>(null);
const statusInput = ref<SuperDocStatus | null>(null);

function openStatus(job: SuperDocumentJob) {
  statusTarget.value = job;
  statusInput.value = job.status;
  isStatusOpen.value = true;
}

async function submitStatus() {
  if (!statusTarget.value || !statusInput.value) return;
  const ok = await updateStatus(statusTarget.value, statusInput.value);
  if (ok) {
    isStatusOpen.value = false;
    statusTarget.value = null;
  }
}

// --- 재등록 (xlsx 교체) ---
const isReuploadOpen = ref(false);
const reuploadTarget = ref<SuperDocumentJob | null>(null);
const reuploadFile = ref<File | null>(null);
const reuploadInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

function openReupload(job: SuperDocumentJob) {
  reuploadTarget.value = job;
  reuploadFile.value = null;
  isDragging.value = false;
  if (reuploadInputRef.value) reuploadInputRef.value.value = "";
  isReuploadOpen.value = true;
}

function setReuploadFile(file: File | null) {
  if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
    alert("xlsx 파일만 재등록할 수 있습니다.");
    return;
  }
  reuploadFile.value = file;
}

function onReuploadFileChange(event: Event) {
  setReuploadFile((event.target as HTMLInputElement).files?.[0] ?? null);
}

function onReuploadDrop(event: DragEvent) {
  isDragging.value = false;
  setReuploadFile(event.dataTransfer?.files?.[0] ?? null);
}

async function submitReupload() {
  if (!reuploadTarget.value) return;
  if (!reuploadFile.value) {
    alert("재등록할 xlsx 파일을 선택해주세요.");
    return;
  }
  if (!reuploadFile.value.name.toLowerCase().endsWith(".xlsx")) {
    alert("xlsx 파일만 재등록할 수 있습니다.");
    return;
  }
  const ok = await reupload(reuploadTarget.value, reuploadFile.value);
  if (ok) {
    isReuploadOpen.value = false;
    reuploadTarget.value = null;
    reuploadFile.value = null;
  }
}

// --- 원본 사진/추출정보 ---
const isSourceOpen = ref(false);
const sourceTarget = ref<SuperDocumentJob | null>(null);

function openSource(job: SuperDocumentJob) {
  sourceTarget.value = job;
  isSourceOpen.value = true;
}

onMounted(() => {
  void loadProjects();
  void loadDocuments();
});
</script>

<template>
  <div class="doc-area">
    <!-- 필터 -->
    <div class="doc-area__filters">
      <div class="doc-area__filter">
        <AdminLabel for="doc-filter-project">프로젝트</AdminLabel>
        <AdminSelect
          id="doc-filter-project"
          :model-value="filterProjectId"
          :options="projectOptions"
          placeholder="전체"
          @update:model-value="filterProjectId = ($event as string | null)"
        />
      </div>
      <div class="doc-area__filter">
        <AdminLabel for="doc-filter-type">문서종류</AdminLabel>
        <AdminSelect
          id="doc-filter-type"
          :model-value="filterDocType"
          :options="docTypeOptions"
          placeholder="전체"
          @update:model-value="filterDocType = ($event as SuperDocType | null)"
        />
      </div>
      <div class="doc-area__filter">
        <AdminLabel for="doc-filter-status">상태</AdminLabel>
        <AdminSelect
          id="doc-filter-status"
          :model-value="filterStatus"
          :options="statusOptions"
          placeholder="전체"
          @update:model-value="filterStatus = ($event as SuperDocStatus | null)"
        />
      </div>
      <div class="doc-area__filter-actions">
        <AdminButton :disabled="isLoading" @click="loadDocuments">조회</AdminButton>
        <AdminButton variant="outline" :disabled="isLoading" @click="resetFilters">초기화</AdminButton>
      </div>
    </div>

    <!-- 목록 -->
    <div class="doc-area__table-wrap">
      <table class="doc-area__table">
        <thead>
          <tr>
            <th class="doc-area__th">프로젝트</th>
            <th class="doc-area__th">문서종류</th>
            <th class="doc-area__th">문서번호</th>
            <th class="doc-area__th">상태</th>
            <th class="doc-area__th">생성일</th>
            <th class="doc-area__th">완료일</th>
            <th class="doc-area__th doc-area__th--actions">작업</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td class="doc-area__td doc-area__td--empty" colspan="7">로딩 중...</td>
          </tr>
          <tr v-else-if="documents.length === 0">
            <td class="doc-area__td doc-area__td--empty" colspan="7">문서가 없습니다.</td>
          </tr>
          <tr v-for="doc in documents" :key="doc.jobId">
            <td class="doc-area__td">{{ doc.projectName }}</td>
            <td class="doc-area__td">{{ docTypeLabel(doc.docType) }}</td>
            <td class="doc-area__td doc-area__td--docno">{{ doc.docNo || "-" }}</td>
            <td class="doc-area__td">
              <span class="doc-area__status" :class="statusClass(doc.status)">
                {{ statusLabel(doc.status) }}
              </span>
            </td>
            <td class="doc-area__td">{{ formatDateTime(doc.createdAt) }}</td>
            <td class="doc-area__td">{{ formatDateTime(doc.completedAt) }}</td>
            <td class="doc-area__td doc-area__td--actions">
              <div class="doc-area__actions">
                <AdminButton
                  size="sm"
                  variant="outline"
                  :disabled="downloadingJobId === doc.jobId"
                  @click="downloadDocument(doc)"
                >
                  {{ downloadingJobId === doc.jobId ? "다운로드 중…" : "다운로드" }}
                </AdminButton>
                <AdminButton size="sm" variant="ghost" @click="openDocNo(doc)">번호수정</AdminButton>
                <AdminButton size="sm" variant="ghost" @click="openStatus(doc)">상태변경</AdminButton>
                <AdminButton size="sm" variant="ghost" @click="openReupload(doc)">재등록</AdminButton>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  :disabled="!supportsSource(doc.docType)"
                  :title="supportsSource(doc.docType) ? '' : 'MIR/CAT/CCST 문서만 지원'"
                  @click="openSource(doc)"
                >
                  원본보기
                </AdminButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 문서번호 수정 -->
    <AdminDialog
      :open="isDocNoOpen"
      title="문서번호 수정"
      width="sm"
      @update:open="isDocNoOpen = $event"
    >
      <div class="doc-area__form">
        <p class="doc-area__note">
          DB 의 문서번호만 변경됩니다. 파일명·파일 내부 번호는 바뀌지 않으며, 내부 번호까지
          고치려면 재등록을 사용하세요.
        </p>
        <div class="doc-area__field">
          <AdminLabel for="docno-input">문서번호 *</AdminLabel>
          <AdminInput id="docno-input" v-model="docNoInput" placeholder="문서번호 입력" />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isDocNoOpen = false">취소</AdminButton>
        <AdminButton :disabled="isSaving" @click="submitDocNo">
          {{ isSaving ? "저장 중..." : "저장" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <!-- 상태 변경 -->
    <AdminDialog
      :open="isStatusOpen"
      title="문서 상태 변경"
      width="sm"
      @update:open="isStatusOpen = $event"
    >
      <div class="doc-area__form">
        <p class="doc-area__note">
          전이 검증 없이 상태만 교체하는 수동 오버라이드입니다 (예: 승인 처리).
        </p>
        <div class="doc-area__field">
          <AdminLabel>상태 *</AdminLabel>
          <div class="doc-area__status-choices" role="group" aria-label="상태 선택">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              type="button"
              class="doc-area__status-choice"
              :class="{ 'doc-area__status-choice--active': statusInput === opt.value }"
              :aria-pressed="statusInput === opt.value"
              @click="statusInput = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isStatusOpen = false">취소</AdminButton>
        <AdminButton :disabled="isSaving" @click="submitStatus">
          {{ isSaving ? "변경 중..." : "변경" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <!-- 재등록 -->
    <AdminDialog
      :open="isReuploadOpen"
      title="수정본 재등록"
      width="sm"
      @update:open="isReuploadOpen = $event"
    >
      <div class="doc-area__form">
        <p class="doc-area__note">
          기존 링크 내용을 교체합니다(링크 불변). xlsx 만 허용되며, 기존 PDF 가 있으면 삭제되고
          다운로드는 새 xlsx 로 폴백됩니다.
        </p>
        <div class="doc-area__field">
          <AdminLabel>xlsx 파일 *</AdminLabel>
          <button
            type="button"
            class="doc-area__dropzone"
            :class="{
              'doc-area__dropzone--drag': isDragging,
              'doc-area__dropzone--has': reuploadFile,
            }"
            @click="reuploadInputRef?.click()"
            @dragover.prevent="isDragging = true"
            @dragenter.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onReuploadDrop"
          >
            <span v-if="reuploadFile" class="doc-area__dropzone-name">{{ reuploadFile.name }}</span>
            <span v-else class="doc-area__dropzone-hint">
              xlsx 파일을 여기로 끌어다 놓거나 클릭해 선택
            </span>
          </button>
          <input
            ref="reuploadInputRef"
            class="doc-area__file-hidden"
            type="file"
            accept=".xlsx"
            @change="onReuploadFileChange"
          />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isReuploadOpen = false">취소</AdminButton>
        <AdminButton :disabled="isReuploading" @click="submitReupload">
          {{ isReuploading ? "업로드 중..." : "재등록" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <!-- 원본 사진/추출정보 -->
    <DocumentSourceDialog
      :open="isSourceOpen"
      :job="sourceTarget"
      @update:open="isSourceOpen = $event"
    />
  </div>
</template>

<style scoped>
.doc-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.doc-area__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}
.doc-area__filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 180px;
}
.doc-area__filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.doc-area__table-wrap {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow-x: auto;
}
.doc-area__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.doc-area__th {
  text-align: left;
  font-weight: 600;
  padding: 10px 14px;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
  color: var(--ink-muted);
  white-space: nowrap;
}
.doc-area__th--actions {
  text-align: center;
}
.doc-area__td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--outline-soft);
  white-space: nowrap;
}
.doc-area__td--docno {
  font-weight: 600;
}
.doc-area__td--actions {
  text-align: center;
}
.doc-area__td--empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 24px 14px;
}
.doc-area__table tbody tr:last-child .doc-area__td {
  border-bottom: none;
}
.doc-area__table tbody tr:hover {
  background: var(--surface-3);
}
.doc-area__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

/* 상태 — 색상 단독이 아닌 텍스트 + 외곽선으로 구분 */
.doc-area__status {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid var(--outline-soft);
  color: var(--ink-muted);
  background: var(--surface-1);
}
.doc-area__status--running {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}
.doc-area__status--succeeded,
.doc-area__status--approved {
  border-color: #15803d;
  color: #15803d;
  background: rgba(21, 128, 61, 0.08);
}
.doc-area__status--approved {
  font-weight: 700;
}
.doc-area__status--failed {
  border-color: #b91c1c;
  color: #b91c1c;
  background: rgba(185, 28, 28, 0.08);
}

.doc-area__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.doc-area__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.doc-area__note {
  margin: 0;
  font-size: 12px;
  color: var(--ink-muted);
  line-height: 1.5;
}
.doc-area__status-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.doc-area__status-choice {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  color: var(--ink);
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.doc-area__status-choice:hover {
  background: var(--surface-3);
}
.doc-area__status-choice--active {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary);
}
.doc-area__file-hidden {
  display: none;
}
.doc-area__dropzone {
  font: inherit;
  width: 100%;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  color: var(--ink-muted);
  background: var(--surface-3);
  border: 1.5px dashed var(--outline-soft);
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.doc-area__dropzone:hover {
  border-color: var(--primary);
  color: var(--ink);
}
.doc-area__dropzone--drag {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary);
}
.doc-area__dropzone--has {
  border-style: solid;
  color: var(--ink);
}
.doc-area__dropzone-hint {
  font-size: 13px;
}
.doc-area__dropzone-name {
  font-size: 13px;
  font-weight: 600;
  word-break: break-all;
}
</style>
