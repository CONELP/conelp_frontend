import { ref } from "vue";

import {
  docConfigApi,
  type DocConfigDocType,
  type DocConfigResponse,
  type ExcelCellRefDocType,
  type ScriptPromptDocType,
  type TemplateDocType,
  type TemplateRefDocType,
} from "@/features/project-admin/_shared/services/doc-config.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

type Prompts = Record<DocConfigDocType, string>;
type CellRefs = Record<ExcelCellRefDocType, string>;
type CellRefFlags = Record<ExcelCellRefDocType, boolean>;
type ScriptPrompts = Record<ScriptPromptDocType, string>;
type ScriptPromptFlags = Record<ScriptPromptDocType, boolean>;
type TemplateUrls = Record<TemplateDocType, string | null>;
type TemplateFlags = Record<TemplateDocType, boolean>;
type TemplateRefUrls = Record<TemplateRefDocType, string | null>;
type TemplateRefFlags = Record<TemplateRefDocType, boolean>;

function emptyPrompts(): Prompts {
  return { MIR: "", CAT: "", CCST: "" };
}

function emptyCellRefs(): CellRefs {
  return { DR: "" };
}

function emptyCellRefFlags(): CellRefFlags {
  return { DR: false };
}

function emptyScriptPrompts(): ScriptPrompts {
  return { MIR: "", CAT: "", CCST: "" };
}

function emptyScriptPromptFlags(): ScriptPromptFlags {
  return { MIR: false, CAT: false, CCST: false };
}

function emptyTemplateUrls(): TemplateUrls {
  return { MIR: null, CAT: null };
}

function emptyTemplateFlags(): TemplateFlags {
  return { MIR: false, CAT: false };
}

function emptyTemplateRefUrls(): TemplateRefUrls {
  return { MIR: null, CAT: null, CCST: null };
}

function emptyTemplateRefFlags(): TemplateRefFlags {
  return { MIR: false, CAT: false, CCST: false };
}

