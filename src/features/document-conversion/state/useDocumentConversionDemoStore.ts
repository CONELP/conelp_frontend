import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { nextRotationStep } from "@/shared/utils/rotate-image-file";

import type {
  CatAnalysisResponse,
  CreateCatDocumentRequest,
  CreateCatDocumentResponse,
  CreateMirDocumentRequest,
  CreateMirDocumentResponse,
  MirAnalysisResponse,
  UpdateCatDataRequest,
  UpdateMirDataRequest,
} from "@/features/document-conversion/api/material-inspection-request-api.types";
import { documentCatalog } from "@/features/document-conversion/data/document-conversion-demo.seed";
import type { DocumentCatalogType } from "@/features/document-conversion/model/document-conversion-demo.types";

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
  rotation: number;
}

interface MirDocumentSubmissionDraft {
  createRequest: CreateMirDocumentRequest | null;
  updateRequest: UpdateMirDataRequest | null;
}

interface CatDocumentSubmissionDraft {
  createRequest: CreateCatDocumentRequest | null;
  updateRequest: UpdateCatDataRequest | null;
}

interface ConcreteDeliveryUploadBatchDraft {
  id: string;
  fileIds: string[];
}

interface ConcreteStrengthUploadLotDraft {
  id: string;
  sevenDayFileIds: string[];
  twentyEightDayFileIds: string[];
}

