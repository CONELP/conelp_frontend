import { ref } from "vue";

import {
  docConfigApi,
  type DocConfigDocType,
  type DocConfigResponse,
  type DocGenPromptDocType,
  type PreprocessPromptDocType,
  type TemplateDocType,
  type TemplateRefDocType,
} from "@/features/project-admin/_shared/services/doc-config.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

type Prompts = Record<DocConfigDocType, string>;
type DocGenPrompts = Record<DocGenPromptDocType, string>;
type DocGenPromptFlags = Record<DocGenPromptDocType, boolean>;
type PreprocessPrompts = Record<PreprocessPromptDocType, string>;
type PreprocessPromptFlags = Record<PreprocessPromptDocType, boolean>;
type TemplateUrls = Record<TemplateDocType, string | null>;
type TemplateFlags = Record<TemplateDocType, boolean>;
type TemplateRefUrls = Record<TemplateRefDocType, string | null>;
type TemplateRefFlags = Record<TemplateRefDocType, boolean>;

function emptyPrompts(): Prompts {
  return { MIR: "", CAT: "", CCST: "" };
}

function emptyDocGenPrompts(): DocGenPrompts {
  return { DR: "", MIR: "", CAT: "", CCST: "", MAT_INOUT: "", CONC_LOG: "" };
}

function emptyDocGenPromptFlags(): DocGenPromptFlags {
  return {
    DR: false,
    MIR: false,
    CAT: false,
    CCST: false,
    MAT_INOUT: false,
    CONC_LOG: false,
  };
}

function emptyPreprocessPrompts(): PreprocessPrompts {
  return { DR: "", MAT_INOUT: "" };
}

function emptyPreprocessPromptFlags(): PreprocessPromptFlags {
  return { DR: false, MAT_INOUT: false };
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
  const isSavingDocGenPrompt = ref<DocGenPromptFlags>(emptyDocGenPromptFlags());
  const isSavingPreprocessPrompt = ref<PreprocessPromptFlags>(
    emptyPreprocessPromptFlags(),
  );
  const isSavingMirAnalyzePhotoPrompt = ref(false);
  const isUploadingTemplate = ref<TemplateFlags>(emptyTemplateFlags());
  const isUploadingTemplateRef = ref<TemplateRefFlags>(emptyTemplateRefFlags());
  const exists = ref(false);
  const prompts = ref<Prompts>(emptyPrompts());
  const docGenPrompts = ref<DocGenPrompts>(emptyDocGenPrompts());
  const preprocessPrompts = ref<PreprocessPrompts>(emptyPreprocessPrompts());
  const mirAnalyzePhotoPrompt = ref("");
  const templateUrls = ref<TemplateUrls>(emptyTemplateUrls());
  const templateRefUrls = ref<TemplateRefUrls>(emptyTemplateRefUrls());

  function applyResponse(res: DocConfigResponse) {
    prompts.value = {
      MIR: res.mirDocNoPrompt ?? "",
      CAT: res.catDocNoPrompt ?? "",
      CCST: res.ccstDocNoPrompt ?? "",
    };
    docGenPrompts.value = {
      DR: res.drDocGenPrompt ?? "",
      MIR: res.mirDocGenPrompt ?? "",
      CAT: res.catDocGenPrompt ?? "",
      CCST: res.ccstDocGenPrompt ?? "",
      MAT_INOUT: res.matInoutDocGenPrompt ?? "",
      CONC_LOG: res.concLogDocGenPrompt ?? "",
    };
    preprocessPrompts.value = {
      DR: res.drPreprocessPrompt ?? "",
      MAT_INOUT: res.matInoutPreprocessPrompt ?? "",
    };
    mirAnalyzePhotoPrompt.value = res.mirAnalyzePhotoPrompt ?? "";
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
    docGenPrompts.value = emptyDocGenPrompts();
    preprocessPrompts.value = emptyPreprocessPrompts();
    mirAnalyzePhotoPrompt.value = "";
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

  async function saveDocGenPrompt(projectId: string, docType: DocGenPromptDocType) {
    isSavingDocGenPrompt.value[docType] = true;
    try {
      await ensureExists(projectId);
      const trimmed = docGenPrompts.value[docType].trim();
      const res = await docConfigApi.updateDocGenPrompt(projectId, {
        docType,
        prompt: trimmed.length > 0 ? trimmed : null,
      });
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_doc_gen_prompt`,
        "success",
      );
      alert("문서생성 프롬프트가 저장되었습니다.");
    } catch (error: unknown) {
      console.error("문서생성 프롬프트 저장 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_doc_gen_prompt`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isSavingDocGenPrompt.value[docType] = false;
    }
  }

  async function savePreprocessPrompt(
    projectId: string,
    docType: PreprocessPromptDocType,
  ) {
    isSavingPreprocessPrompt.value[docType] = true;
    try {
      await ensureExists(projectId);
      const trimmed = preprocessPrompts.value[docType].trim();
      const res = await docConfigApi.updatePreprocessPrompt(projectId, {
        docType,
        prompt: trimmed.length > 0 ? trimmed : null,
      });
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_preprocess_prompt`,
        "success",
      );
      alert("preprocess 프롬프트가 저장되었습니다.");
    } catch (error: unknown) {
      console.error("preprocess 프롬프트 저장 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        `save_${docType.toLowerCase()}_preprocess_prompt`,
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isSavingPreprocessPrompt.value[docType] = false;
    }
  }

  async function saveMirAnalyzePhotoPrompt(projectId: string) {
    isSavingMirAnalyzePhotoPrompt.value = true;
    try {
      await ensureExists(projectId);
      const trimmed = mirAnalyzePhotoPrompt.value.trim();
      const res = await docConfigApi.updateMirAnalyzePhotoPrompt(projectId, {
        prompt: trimmed.length > 0 ? trimmed : null,
      });
      applyResponse(res);
      analyticsClient.trackAction(
        "admin_document_setting",
        "save_mir_analyze_photo_prompt",
        "success",
      );
      alert("MIR analyze 프롬프트가 저장되었습니다.");
    } catch (error: unknown) {
      console.error("MIR analyze 프롬프트 저장 실패:", error);
      analyticsClient.trackAction(
        "admin_document_setting",
        "save_mir_analyze_photo_prompt",
        "fail",
      );
      alert((error as Error).message);
    } finally {
      isSavingMirAnalyzePhotoPrompt.value = false;
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
    isSavingDocGenPrompt,
    isSavingPreprocessPrompt,
    isSavingMirAnalyzePhotoPrompt,
    isUploadingTemplate,
    isUploadingTemplateRef,
    exists,
    prompts,
    docGenPrompts,
    preprocessPrompts,
    mirAnalyzePhotoPrompt,
    templateUrls,
    templateRefUrls,
    load,
    save,
    saveDocGenPrompt,
    savePreprocessPrompt,
    saveMirAnalyzePhotoPrompt,
    uploadTemplate,
    uploadTemplateRef,
  };
}

export type UseDocumentSettingReturn = ReturnType<typeof useDocumentSetting>;
