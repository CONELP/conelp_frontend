import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";

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

interface MaterialRegistrationReview {
  trade: string;
  workType: string;
  supplier: string;
  deliveryDate: string;
  location: string;
}

interface MaterialRegistrationRow {
  id: string;
  manufacturer: string;
  spec: string;
  quantity: string;
}

interface MaterialRegistrationResult {
  review: MaterialRegistrationReview;
  rows: MaterialRegistrationRow[];
}

export const useDocumentConversionDemoStore = defineStore(
  "document-conversion-demo",
  () => {
    const selectedDocumentType = ref("");
    const uploadMode = ref<"uploaded" | "empty">("empty");
    const uploadedImageFiles = ref<UploadedImageFileEntry[]>([]);
    const materialRegistrationResult =
      ref<MaterialRegistrationResult | null>(null);

    const selectedDocument = computed(() =>
      documentCatalog.find((document) => document.type === selectedDocumentType.value),
    );

    function selectDocument(type: string) {
      selectedDocumentType.value = type;
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
    }

    function clearSelectedDocument() {
      selectedDocumentType.value = "";
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
    }

    function addUploadedImageFiles(files: File[]) {
      const nextFiles = files.filter((file) => file.type.startsWith("image/"));
      const existingKeys = new Set(
        uploadedImageFiles.value.map((entry) => entry.fileKey),
      );

      nextFiles.forEach((file) => {
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
    }

    function removeUploadedImageFile(fileIdToRemove: string) {
      uploadedImageFiles.value = uploadedImageFiles.value.filter(
        (entry) => entry.id !== fileIdToRemove,
      );

      uploadMode.value =
        uploadedImageFiles.value.length > 0 ? "uploaded" : "empty";
    }

    function clearUpload() {
      uploadMode.value = "empty";
      uploadedImageFiles.value = [];
    }

    function saveMaterialRegistrationResult(result: MaterialRegistrationResult) {
      materialRegistrationResult.value = result;
    }

    return {
      selectedDocumentType,
      selectedDocument,
      uploadMode,
      uploadedImageFiles,
      materialRegistrationResult,
      selectDocument,
      clearSelectedDocument,
      addUploadedImageFiles,
      removeUploadedImageFile,
      clearUpload,
      saveMaterialRegistrationResult,
    };
  },
);
