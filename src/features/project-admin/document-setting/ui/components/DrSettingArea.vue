<script setup lang="ts">
import { ref } from "vue";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import type { UseDocumentSettingReturn } from "@/features/project-admin/document-setting/state/useDocumentSetting";

const props = defineProps<{
  selectedProjectId: string | null;
  state: UseDocumentSettingReturn;
}>();

const docGenPromptPlaceholder = `예) 28일 강도가 비어 있으면 비고 칸에 "측정 예정" 으로 채운다.
- DR 양식변경 / 내용입력(doc-gen) LLM 호출 system prompt 에 매번 주입되는 자유 텍스트 지침.
- 비워두면 기본 동작.`;

const preprocessPromptPlaceholder = `예) 같은 공종의 작업 항목은 하나의 그룹으로 묶고, 오전/오후 구분 없이 일자 단위로 집계한다.
- 서버 집계 전 grouping 분류(preprocess) 단계에서 LLM 이 참고할 자유 텍스트 지침.
- 비워두면 기본 동작으로 분류.`;

const templateFileInput = ref<HTMLInputElement | null>(null);
const templateRefFileInput = ref<HTMLInputElement | null>(null);

function requireProject(): string | null {
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    return null;
  }
  return props.selectedProjectId;
}

async function onTemplateFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const pid = requireProject();
  if (!pid) {
    input.value = "";
    return;
  }
  try {
    await props.state.uploadTemplate(pid, "DR", file);
  } finally {
    input.value = "";
  }
}

async function onTemplateRefFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const pid = requireProject();
  if (!pid) {
    input.value = "";
    return;
  }
  try {
    await props.state.uploadTemplateRef(pid, "DR", file);
  } finally {
    input.value = "";
  }
}

function onSaveDocGenPrompt() {
  const pid = requireProject();
  if (!pid) return;
  void props.state.saveDocGenPrompt(pid, "DR");
}

function onSavePreprocessPrompt() {
  const pid = requireProject();
  if (!pid) return;
  void props.state.savePreprocessPrompt(pid, "DR");
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
      <AdminLabel>DR 엑셀 템플릿 (실제 출력용)</AdminLabel>
      <p class="dr-area__hint">· DR 문서 생성 결과물의 base 가 되는 실제 출력용 xlsx.</p>
      <div class="dr-area__row">
        <span class="dr-area__status">
          {{ state.templateUrls.value.DR ? "템플릿 등록됨" : "템플릿 없음" }}
        </span>
        <input
          ref="templateFileInput"
          type="file"
          accept=".xlsx,.xls"
          class="dr-area__file"
          @change="onTemplateFileChange"
        />
        <AdminButton
          variant="outline"
          size="sm"
          :disabled="state.isUploadingTemplate.value.DR"
          @click="templateFileInput?.click()"
        >
          {{
            state.isUploadingTemplate.value.DR
              ? "업로드 중..."
              : state.templateUrls.value.DR
              ? "템플릿 변경"
              : "템플릿 등록"
          }}
        </AdminButton>
      </div>
    </section>

    <section class="dr-area__section">
      <AdminLabel>DR 참조용 템플릿 (LLM 가이드용)</AdminLabel>
      <div class="dr-area__hint">
        <p>· placeholder 만 남긴 xlsx. LLM 양식변경·내용입력 directive 생성의 base.</p>
        <p>· 실제 출력용 템플릿과 셀 위치 / 시트 구조가 동일해야 합니다.</p>
        <p>
          · 미등록 상태에서 문서 생성 호출 시
          <code>TEMPLATE_NOT_CONFIGURED</code> 로 실패합니다.
        </p>
      </div>
      <div class="dr-area__row">
        <span class="dr-area__status">
          {{
            state.templateRefUrls.value.DR
              ? "참조 템플릿 등록됨"
              : "참조 템플릿 없음"
          }}
        </span>
        <input
          ref="templateRefFileInput"
          type="file"
          accept=".xlsx,.xls"
          class="dr-area__file"
          @change="onTemplateRefFileChange"
        />
        <AdminButton
          variant="outline"
          size="sm"
          :disabled="state.isUploadingTemplateRef.value.DR"
          @click="templateRefFileInput?.click()"
        >
          {{
            state.isUploadingTemplateRef.value.DR
              ? "업로드 중..."
              : state.templateRefUrls.value.DR
              ? "참조 템플릿 변경"
              : "참조 템플릿 등록"
          }}
        </AdminButton>
      </div>
    </section>

    <section class="dr-area__section">
      <AdminLabel>DR preprocess 프롬프트</AdminLabel>
      <div class="dr-area__hint">
        <p>· 서버 집계 전 grouping 분류(preprocess) 단계에서 LLM 에 전달되는 자유 텍스트 지침입니다.</p>
        <p>· 작업 항목 묶음 규칙, 일자/공종 단위 집계 기준 등을 작성하세요.</p>
        <p>· 비워두면 기본 동작으로 분류됩니다.</p>
      </div>
      <textarea
        v-model="state.preprocessPrompts.value.DR"
        :placeholder="preprocessPromptPlaceholder"
        :disabled="state.isSavingPreprocessPrompt.value.DR"
        rows="12"
        class="dr-area__textarea"
      />
      <div class="dr-area__actions">
        <AdminButton
          :disabled="state.isSavingPreprocessPrompt.value.DR"
          @click="onSavePreprocessPrompt"
        >
          {{
            state.isSavingPreprocessPrompt.value.DR
              ? "저장 중..."
              : "preprocess 프롬프트 저장"
          }}
        </AdminButton>
      </div>
    </section>

    <section class="dr-area__section">
      <AdminLabel>DR 문서생성(doc-gen) 프롬프트</AdminLabel>
      <div class="dr-area__hint">
        <p>
          · DR 문서 생성 시 양식변경 / 내용입력(doc-gen) LLM 호출 system prompt 에 매번 함께 전달되는 자유 텍스트 지침입니다.
        </p>
        <p>· 양식의 특수 규칙(셀 누적 위치, 행 복제, 페이지 분할 등)을 작성하세요.</p>
        <p>· 비워두면 기본 동작으로 생성됩니다.</p>
      </div>
      <textarea
        v-model="state.docGenPrompts.value.DR"
        :placeholder="docGenPromptPlaceholder"
        :disabled="state.isSavingDocGenPrompt.value.DR"
        rows="14"
        class="dr-area__textarea"
      />
      <div class="dr-area__actions">
        <AdminButton
          :disabled="state.isSavingDocGenPrompt.value.DR"
          @click="onSaveDocGenPrompt"
        >
          {{
            state.isSavingDocGenPrompt.value.DR
              ? "저장 중..."
              : "문서생성 프롬프트 저장"
          }}
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
.dr-area__note code,
.dr-area__hint code {
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
.dr-area__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.dr-area__status {
  font-size: 13px;
  color: var(--ink-muted);
}
.dr-area__file {
  display: none;
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
