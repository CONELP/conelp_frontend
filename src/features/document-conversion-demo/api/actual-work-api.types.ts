export interface ActualWorkPhotoResponse {
  photoId: number;
  url: string;
  thumbnailUrl: string;
  description: string | null;
}

export interface ActualWorkResponse {
  id: number;
  date: string;
  actualWorkName: string;
  workTypeId: number;
  workTypeName: string;
  workId: number | null;
  workName: string | null;
  photos: ActualWorkPhotoResponse[];
}

export interface ActualWorkCreateRequest {
  date: string;
  workTypeId: number;
  workName: string;
}

export interface ActualWorkUpdateRequest {
  date?: string;
  workTypeId?: number;
  workName?: string;
}
