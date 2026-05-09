import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type {
  CatAnalysisResponse,
  CreateCatDocumentRequest,
  CreateCatDocumentResponse,
  CreateMirDocumentRequest,
  CreateMirDocumentResponse,
  MirAnalysisResponse,
  UpdateCatDataRequest,
  UpdateMirDataRequest,
} from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";

const MIR_IMAGE_UPLOAD_LIMIT = 10;

function createUploadFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function createUploadFileId(file: File) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${createUploadFileKey(file)}:${Date.now()}`;
}

interface UploadedImageFileEntry {
  id: string;
  file: File;
  fileKey: string;
}

interface MirDocumentSubmissionDraft {
  createRequest: CreateMirDocumentRequest | null;
  updateRequest: UpdateMirDataRequest | null;
  active: boolean;
}

interface CatDocumentSubmissionDraft {
  createRequest: CreateCatDocumentRequest | null;
  updateRequest: UpdateCatDataRequest | null;
  active: boolean;
}

export const useDocumentConversionDemoStore = defineStore(
  "document-conversion-demo",
  () => {
    const selectedDocumentType = ref("");
    const uploadMode = ref<"uploaded" | "empty">("empty");
    const uploadedImageFiles = ref<UploadedImageFileEntry[]>([]);
    const mirUploadApplication = ref("");
    const mirUploadWorkTypeName = ref("");
    const mirUploadWorkTypeId = ref<number | null>(null);
    const mirAnalysisResult = ref<MirAnalysisResponse | null>(null);
    const mirCreateResult = ref<CreateMirDocumentResponse | null>(null);
    const catAnalysisResult = ref<CatAnalysisResponse | null>(null);
    const catCreateResult = ref<CreateCatDocumentResponse | null>(null);
    const mirAnalysisErrorMessage = ref("");
    const mirDocumentSubmissionDraft =
      ref<MirDocumentSubmissionDraft | null>(null);
    const catDocumentSubmissionDraft =
      ref<CatDocumentSubmissionDraft | null>(null);

    const selectedDocument = computed(() =>
      documentCatalog.find((document) => document.type === selectedDocumentType.value),
    );

    function clearMirResult() {
      mirAnalysisResult.value = null;
      mirCreateResult.value = null;
      catAnalysisResult.value = null;
      catCreateResult.value = null;
      mirAnalysisErrorMessage.value = "";
      mirDocumentSubmissionDraft.value = null;
      catDocumentSubmissionDraft.value = null;
    }

    function selectDocument(type: string) {
      selectedDocumentType.value = type;
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
      clearMirResult();
    }

    function clearSelectedDocument() {
      selectedDocumentType.value = "";
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
      mirUploadApplication.value = "";
      mirUploadWorkTypeName.value = "";
      mirUploadWorkTypeId.value = null;
      clearMirResult();
    }

    function addUploadedImageFiles(files: File[]) {
      const nextFiles = files.filter((file) => file.type.startsWith("image/"));
      const existingKeys = new Set(
        uploadedImageFiles.value.map((entry) => entry.fileKey),
      );
      const remainingSlots = Math.max(
        MIR_IMAGE_UPLOAD_LIMIT - uploadedImageFiles.value.length,
        0,
      );

      nextFiles.slice(0, remainingSlots).forEach((file) => {
        const fileKey = createUploadFileKey(file);

        if (!existingKeys.has(fileKey)) {
          uploadedImageFiles.value.push({
            id: createUploadFileId(file),
            file,
            fileKey,
          });
          existingKeys.add(fileKey);
        }
      });

      uploadMode.value =
        uploadedImageFiles.value.length > 0 ? "uploaded" : "empty";
      clearMirResult();
    }

    function removeUploadedImageFile(fileIdToRemove: string) {
      uploadedImageFiles.value = uploadedImageFiles.value.filter(
        (entry) => entry.id !== fileIdToRemove,
      );

      uploadMode.value =
        uploadedImageFiles.value.length > 0 ? "uploaded" : "empty";
      clearMirResult();
    }

    function clearUpload() {
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
      clearMirResult();
    }

    function setMirUploadApplication(value: string) {
      mirUploadApplication.value = value;
      clearMirResult();
    }

    function setMirUploadWorkTypeName(value: string) {
      mirUploadWorkTypeName.value = value;
      mirUploadWorkTypeId.value = null;
      clearMirResult();
    }

    function selectMirUploadWorkType(workType: { id: number; name: string }) {
      mirUploadWorkTypeName.value = workType.name;
      mirUploadWorkTypeId.value = workType.id;
      clearMirResult();
    }

    function saveMirAnalysisResult(result: MirAnalysisResponse) {
      mirAnalysisResult.value = result;
      mirCreateResult.value = null;
      mirAnalysisErrorMessage.value = "";
      mirUploadApplication.value = result.application ?? mirUploadApplication.value;
      mirUploadWorkTypeName.value = result.workTypeName ?? mirUploadWorkTypeName.value;
      mirUploadWorkTypeId.value = result.workTypeId ?? mirUploadWorkTypeId.value;
    }

    function saveMirCreateResult(result: CreateMirDocumentResponse) {
      mirCreateResult.value = result;
      mirDocumentSubmissionDraft.value = null;
    }

    function saveCatAnalysisResult(result: CatAnalysisResponse) {
      catAnalysisResult.value = result;
      catCreateResult.value = null;
      mirAnalysisErrorMessage.value = "";
      mirUploadApplication.value = result.application ?? mirUploadApplication.value;
      mirUploadWorkTypeName.value = result.workTypeName ?? mirUploadWorkTypeName.value;
      mirUploadWorkTypeId.value = result.workTypeId ?? mirUploadWorkTypeId.value;
    }

    function saveCatCreateResult(result: CreateCatDocumentResponse) {
      catCreateResult.value = result;
      catDocumentSubmissionDraft.value = null;
    }

    function setMirAnalysisErrorMessage(message: string) {
      mirAnalysisErrorMessage.value = message;
    }

    function saveMirDocumentSubmissionDraft(draft: MirDocumentSubmissionDraft) {
      mirDocumentSubmissionDraft.value = draft;
    }

    function clearMirDocumentSubmissionDraft() {
      mirDocumentSubmissionDraft.value = null;
    }

    function saveCatDocumentSubmissionDraft(draft: CatDocumentSubmissionDraft) {
      catDocumentSubmissionDraft.value = draft;
    }

    function clearCatDocumentSubmissionDraft() {
      catDocumentSubmissionDraft.value = null;
    }

    return {
      selectedDocumentType,
      selectedDocument,
      uploadMode,
      uploadedImageFiles,
      mirUploadApplication,
      mirUploadWorkTypeName,
      mirUploadWorkTypeId,
      mirAnalysisResult,
      mirCreateResult,
      catAnalysisResult,
      catCreateResult,
      mirAnalysisErrorMessage,
      mirDocumentSubmissionDraft,
      catDocumentSubmissionDraft,
      selectDocument,
      clearSelectedDocument,
      addUploadedImageFiles,
      removeUploadedImageFile,
      clearUpload,
      setMirUploadApplication,
      setMirUploadWorkTypeName,
      selectMirUploadWorkType,
      saveMirAnalysisResult,
      saveMirCreateResult,
      saveCatAnalysisResult,
      saveCatCreateResult,
      setMirAnalysisErrorMessage,
      saveMirDocumentSubmissionDraft,
      clearMirDocumentSubmissionDraft,
      saveCatDocumentSubmissionDraft,
      clearCatDocumentSubmissionDraft,
    };
  },
);