export const useDocumentConversionDemoStore = defineStore(
  "document-conversion-demo",
  () => {
    const selectedDocumentType = ref<DocumentCatalogType | "">("");
    const uploadMode = ref<"uploaded" | "empty">("empty");
    const uploadedImageFiles = ref<UploadedImageFileEntry[]>([]);
    const mirUploadApplication = ref("");
    const mirUploadWorkTypeName = ref("");
    const mirUploadWorkTypeId = ref<number | null>(null);
    const selectedConcreteDeliveryCatDocId = ref<number | null>(null);
    const mirAnalysisResult = ref<MirAnalysisResponse | null>(null);
    const mirCreateResult = ref<CreateMirDocumentResponse | null>(null);
    const catAnalysisResult = ref<CatAnalysisResponse | null>(null);
    const catCreateResult = ref<CreateCatDocumentResponse | null>(null);
    const mirAnalysisErrorMessage = ref("");
    const mirDocumentSubmissionDraft =
      ref<MirDocumentSubmissionDraft | null>(null);
    const catDocumentSubmissionDraft =
      ref<CatDocumentSubmissionDraft | null>(null);
    const concreteDeliveryUploadBatches = ref<
      ConcreteDeliveryUploadBatchDraft[]
    >([]);
    const concreteStrengthUploadLots = ref<ConcreteStrengthUploadLotDraft[]>([]);

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

    function clearUploadGrouping() {
      concreteDeliveryUploadBatches.value = [];
      concreteStrengthUploadLots.value = [];
      selectedConcreteDeliveryCatDocId.value = null;
    }

    function selectDocument(type: DocumentCatalogType) {
      selectedDocumentType.value = type;
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
      clearUploadGrouping();
      clearMirResult();
    }

    function clearSelectedDocument() {
      selectedDocumentType.value = "";
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
      clearUploadGrouping();
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
      const addedEntries: UploadedImageFileEntry[] = [];

      nextFiles.forEach((file) => {
        const fileKey = createUploadFileKey(file);

        if (!existingKeys.has(fileKey)) {
          const entry: UploadedImageFileEntry = {
            id: createUploadFileId(file),
            file,
            fileKey,
            rotation: 0,
          };

          uploadedImageFiles.value.push(entry);
          addedEntries.push(entry);
          existingKeys.add(fileKey);
        }
      });

      uploadMode.value =
        uploadedImageFiles.value.length > 0 ? "uploaded" : "empty";
      clearMirResult();
      return addedEntries;
    }

    function removeUploadedImageFile(fileIdToRemove: string) {
      uploadedImageFiles.value = uploadedImageFiles.value.filter(
        (entry) => entry.id !== fileIdToRemove,
      );
      concreteDeliveryUploadBatches.value =
        concreteDeliveryUploadBatches.value.map((batch) => ({
          ...batch,
          fileIds: batch.fileIds.filter((fileId) => fileId !== fileIdToRemove),
        }));
      concreteStrengthUploadLots.value = concreteStrengthUploadLots.value.map(
        (lot) => ({
          ...lot,
          sevenDayFileIds: lot.sevenDayFileIds.filter(
            (fileId) => fileId !== fileIdToRemove,
          ),
          twentyEightDayFileIds: lot.twentyEightDayFileIds.filter(
            (fileId) => fileId !== fileIdToRemove,
          ),
        }),
      );

      uploadMode.value =
        uploadedImageFiles.value.length > 0 ? "uploaded" : "empty";
      clearMirResult();
    }

    function rotateUploadedImageFile(fileIdToRotate: string) {
      const entry = uploadedImageFiles.value.find(
        (item) => item.id === fileIdToRotate,
      );

      if (!entry) {
        return;
      }

      entry.rotation = nextRotationStep(entry.rotation);
      clearMirResult();
    }

    function reorderUploadedImageFiles(orderedFileIds: string[]) {
      const fileById = new Map(
        uploadedImageFiles.value.map((entry) => [entry.id, entry]),
      );
      const orderedEntries = orderedFileIds
        .map((fileId) => fileById.get(fileId))
        .filter((entry): entry is UploadedImageFileEntry => Boolean(entry));

      if (orderedEntries.length === 0) {
        return;
      }

      const orderedIdSet = new Set(orderedEntries.map((entry) => entry.id));
      const remainingEntries = uploadedImageFiles.value.filter(
        (entry) => !orderedIdSet.has(entry.id),
      );

      uploadedImageFiles.value = [...orderedEntries, ...remainingEntries];
      clearMirResult();
    }

    function setConcreteDeliveryUploadBatches(
      batches: ConcreteDeliveryUploadBatchDraft[],
    ) {
      concreteDeliveryUploadBatches.value = batches.map((batch) => ({
        id: batch.id,
        fileIds: [...batch.fileIds],
      }));
    }

    function setConcreteStrengthUploadLots(
      lots: ConcreteStrengthUploadLotDraft[],
    ) {
      concreteStrengthUploadLots.value = lots.map((lot) => ({
        id: lot.id,
        sevenDayFileIds: [...lot.sevenDayFileIds],
        twentyEightDayFileIds: [...lot.twentyEightDayFileIds],
      }));
    }

    function setSelectedConcreteDeliveryCatDocId(catDocId: number | null) {
      selectedConcreteDeliveryCatDocId.value =
        typeof catDocId === "number" && Number.isFinite(catDocId)
          ? catDocId
          : null;
    }

    function clearUpload() {
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
      clearUploadGrouping();
      clearMirResult();
    }

    function resetUploadAfterFailure(errorMessage: string) {
      clearUpload();
      mirAnalysisErrorMessage.value = errorMessage;
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
      selectedConcreteDeliveryCatDocId,
      mirAnalysisResult,
      mirCreateResult,
      catAnalysisResult,
      catCreateResult,
      mirAnalysisErrorMessage,
      mirDocumentSubmissionDraft,
      catDocumentSubmissionDraft,
      concreteDeliveryUploadBatches,
      concreteStrengthUploadLots,
      selectDocument,
      clearSelectedDocument,
      addUploadedImageFiles,
      removeUploadedImageFile,
      rotateUploadedImageFile,
      reorderUploadedImageFiles,
      setConcreteDeliveryUploadBatches,
      setConcreteStrengthUploadLots,
      setSelectedConcreteDeliveryCatDocId,
      clearUpload,
      resetUploadAfterFailure,
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
