export type DocumentDemoStatus = "available";
export type DocumentGenerationMode = "direct" | "upload_required";
export type DocumentCatalogType =
  | "daily_report_write"
  | "daily_report"
  | "material_registration"
  | "concrete_delivery_csi"
  | "concrete_strength_csi"
  | "inspection_request";

export interface DocumentDemoCard {
  type: DocumentCatalogType;
  label: string;
  chipLabel: string;
  iconSrc: string;
  description: string;
  uploadGuide: string;
  resultLabel: string;
  status: DocumentDemoStatus;
  accentLabel: string;
  generationMode: DocumentGenerationMode;
}

export interface UploadSampleFile {
  id: string;
  name: string;
  previewType: "image" | "file";
  thumbnail?: string;
}

export type UploadFeedbackStatus = "matched" | "missing";

export interface UploadFeedbackItem {
  id: string;
  label: string;
  status: UploadFeedbackStatus;
}

export interface UploadDocumentPreset {
  documentType: string;
  guideItems: string[];
  sampleFiles: UploadSampleFile[];
  feedbackItems: UploadFeedbackItem[];
}

export interface UploadPageCopy {
  title: string;
  guideTitle: string;
  filesTitle: string;
  actionLabel: string;
  loadSampleActionLabel: string;
  clearActionLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

export interface UploadFeedbackPageCopy {
  title: string;
  summaryLabel: string;
  primaryReadyActionLabel: string;
  primaryRetryActionLabel: string;
  secondaryActionLabel: string;
}

export interface ConversionDemoStep {
  id: "analyzing" | "mapping" | "rendering";
  label: string;
  detail: string;
}

export interface ResultSummaryItem {
  label: string;
  value: string;
}

export interface DemoResultState {
  documentType: string;
  title: string;
  statusLabel: string;
  summaryItems: ResultSummaryItem[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

export interface SelectionPageCopy {
  eyebrow: string;
  title: string;
  description: string;
  helper: string;
  actionLabel: string;
}

export interface FlowStageSummary {
  id: string;
  label: string;
  description: string;
}
