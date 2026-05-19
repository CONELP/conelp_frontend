export type MirPhotoType =
  | "DELIVERY_NOTE"
  | "MILL_SHEET"
  | "TAG"
  | "DELIVERY_PHOTO";

export interface MirAnalysisLine {
  lineKey: string;
  manufacturer: string | null;
  materialSpecId: number;
  materialSpecName: string;
  materialTypeId: number;
  materialTypeName: string;
  quantity: string | number | null;
}

export interface MirAnalysisPhoto {
  photoKey: string;
  mimeType: "image/jpeg" | string;
  data: string;
  type: MirPhotoType;
  description: string;
}

export interface MirAnalysisResponse {
  application: string | null;
  workTypeId: number | null;
  workTypeName: string | null;
  supplier: string | null;
  deliveryDate: string | null;
  lines: MirAnalysisLine[];
  photos: MirAnalysisPhoto[];
}

export interface AnalyzeMirPhotoRequest {
  application?: string;
  workTypeId?: number | null;
  images: File[];
}

export type CatPhotoType =
  | "OVERVIEW"
  | "TEST_BOARD"
  | "SLUMP"
  | "AIR"
  | "CHLORIDE"
  | "TEMPERATURE"
  | "WATER";

export interface CatAnalysisLineData {
  slump: string | number | null;
  air: string | number | null;
  temp: string | number | null;
  chloride: string | number | null;
  water: string | number | null;
}

export interface CatAnalysisPhoto {
  photoKey: string;
  mimeType: "image/jpeg" | string;
  data: string;
  type: CatPhotoType;
  description: string;
}

export interface CatAnalysisBatch {
  batch: string | number;
  lineData: CatAnalysisLineData;
  photos: CatAnalysisPhoto[];
}

export interface CatAnalysisResponse extends MirAnalysisResponse {
  batches: CatAnalysisBatch[];
}

export interface AnalyzeCatPhotoMetadata {
  batch: number;
  count: number;
}

export interface AnalyzeCatPhotoRequest {
  application?: string;
  workTypeId?: number | null;
  deliveryNote: File[];
  metadata: AnalyzeCatPhotoMetadata[];
  batchPhotos: File[];
}

export interface WorkTypeReferenceResponse {
  id: number;
  name: string;
  divisionId: number;
}

export interface UpdateMirLineRequest {
  lineKey: string | null;
  manufacturer: string;
  materialSpecId: number | null;
  newMaterialSpecName: string | null;
  materialTypeId: number | null;
  newMaterialTypeName: string | null;
  quantity: string;
}

export interface UpdateMirPhotoRequest {
  photoKey: string;
  mimeType: string;
  data: string;
  type: MirPhotoType;
  description: string;
}

export interface UpdateMirDataRequest {
  application: string | null;
  supplier: string | null;
  deliveryDate: string | null;
  workTypeId: number | null;
  newWorkTypeName: string | null;
  lines: UpdateMirLineRequest[];
  photos: UpdateMirPhotoRequest[];
}

export interface CreateMirDocumentLineRequest {
  manufacturer: string;
  materialSpecId: number;
  quantity: string;
}

export interface CreateMirDocumentPhotoRequest {
  photoKey: string;
  type: MirPhotoType;
  description: string;
}

export interface CreateMirDocumentRequest {
  application: string | null;
  supplier: string | null;
  deliveryDate: string | null;
  workTypeId: number | null;
  lines: CreateMirDocumentLineRequest[];
  photos: CreateMirDocumentPhotoRequest[];
  active: boolean | null;
}

export interface UpdateCatBatchRequest {
  batch: string;
  lineData: {
    slump: string | null;
    air: string | null;
    temp: string | null;
    chloride: string | null;
    water: string | null;
  };
  photos: Array<{
    photoKey: string;
    mimeType: string;
    data: string;
    type: CatPhotoType;
    description: string;
  }>;
}

export interface UpdateCatDataRequest extends UpdateMirDataRequest {
  batches: UpdateCatBatchRequest[];
}

export interface CreateCatDocumentBatchRequest {
  batch: string;
  lineData: {
    slump: string | null;
    air: string;
    temp: string;
    chloride: string;
    water: string;
  };
  photos: Array<{
    photoKey: string;
    type: CatPhotoType;
    description: string;
  }>;
}

export interface CreateCatDocumentRequest extends CreateMirDocumentRequest {
  batches: CreateCatDocumentBatchRequest[];
}

export interface CreateMirDocumentResponse {
  materialDeliveryId: number;
  jobId: number;
  projectId: string;
  docType: "MIR" | string;
  docNo: string;
  status: string;
  resultUrl: string | null;
  pdfUrl: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

export interface CreateCatDocumentResponse {
  materialDeliveryId: number;
  jobId: number;
  projectId?: string;
  docType: "CAT" | string;
  docNo: string;
  status: string;
  resultUrl: string | null;
  pdfUrl: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

export interface CatLinePhotoResponse {
  photoId: number;
  type: CatPhotoType | string;
  url: string;
  description: string;
}

export interface CatLineResponse {
  catLineId: number;
  materialDeliveryId: number;
  batch: number;
  slump: number | null;
  air: string | number | null;
  temp: string | number | null;
  chloride: string | number | null;
  water: string | number | null;
  photos: CatLinePhotoResponse[];
}

export interface DocumentJobResponse {
  id: number;
  projectId: string;
  docType: "DR" | "MIR" | "CAT" | "CCST" | "SCHEDULE_3WEEK" | "SCHEDULE_3MONTH" | string;
  docNo: string | null;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | string;
  resultUrl: string | null;
  pdfUrl: string | null;
  errCode: string | null;
  errDetail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