function prettify(json: string | null | undefined): string {
  if (!json) return "";
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function useDocumentSetting() {
  const isLoading = ref(false);
  const isSaving = ref<Record<DocConfigDocType, boolean>>({
    MIR: false,
    CAT: false,
    CCST: false,
  });
  const isSavingCellRef = ref<CellRefFlags>(emptyCellRefFlags());
  const isGeneratingCellRef = ref<CellRefFlags>(emptyCellRefFlags());
  const isSavingScriptPrompt = ref<ScriptPromptFlags>(emptyScriptPromptFlags());
  const isUploadingTemplate = ref<TemplateFlags>(emptyTemplateFlags());
  const isUploadingTemplateRef = ref<TemplateRefFlags>(emptyTemplateRefFlags());
  const exists = ref(false);
  const prompts = ref<Prompts>(emptyPrompts());
  const cellRefs = ref<CellRefs>(emptyCellRefs());
  const scriptPrompts = ref<ScriptPrompts>(emptyScriptPrompts());
  const templateUrls = ref<TemplateUrls>(emptyTemplateUrls());
  const templateRefUrls = ref<TemplateRefUrls>(emptyTemplateRefUrls());

  function applyResponse(res: DocConfigResponse) {
    prompts.value = {
      MIR: res.mirDocNoPrompt ?? "",
      CAT: res.catDocNoPrompt ?? "",
      CCST: res.ccstDocNoPrompt ?? "",
    };
    cellRefs.value = {
      DR: prettify(res.drExcelCellRef),
    };
    scriptPrompts.value = {
      MIR: res.mirScriptPrompt ?? "",
      CAT: res.catScriptPrompt ?? "",
      CCST: res.ccstScriptPrompt ?? "",
    };
    templateUrls.value = {
      MIR: res.mirTemplateUrl,
      CAT: res.catTemplateUrl,
    };
    templateRefUrls.value = {
      MIR: res.mirTemplateRefUrl,
      CAT: res.catTemplateRefUrl,
      CCST: res.ccstTemplateRefUrl,
    };
  }

  function resetState() {
    exists.value = false;
    prompts.value = emptyPrompts();
    cellRefs.value = emptyCellRefs();
    scriptPrompts.value = emptyScriptPrompts();
    templateUrls.value = emptyTemplateUrls();
    templateRefUrls.value = emptyTemplateRefUrls();
  }

  async function load(projectId: string) {
    isLoading.value = true;
    try {
      const res = await docConfigApi.getDocConfig(projectId);
      exists.value = true;
      applyResponse(res);
    } catch (error: unknown) {
      // 새 axios-client 는 error 를 Error 로 변환하므로 status 분기 불가 — 일단 빈 state 로
      resetState();
      console.error("문서 설정 로드 실패:", error);
    } finally {
      isLoading.value = false;
    }
  }

  async function ensureExists(projectId: string) {
    if (exists.value) return;
    const res = await docConfigApi.createDocConfig(projectId);
    exists.value = true;
    applyResponse(res);
  }

  async function save(projectId: string, docType: DocConfigDocType) {
    isSaving.value[docType] = true;
    try {
      await ensureExists(projectId);
      const res = await docConfigApi.updateDocNoPrompt(projectId, {
        docType,
        prompt: prompts.value[docType],
      });
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_prompt`,
        "success",
      );
      alert("저장되었습니다.");
    } catch (error: unknown) {
      console.error("문서번호 프롬프트 저장 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_prompt`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isSaving.value[docType] = false;
    }
  }

  async function saveCellRef(projectId: string, docType: ExcelCellRefDocType) {
    const raw = cellRefs.value[docType].trim();
    if (!raw) {
      alert("셀 좌표 JSON을 입력해주세요.");
      return;
    }
    let minified: string;
    try {
      minified = JSON.stringify(JSON.parse(raw));
    } catch {
      alert("유효하지 않은 JSON 형식입니다.");
      return;
    }
    isSavingCellRef.value[docType] = true;
    try {
      await ensureExists(projectId);
      const res = await docConfigApi.updateExcelCellRef(projectId, {
        docType,
        json: minified,
      });
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_cell_ref`,
        "success",
      );
      alert("셀 좌표가 저장되었습니다.");
    } catch (error: unknown) {
      console.error("셀 좌표 저장 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_cell_ref`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isSavingCellRef.value[docType] = false;
    }
  }

  async function generateCellRef(projectId: string, docType: ExcelCellRefDocType) {
    isGeneratingCellRef.value[docType] = true;
    try {
      const res = await docConfigApi.generateExcelCellRef(projectId, docType);
      cellRefs.value[docType] = prettify(res.json);
      analyticsClient.trackAction(
        "admin_document_setting",
        `generate_${docType.toLowerCase()}_cell_ref`,
        "success",
      );
      alert(
        res.converged
          ? `셀 좌표가 생성되었습니다. (iterations: ${res.iterations})`
          : `셀 좌표 생성이 수렴하지 않았습니다. 결과를 검토 후 수정·저장해주세요. (iterations: ${res.iterations})`,
      );
    } catch (error: unknown) {
      console.error("셀 좌표 생성 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `generate_${docType.toLowerCase()}_cell_ref`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isGeneratingCellRef.value[docType] = false;
    }
  }

  async function saveScriptPrompt(projectId: string, docType: ScriptPromptDocType) {
    isSavingScriptPrompt.value[docType] = true;
    try {
      await ensureExists(projectId);
      const trimmed = scriptPrompts.value[docType].trim();
      const res = await docConfigApi.updateScriptPrompt(projectId, {
        docType,
        prompt: trimmed.length > 0 ? trimmed : null,
      });
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_script_prompt`,
        "success",
      );
      alert("스크립트 프롬프트가 저장되었습니다.");
    } catch (error: unknown) {
      console.error("스크립트 프롬프트 저장 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_script_prompt`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isSavingScriptPrompt.value[docType] = false;
    }
  }

  async function uploadTemplate(projectId: string, docType: TemplateDocType, file: File) {
    isUploadingTemplate.value[docType] = true;
    try {
      await ensureExists(projectId);
      const res = await docConfigApi.uploadTemplate(projectId, docType, file);
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        `upload_${docType.toLowerCase()}_template`,
        "success",
      );
      alert("템플릿이 업로드되었습니다.");
    } catch (error: unknown) {
      console.error("템플릿 업로드 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `upload_${docType.toLowerCase()}_template`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isUploadingTemplate.value[docType] = false;
    }
  }

  async function uploadTemplateRef(
    projectId: string,
    docType: TemplateRefDocType,
    file: File,
  ) {
    isUploadingTemplateRef.value[docType] = true;
    try {
      await ensureExists(projectId);
      const res = await docConfigApi.uploadTemplateRef(projectId, docType, file);
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        `upload_${docType.toLowerCase()}_template_ref`,
        "success",
      );
      alert("참조용 템플릿이 업로드되었습니다.");
    } catch (error: unknown) {
      console.error("참조용 템플릿 업로드 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `upload_${docType.toLowerCase()}_template_ref`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isUploadingTemplateRef.value[docType] = false;
    }
  }

  return {
    isLoading,
    isSaving,
    isSavingCellRef,
    isGeneratingCellRef,
    isSavingScriptPrompt,
    isUploadingTemplate,
    isUploadingTemplateRef,
    exists,
    prompts,
    cellRefs,
    scriptPrompts,
    templateUrls,
    templateRefUrls,
    load,
    save,
    saveCellRef,
    generateCellRef,
    saveScriptPrompt,
    uploadTemplate,
    uploadTemplateRef,
  };
}

export type UseDocumentSettingReturn = ReturnType<typeof useDocumentSetting>;
