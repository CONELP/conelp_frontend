export type DocumentDemoStatus = "available";

export interface DocumentDemoCard {
  type: string;
  label: string;
  chipLabel: string;
  iconSrc: string;
  description: string;
  uploadGuide: string;
  resultLabel: string;
  status: DocumentDemoStatus;
  accentLabel: string;
}

export interface UploadSampleFile {
  id: string;
  name: string;
  previewType: "image" | "file";
  thumbnail?: string;
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
