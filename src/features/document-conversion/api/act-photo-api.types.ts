export interface ActPhotoResponse {
  id: number;
  date: string;
  url: string;
  thumbnail: string | null;
  description: string | null;
}

export interface ActPhotoCreateRequest {
  date: string;
  photos: File[];
  descriptions?: (string | null)[];
}

export interface ActPhotoUpdateRequest {
  description: string | null;
}
