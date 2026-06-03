import { ref } from "vue";

import { dailyReportResourceApi } from "@/features/document-conversion/api/daily-report-resource.api";
import {
  docConfigApi,
  type DocConfigDocType,
  type DocConfigResponse,
  type ScriptPromptDocType,
  type TemplateDocType,
  type TemplateRefDocType,
} from "@/features/project-admin/_shared/services/doc-config.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

type Prompts = Record<DocConfigDocType, string>;
type ScriptPrompts = Record<ScriptPromptDocType, string>;
type ScriptPromptFlags = Record<ScriptPromptDocType, boolean>;
type TemplateUrls = Record<TemplateDocType, string | null>;
type TemplateFlags = Record<TemplateDocType, boolean>;
type TemplateRefUrls = Record<TemplateRefDocType, string | null>;
type TemplateRefFlags = Record<TemplateRefDocType, boolean>;

function emptyPrompts(): Prompts {
  return { MIR: "", CAT: "", CCST: "" };
}

function emptyScriptPrompts(): ScriptPrompts {
  return { MIR: "", CAT: "", CCST: "", MAT_INOUT: "", CONC_LOG: "" };
}

function emptyScriptPromptFlags(): ScriptPromptFlags {
  return { MIR: false, CAT: false, CCST: false, MAT_INOUT: false, CONC_LOG: false };
}

function emptyTemplateUrls(): TemplateUrls {
  return { MIR: null, CAT: null, DR: null, MAT_INOUT: null, CONC_LOG: null };
}

function emptyTemplateFlags(): TemplateFlags {
  return { MIR: false, CAT: false, DR: false, MAT_INOUT: false, CONC_LOG: false };
}

function emptyTemplateRefUrls(): TemplateRefUrls {
  return {
    MIR: null,
    CAT: null,
    CCST: null,
    DR: null,
    MAT_INOUT: null,
    CONC_LOG: null,
  };
}

function emptyTemplateRefFlags(): TemplateRefFlags {
  return {
    MIR: false,
    CAT: false,
    CCST: false,
    DR: false,
    MAT_INOUT: false,
    CONC_LOG: false,
  };
}

export function useDocumentSetting() {
  const isLoading = ref(false);
  const isSaving = ref<Record<DocConfigDocType, boolean>>({
    MIR: false,
    CAT: false,
    CCST: false,
  });
  const isSavingScriptPrompt = ref<ScriptPromptFlags>(emptyScriptPromptFlags());
  const isUploadingTemplate = ref<TemplateFlags>(emptyTemplateFlags());
  const isUploadingTemplateRef = ref<TemplateRefFlags>(emptyTemplateRefFlags());
  const exists = ref(false);
  const prompts = ref<Prompts>(emptyPrompts());
  const scriptPrompts = ref<ScriptPrompts>(emptyScriptPrompts());
  const templateUrls = ref<TemplateUrls>(emptyTemplateUrls());
  const templateRefUrls = ref<TemplateRefUrls>(emptyTemplateRefUrls());
  const drGuidePrompt = ref("");
  const isLoadingDrGuidePrompt = ref(false);
  const isSavingDrGuidePrompt = ref(false);

  function applyResponse(res: DocConfigResponse) {
    prompts.value = {
      MIR: res.mirDocNoPrompt ?? "",
      CAT: res.catDocNoPrompt ?? "",
      CCST: res.ccstDocNoPrompt ?? "",
    };
    scriptPrompts.value = {
      MIR: res.mirScriptPrompt ?? "",
      CAT: res.catScriptPrompt ?? "",
      CCST: res.ccstScriptPrompt ?? "",
      MAT_INOUT: res.matInoutScriptPrompt ?? "",
      CONC_LOG: res.concLogScriptPrompt ?? "",
    };
    templateUrls.value = {
      MIR: res.mirTemplateUrl,
      CAT: res.catTemplateUrl,
      DR: res.drTemplateUrl,
      MAT_INOUT: res.matInoutTemplateUrl,
      CONC_LOG: res.concLogTemplateUrl,
    };
    templateRefUrls.value = {
      MIR: res.mirTemplateRefUrl,
      CAT: res.catTemplateRefUrl,
      CCST: res.ccstTemplateRefUrl,
      DR: res.drTemplateRefUrl,
      MAT_INOUT: res.matInoutTemplateRefUrl,
      CONC_LOG: res.concLogTemplateRefUrl,
    };
  }

  function resetState() {
    exists.value = false;
    prompts.value = emptyPrompts();
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

    await loadDrGuidePrompt();
  }

  async function loadDrGuidePrompt() {
    isLoadingDrGuidePrompt.value = true;
    try {
      const res = await dailyReportResourceApi.getDrGuidePrompt();
      drGuidePrompt.value = res.prompt ?? "";
    } catch (error: unknown) {
      drGuidePrompt.value = "";
      console.error("DR 가이드 프롬프트 로드 실패:", error);
    } finally {
      isLoadingDrGuidePrompt.value = false;
    }
  }

  async function saveDrGuidePrompt(projectId: string) {
    isSavingDrGuidePrompt.value = true;
    try {
      await ensureExists(projectId);
      const trimmed = drGuidePrompt.value.trim();
      const res = await dailyReportResourceApi.updateDrGuidePrompt(
        trimmed.length > 0 ? trimmed : null,
      );
      drGuidePrompt.value = res.prompt ?? "";
      analyticsClient.trackAction(
        "admin_document_setting",
        "save_dr_guide_prompt",
        "success",
      );
      alert("DR 가이드 프롬프트가 저장되었습니다.");
    } catch (error: unknown) {
      console.error("DR 가이드 프롬프트 저장 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        "save_dr_guide_prompt",
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isSavingDrGuidePrompt.value = false;
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
    isSavingScriptPrompt,
    isUploadingTemplate,
    isUploadingTemplateRef,
    isLoadingDrGuidePrompt,
    isSavingDrGuidePrompt,
    exists,
    prompts,
    scriptPrompts,
    templateUrls,
    templateRefUrls,
    drGuidePrompt,
    load,
    save,
    saveScriptPrompt,
    uploadTemplate,
    uploadTemplateRef,
    loadDrGuidePrompt,
    saveDrGuidePrompt,
  };
}

export type UseDocumentSettingReturn = ReturnType<typeof useDocumentSetting>;
