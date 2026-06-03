<script setup lang="ts">
import { computed, ref } from "vue";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import type {
  DocConfigDocType,
  DocGenPromptDocType,
  TemplateDocType,
  TemplateRefDocType,
} from "@/features/project-admin/_shared/services/doc-config.api";
import type { UseDocumentSettingReturn } from "@/features/project-admin/document-setting/state/useDocumentSetting";

// DR 은 DrSettingArea 가 담당하므로 이 컴포넌트는 DR 을 제외한 5종만 렌더한다.
type NonDrDocGenDocType = Exclude<DocGenPromptDocType, "DR">;

const props = defineProps<{
  docType: NonDrDocGenDocType;
  selectedProjectId: string | null;
  state: UseDocumentSettingReturn;
}>();

const docTypeLabels: Record<NonDrDocGenDocType, string> = {
  MIR: "MIR",
  CAT: "CAT",
  CCST: "CCST",
  MAT_INOUT: "MAT_INOUT (자재 수불현황표)",
  CONC_LOG: "CONC_LOG (콘크리트 관리대장)",
};

const placeholder = `문서번호는 다음 규칙을 따른다.
- 형식: ${props.docType}-{yyyyMMdd}-{division}-{seq2}
- division 은 한글 2글자 자재대분류 (철근/레미콘/거푸집 등)
- seq2 는 해당 날짜+division 조합으로 01 부터 순증가, 두 자리 zero-pad
- 예: "${props.docType}-20260423-철근-01"`;

const docGenPromptPlaceholder = `예) 28일 강도 셀 좌표는 시트 2번의 J열에 누적되며, 사진은 한 페이지당 4장 배치한다.
- 양식의 특수한 셀 위치, 페이지 분할, 머리글/꼬리말, 정렬 규칙 등 LLM 이 양식변경/내용입력(doc-gen) 스크립트를 생성할 때 참고할 자유 텍스트 지침을 작성하세요.
- 비워두면 LLM 은 기본 동작으로 생성합니다.`;

const preprocessPromptPlaceholder = `예) 동일 송장번호의 입·출고 행은 하나의 그룹으로 묶고, 규격 표기가 다른 동일 자재는 같은 division 으로 분류한다.
- 서버 집계 전 grouping 분류(preprocess) 단계에서 LLM 이 참고할 자유 텍스트 지침입니다.
- 비워두면 기본 동작으로 분류합니다.`;

const analyzePhotoPromptPlaceholder = `예) 송장 이미지에서 자재 규격이 흐리면 인접 행의 단위를 따르고, 합계 행은 자재로 인식하지 않는다.
- MIR 송장 이미지 자재 식별(analyze) 단계에서 LLM 이 참고할 추가 규칙입니다.
- 비워두면 기본 동작으로 식별합니다.`;

const templateFileInput = ref<HTMLInputElement | null>(null);
const templateRefFileInput = ref<HTMLInputElement | null>(null);

const hasTemplate = computed(() => props.docType !== "CCST");
const hasDocNoPrompt = computed(
  () =>
    props.docType !== "CCST" &&
    props.docType !== "MAT_INOUT" &&
    props.docType !== "CONC_LOG",
);
const templateDocType = computed(() =>
  props.docType === "CCST" ? null : (props.docType as TemplateDocType),
);
const templateRefDocType = computed(() => props.docType as TemplateRefDocType);
// preprocess 단계 프롬프트는 MAT_INOUT 만, analyze 단계 프롬프트는 MIR 만 존재한다.
const hasPreprocess = computed(() => props.docType === "MAT_INOUT");
const hasAnalyze = computed(() => props.docType === "MIR");
// MAT_INOUT / CONC_LOG 은 문서번호(yyyyMMdd 자동) 규칙이 없어 docNo 프롬프트 섹션을 렌더하지 않는다.
// hasDocNoPrompt 가 false 인 docType 에서는 fallback 값이 실제로 쓰이지 않는다.
const docNoDocType = computed<DocConfigDocType>(() =>
  props.docType === "MAT_INOUT" || props.docType === "CONC_LOG"
    ? "MIR"
    : (props.docType as DocConfigDocType),
);

async function onTemplateFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    input.value = "";
    return;
  }
  const docType = templateDocType.value;
  if (!docType) {
    input.value = "";
    return;
  }
  try {
    await props.state.uploadTemplate(props.selectedProjectId, docType, file);
  } finally {
    input.value = "";
  }
}

async function onTemplateRefFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    input.value = "";
    return;
  }
  try {
    await props.state.uploadTemplateRef(
      props.selectedProjectId,
      templateRefDocType.value,
      file,
    );
  } finally {
    input.value = "";
  }
}

function onSave() {
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    return;
  }
  if (hasDocNoPrompt.value) {
    void props.state.save(props.selectedProjectId, docNoDocType.value);
  }
}

