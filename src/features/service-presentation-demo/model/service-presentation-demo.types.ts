export type ServicePresentationSiteId = "sunhyewon" | "cheongun_church";

export type ServicePresentationDocumentStatus =
  | "demo_ready"
  | "available"
  | "needs_review";

export interface ServicePresentationDocumentManifest {
  documentType: string;
  label: string;
  sourceFolder: string;
  inputFiles: string[];
  outputExcel: string | null;
  status: ServicePresentationDocumentStatus;
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
