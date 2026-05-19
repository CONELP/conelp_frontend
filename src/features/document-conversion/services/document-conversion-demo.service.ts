import type {
  DocumentDemoCard,
  FlowStageSummary,
  SelectionPageCopy,
} from "@/features/document-conversion/model/document-conversion-demo.types";

export interface SelectionCardViewData extends DocumentDemoCard {
  isSelected: boolean;
  isAvailable: boolean;
  selectLabel: string;
}

export function createSelectionCards(
  documents: DocumentDemoCard[],
  selectedType: string,
): SelectionCardViewData[] {
  return documents.map((document) => ({
    ...document,
    isSelected: document.type === selectedType,
    isAvailable: document.status === "available",
    selectLabel:
      document.status !== "available"
        ? `${document.label} 준비 중`
        : document.type === selectedType
          ? "선택됨"
          : "이 문서 선택",
  }));
}

export function createSelectionSummary(
  selectedDocument: DocumentDemoCard | undefined,
): { title: string; helper: string } {
  if (!selectedDocument) {
    return {
      title: "문서를 먼저 선택해 주세요",
      helper: "선택 후 업로드 화면으로 이어집니다.",
    };
  }

  return {
    title: selectedDocument.label,
    helper: selectedDocument.uploadGuide,
  };
}

export function createFlowStageLabels(
  stages: FlowStageSummary[],
): FlowStageSummary[] {
  return stages;
}

export function createSelectionPageContent(
  copy: SelectionPageCopy,
): SelectionPageCopy {
  return copy;
}