function onSaveDocGenPrompt() {
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    return;
  }
  void props.state.saveDocGenPrompt(props.selectedProjectId, props.docType);
}

function onSavePreprocessPrompt() {
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    return;
  }
  if (props.docType !== "MAT_INOUT") return;
  void props.state.savePreprocessPrompt(props.selectedProjectId, "MAT_INOUT");
}

function onSaveMirAnalyzePhotoPrompt() {
  if (!props.selectedProjectId) {
    alert("프로젝트를 먼저 선택해주세요.");
    return;
  }
  void props.state.saveMirAnalyzePhotoPrompt(props.selectedProjectId);
}
</script>

<template>
  <div v-if="state.isLoading.value" class="doc-area__loading">설정 로딩 중...</div>

  <div v-else class="doc-area">
    <section
      v-if="hasTemplate && templateDocType"
      class="doc-area__section"
    >
      <AdminLabel>{{ docTypeLabels[docType] }} 엑셀 템플릿 (실제 출력용)</AdminLabel>
      <p class="doc-area__hint">· 문서 생성 결과물의 base 가 되는 실제 출력용 xlsx.</p>
      <div class="doc-area__row">
        <span class="doc-area__status">
          {{ state.templateUrls.value[templateDocType] ? "템플릿 등록됨" : "템플릿 없음" }}
        </span>
        <input
          ref="templateFileInput"
          type="file"
          accept=".xlsx,.xls"
          class="doc-area__file"
          @change="onTemplateFileChange"
        />
        <AdminButton
          variant="outline"
          size="sm"
          :disabled="state.isUploadingTemplate.value[templateDocType]"
          @click="templateFileInput?.click()"
        >
          {{
            state.isUploadingTemplate.value[templateDocType]
              ? "업로드 중..."
              : state.templateUrls.value[templateDocType]
              ? "템플릿 변경"
              : "템플릿 등록"
          }}
        </AdminButton>
      </div>
    </section>

    <section v-else class="doc-area__section doc-area__section--note">
      <p>· CCST 는 자체 출력용 템플릿을 사용하지 않습니다. CAT 결과 xlsx 위에 덧칠되는 흐름입니다.</p>
      <p>· 문서번호도 CAT 잡의 docNo 를 재사용하므로 별도 규칙이 필요하지 않습니다.</p>
    </section>

    <section class="doc-area__section">
      <AdminLabel>{{ docTypeLabels[docType] }} 참조용 템플릿 (LLM 가이드용)</AdminLabel>
      <div class="doc-area__hint">
        <p>· placeholder 만 남긴 xlsx. LLM 양식변경·내용입력 directive 생성의 base 로 사용됩니다.</p>
        <p v-if="docType !== 'CCST'">· 실제 출력용 템플릿과 셀 위치 / 시트 구조가 동일해야 합니다.</p>
        <p v-else>· CCST 는 출력용 템플릿이 따로 없으므로, 참조용 템플릿은 CAT 결과 xlsx 와 구조가 일치해야 합니다.</p>
        <p>· 미등록 상태에서 문서 생성 호출 시 <code>TEMPLATE_REF_NOT_CONFIGURED</code> 로 실패합니다.</p>
      </div>
      <div class="doc-area__row">
        <span class="doc-area__status">
          {{
            state.templateRefUrls.value[templateRefDocType]
              ? "참조 템플릿 등록됨"
              : "참조 템플릿 없음"
          }}
        </span>
        <input
          ref="templateRefFileInput"
          type="file"
          accept=".xlsx,.xls"
          class="doc-area__file"
          @change="onTemplateRefFileChange"
        />
        <AdminButton
          variant="outline"
          size="sm"
          :disabled="state.isUploadingTemplateRef.value[templateRefDocType]"
          @click="templateRefFileInput?.click()"
        >
          {{
            state.isUploadingTemplateRef.value[templateRefDocType]
              ? "업로드 중..."
              : state.templateRefUrls.value[templateRefDocType]
              ? "참조 템플릿 변경"
              : "참조 템플릿 등록"
          }}
        </AdminButton>
      </div>
    </section>

    <section v-if="hasDocNoPrompt" class="doc-area__section">
      <AdminLabel>{{ docTypeLabels[docType] }} 문서번호 생성 규칙</AdminLabel>
      <div class="doc-area__hint">
        <p>· LLM 이 이 텍스트를 그대로 읽고 문서번호를 생성합니다.</p>
        <p>· 포맷 예시, 치환 변수(<code>{yyyyMMdd}</code>, <code>{division}</code> 등), 금지 조건을 구체적으로 기재하세요.</p>
      </div>
      <textarea
        v-model="state.prompts.value[docNoDocType]"
        :placeholder="placeholder"
        :disabled="state.isSaving.value[docNoDocType]"
        rows="10"
        class="doc-area__textarea"
      />
      <div class="doc-area__actions">
        <AdminButton :disabled="state.isSaving.value[docNoDocType]" @click="onSave">
          {{ state.isSaving.value[docNoDocType] ? "저장 중..." : "문서번호 규칙 저장" }}
        </AdminButton>
      </div>
    </section>

    <section v-if="hasPreprocess" class="doc-area__section">
      <AdminLabel>{{ docTypeLabels[docType] }} preprocess 프롬프트</AdminLabel>
      <div class="doc-area__hint">
        <p>· 서버 집계 전 grouping 분류(preprocess) 단계에서 LLM 에 전달되는 자유 텍스트 지침입니다.</p>
        <p>· 송장/행 묶음 규칙, division 분류 기준 등을 작성하세요.</p>
        <p>· 비워두면 기본 동작으로 분류됩니다.</p>
      </div>
      <textarea
        v-model="state.preprocessPrompts.value.MAT_INOUT"
        :placeholder="preprocessPromptPlaceholder"
        :disabled="state.isSavingPreprocessPrompt.value.MAT_INOUT"
        rows="12"
        class="doc-area__textarea"
      />
      <div class="doc-area__actions">
        <AdminButton
          :disabled="state.isSavingPreprocessPrompt.value.MAT_INOUT"
          @click="onSavePreprocessPrompt"
        >
          {{
            state.isSavingPreprocessPrompt.value.MAT_INOUT
              ? "저장 중..."
              : "preprocess 프롬프트 저장"
          }}
        </AdminButton>
      </div>
    </section>

    <section class="doc-area__section">
      <AdminLabel>{{ docTypeLabels[docType] }} 문서생성(doc-gen) 프롬프트</AdminLabel>
      <div class="doc-area__hint">
        <p>
          · {{ docTypeLabels[docType] }} 문서 생성 시 양식변경 / 내용입력(doc-gen) LLM 호출에 매번 함께 전달되는 자유 텍스트 지침입니다.
        </p>
        <p>· 양식의 특수 규칙(셀 누적 위치, 페이지 분할, 머리글/꼬리말 등)을 작성하세요.</p>
        <p>· 비워두면 기본 동작으로 생성됩니다.</p>
      </div>
      <textarea
        v-model="state.docGenPrompts.value[docType]"
        :placeholder="docGenPromptPlaceholder"
        :disabled="state.isSavingDocGenPrompt.value[docType]"
        rows="14"
        class="doc-area__textarea"
      />
      <div class="doc-area__actions">
        <AdminButton
          :disabled="state.isSavingDocGenPrompt.value[docType]"
          @click="onSaveDocGenPrompt"
        >
          {{
            state.isSavingDocGenPrompt.value[docType]
              ? "저장 중..."
              : "문서생성 프롬프트 저장"
          }}
        </AdminButton>
      </div>
    </section>

    <section v-if="hasAnalyze" class="doc-area__section">
      <AdminLabel>MIR analyze 프롬프트 (송장 이미지 자재 식별)</AdminLabel>
      <div class="doc-area__hint">
        <p>· MIR 송장 이미지에서 자재를 식별(analyze)하는 단계에서 LLM 에 전달되는 추가 규칙입니다.</p>
        <p>· createMir / createCat 문서 생성 내부에서 사용됩니다.</p>
        <p>· 비워두면 기본 동작으로 식별됩니다.</p>
      </div>
      <textarea
        v-model="state.mirAnalyzePhotoPrompt.value"
        :placeholder="analyzePhotoPromptPlaceholder"
        :disabled="state.isSavingMirAnalyzePhotoPrompt.value"
        rows="12"
        class="doc-area__textarea"
      />
      <div class="doc-area__actions">
        <AdminButton
          :disabled="state.isSavingMirAnalyzePhotoPrompt.value"
          @click="onSaveMirAnalyzePhotoPrompt"
        >
          {{
            state.isSavingMirAnalyzePhotoPrompt.value
              ? "저장 중..."
              : "analyze 프롬프트 저장"
          }}
        </AdminButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.doc-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.doc-area__loading {
  text-align: center;
  font-size: 13px;
  color: var(--ink-muted);
  padding: 32px 0;
}
.doc-area__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
}
.doc-area__section--note {
  border-style: dashed;
  font-size: 12px;
  color: var(--ink-faint);
}
.doc-area__section--note p {
  margin: 0;
}
.doc-area__hint {
  font-size: 11px;
  color: var(--ink-faint);
}
.doc-area__hint p {
  margin: 0;
}
.doc-area__hint code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  padding: 0 4px;
  background: var(--surface-3);
  border-radius: 3px;
}
.doc-area__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.doc-area__status {
  font-size: 13px;
  color: var(--ink-muted);
}
.doc-area__file {
  display: none;
}
.doc-area__textarea {
  width: 100%;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  padding: 10px;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  outline: none;
  resize: vertical;
}
.doc-area__textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-outline);
}
.doc-area__textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.doc-area__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
