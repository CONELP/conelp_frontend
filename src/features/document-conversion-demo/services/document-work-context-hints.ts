import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";

export interface DocumentWorkContextHint {
  workTypeName: string;
  application: string;
}

const defaultDocumentWorkContextHint: DocumentWorkContextHint = {
  workTypeName: "철근콘크리트공사",
  application: "지하1층 슬라브 및 보",
};

const documentWorkContextHints: Partial<
  Record<DocumentCatalogType, DocumentWorkContextHint>
> = {
  material_registration: {
    workTypeName: "철근콘크리트공사",
    application: "현장 내",
  },
  concrete_delivery_csi: {
    workTypeName: "철근콘크리트공사",
    application: "지하1층 슬라브 및 보",
  },
  concrete_strength_csi: {
    workTypeName: "철근콘크리트공사",
    application: "지하1층 슬라브 및 보",
  },
};

export function resolveDocumentWorkContextHint(
  _siteId: string | null | undefined,
  documentType: DocumentCatalogType | null | undefined,
): DocumentWorkContextHint {
  if (!documentType) {
    return defaultDocumentWorkContextHint;
  }

  return documentWorkContextHints[documentType] ?? defaultDocumentWorkContextHint;
}
