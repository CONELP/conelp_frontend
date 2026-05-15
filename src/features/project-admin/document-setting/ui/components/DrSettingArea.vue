<script setup lang="ts">
import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import type { UseDocumentSettingReturn } from "@/features/project-admin/document-setting/state/useDocumentSetting";

const props = defineProps<{
  selectedProjectId: string | null;
  state: UseDocumentSettingReturn;
}>();

const cellRefPlaceholder = `{
  "fixed": { ... },
  "lines": { ... },
  "lineConcat": { ... },
  "photos": {
    "0": {
      "types": ["DELIVERY_NOTE", "MILL_SHEET"],
      "rotatable": true,
      "cells": ["0!B3", "0!B15"],
      "descriptionOffset": { "row": 3, "col": 0 },
      "overflow": "INSERT_ROWS"
    }
  }
}`;

function requireProject(): string | null {
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    return null;
  }
  return props.selectedProjectId;
}

function onGenerate() {
  const pid = requireProject();
  if (!pid) return;
  void props.state.generateCellRef(pid, "DR");
}

function onSave() {
  const pid = requireProject();
  if (!pid) return;
  void props.state.saveCellRef(pid, "DR");
}
</script>

<template>
  <div v-if="state.isLoading.value" class="dr-area__loading">설정 로딩 중...</div>

  <div v-else class="dr-area">
    <div class="dr-area__intro">
      <AdminLabel>DR (작업일보) 문서번호</AdminLabel>
      <p class="dr-area__note">
        DR 문서번호는 <code>yyyyMMdd</code> 고정 포맷으로 서버가 자동 생성합니다. 편집할 수 없습니다.
      </p>
    </div>

    <section class="dr-area__section">
      <AdminLabel>DR 엑셀 셀 좌표 (JSON)</AdminLabel>
      <div class="dr-area__hint">
        <p>· 작업일보 템플릿의 셀 매핑 JSON.</p>
        <p>
          · <strong>자동 생성</strong>은 LLM이 템플릿을 분석해 재생성 후 즉시 DB에 저장합니다.
        </p>
        <p>
          · 수동 편집 후에는 <strong>셀 좌표 저장</strong>으로 반영. 스키마 위반 시 서버가 400을
          반환합니다.
        </p>
      </div>
      <textarea
        v-model="state.cellRefs.value.DR"
        :placeholder="cellRefPlaceholder"
        :disabled="state.isSavingCellRef.value.DR || state.isGeneratingCellRef.value.DR"
        rows="18"
        class="dr-area__textarea"
      />
      <div class="dr-area__actions">
        <AdminButton
          variant="outline"
          :disabled="state.isGeneratingCellRef.value.DR || state.isSavingCellRef.value.DR"
          @click="onGenerate"
        >
          {{ state.isGeneratingCellRef.value.DR ? "생성 중..." : "자동 생성" }}
        </AdminButton>
        <AdminButton
          :disabled="state.isSavingCellRef.value.DR || state.isGeneratingCellRef.value.DR"
          @click="onSave"
        >
          {{ state.isSavingCellRef.value.DR ? "저장 중..." : "셀 좌표 저장" }}
        </AdminButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dr-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.dr-area__loading {
  text-align: center;
  font-size: 13px;
  color: var(--ink-muted);
  padding: 32px 0;
}
.dr-area__intro {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dr-area__note {
  margin: 0;
  font-size: 12px;
  color: var(--ink-muted);
}
.dr-area__note code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  padding: 0 4px;
  background: var(--surface-3);
  border-radius: 3px;
}
.dr-area__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
}
.dr-area__hint {
  font-size: 11px;
  color: var(--ink-faint);
}
.dr-area__hint p {
  margin: 0;
}
.dr-area__textarea {
  width: 100%;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  padding: 10px;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  outline: none;
  resize: vertical;
}
.dr-area__textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-outline);
}
.dr-area__textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dr-area__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
