import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";

export type ServicePresentationSiteId = "sunhyewon" | "cheongun_church";

export type ServicePresentationDocumentStatus =
  | "demo_ready"
  | "available"
  | "needs_review";

export interface ServicePresentationDocumentManifest {
  documentType: DocumentCatalogType;
  label: string;
  sourceFolder: string;
  inputFiles: string[];
  inputRefs: ServicePresentationDocumentInputRef[];
  outputExcel: string | null;
  registrationSteps: ServicePresentationDocumentStep[];
  generationSteps: string[];
  status: ServicePresentationDocumentStatus;
}

export type ServicePresentationDocumentInputKind =
  | "excel"
  | "pdf"
  | "image"
  | "folder"
  | "external";

export interface ServicePresentationDocumentInputRef {
  id: string;
  label: string;
  fileName: string;
  kind: ServicePresentationDocumentInputKind;
  required: boolean;
}

export interface ServicePresentationDocumentStep {
  id: string;
  label: string;
  description: string;
}

export interface ServicePresentationGeneratedResult {
  id: string;
  siteId: ServicePresentationSiteId;
  type: "document" | "schedule";
  documentType?: DocumentCatalogType;
  title: string;
  sourceRefs: string[];
  outputRef: string | null;
  createdAt: string;
  status: "generated" | "draft" | "promoted";
}

export interface ServicePresentationSiteManifest {
  siteId: ServicePresentationSiteId;
  siteName: string;
  siteChipLabel: string;
  description: string;
  dataRoot: string;
  scheduleSeedId: string;
  documents: ServicePresentationDocumentManifest[];
}

export interface ServicePresentationSiteCard {
  siteId: ServicePresentationSiteId;
  siteName: string;
  siteChipLabel: string;
  description: string;
  dataRoot: string;
  scheduleSeedId: string;
  documentCountLabel: string;
  readyDocumentCountLabel: string;
  isSelected: boolean;
}
