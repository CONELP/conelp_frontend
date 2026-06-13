// SUPER 계정 문서 관리 — 전 프로젝트 문서 목록/번호/상태/재등록/원본조회 (/api/super/document)

export type SuperDocType =
  | "DR"
  | "MIR"
  | "CAT"
  | "CCST"
  | "MAT_INOUT"
  | "CONC_LOG"
  | "SCHEDULE_3WEEK"
  | "SCHEDULE_3MONTH";

export type SuperDocStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "APPROVED";

// getDocumentJobList / updateDocNo / updateStatus / reuploadDocument 의 공통 응답 형태
export interface SuperDocumentJob {
  jobId: number;
  projectId: string;
  projectName: string;
  docType: SuperDocType;
  docNo: string | null;
  status: SuperDocStatus;
  resultUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface SuperDocumentJobListParams {
  projectId?: string;
  docType?: SuperDocType;
  status?: SuperDocStatus;
}

// getDocumentSource — gs:// URL 은 downloadPhoto 프록시로만 표시
export interface SuperDocumentSourcePhoto {
  type: string | null;
  description: string | null;
  url: string;
}

// header/lines 의 키는 docType(MIR/CAT/CCST)별로 달라 느슨하게 둔다.
export type SuperDocumentSourceHeader = Record<string, unknown>;

export interface SuperDocumentSourceLine {
  photos?: SuperDocumentSourcePhoto[];
  [key: string]: unknown;
}

export interface SuperDocumentSource {
  jobId: number;
  docType: SuperDocType;
  materialDeliveryId: number | null;
  header: SuperDocumentSourceHeader | null;
  lines: SuperDocumentSourceLine[];
  photos: SuperDocumentSourcePhoto[];
}

// 원본 사진/추출정보를 지원하는 문서 종류
export const SOURCE_SUPPORTED_DOC_TYPES: SuperDocType[] = ["MIR", "CAT", "CCST"];

export const SUPER_DOC_TYPE_LABELS: Record<SuperDocType, string> = {
  DR: "작업일보",
  MIR: "자재 검수요청",
  CAT: "콘크리트 타설검사",
  CCST: "콘크리트 강도시험",
  MAT_INOUT: "자재 반출입",
  CONC_LOG: "콘크리트 타설일지",
  SCHEDULE_3WEEK: "3주 공정표",
  SCHEDULE_3MONTH: "3개월 공정표",
};

export const SUPER_DOC_STATUS_LABELS: Record<SuperDocStatus, string> = {
  PENDING: "대기",
  RUNNING: "처리중",
  SUCCEEDED: "완료",
  FAILED: "실패",
  APPROVED: "승인",
};

// 원본 viewer 의 필드 라벨 (없으면 raw key 노출)
export const SOURCE_FIELD_LABELS: Record<string, string> = {
  // MIR header
  supplier: "공급업체",
  deliveryDate: "납품일",
  application: "용도",
  totalQuantity: "총수량",
  // MIR line
  manufacturer: "제조사",
  materialSpec: "규격",
  specConnId: "규격 ID",
  quantity: "수량",
  // CAT line
  batch: "배치",
  slump: "슬럼프",
  air: "공기량",
  temp: "온도",
  chloride: "염화물",
  water: "가수",
  // CCST line
  lot: "로트",
  setNo: "공시체 번호",
  ageDays: "재령(일)",
  comp1: "압축강도 1",
  comp2: "압축강도 2",
  comp3: "압축강도 3",
  testDate: "시험일",
};
