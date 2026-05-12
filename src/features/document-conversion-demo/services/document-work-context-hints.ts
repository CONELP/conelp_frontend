import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import type { ServicePresentationSiteId } from "@/features/service-presentation-demo/model/service-presentation-demo.types";

export interface DocumentWorkContextHint {
  workTypeName: string;
  application: string;
}

const defaultDocumentWorkContextHint: DocumentWorkContextHint = {
  workTypeName: "철근콘크리트공사",
  application: "지하1층 슬라브 및 보",
};

const documentWorkContextHints: Record<
  ServicePresentationSiteId,
  Partial<Record<DocumentCatalogType, DocumentWorkContextHint>>
> = {
  sunhyewon: {
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
  },
  cheongun_church: {
    material_registration: {
      workTypeName: "철근콘크리트 기타",
      application: "지상3층 바닥",
    },
    concrete_delivery_csi: {
      workTypeName: "철근콘크리트",
      application: "지상2층 벽체",
    },
    concrete_strength_csi: {
      workTypeName: "철근콘크리트",
      application: "지하1층 바닥보 및 주차램프",
    },
  },
};

export function resolveDocumentWorkContextHint(
  siteId: ServicePresentationSiteId | null | undefined,
  documentType: DocumentCatalogType | null | undefined,
): DocumentWorkContextHint {
  if (!siteId || !documentType) {
    return defaultDocumentWorkContextHint;
  }

  return (
    documentWorkContextHints[siteId]?.[documentType] ??
    defaultDocumentWorkContextHint
  );
}
