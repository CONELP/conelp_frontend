import type {
  CatAnalysisResponse,
  CatPhotoType,
  MirAnalysisResponse,
  MirPhotoType,
} from "@/features/document-conversion/api/material-inspection-request-api.types";

const MIR_PHOTO_TYPE_LABEL: Record<MirPhotoType, string> = {
  DELIVERY_NOTE: "송장",
  MILL_SHEET: "밀시트",
  TAG: "태그",
  DELIVERY_PHOTO: "반입 사진",
};

const CAT_PHOTO_TYPE_LABEL: Record<CatPhotoType, string> = {
  OVERVIEW: "타설 개요 사진",
  TEST_BOARD: "시험판 사진",
  SLUMP: "슬럼프 사진",
  AIR: "공기량 사진",
  CHLORIDE: "염화물 사진",
  TEMPERATURE: "온도 사진",
  WATER: "단위수량 사진",
};

const MIR_ORDER: MirPhotoType[] = [
  "DELIVERY_NOTE",
  "MILL_SHEET",
  "TAG",
  "DELIVERY_PHOTO",
];

const CAT_ORDER: CatPhotoType[] = [
  "OVERVIEW",
  "TEST_BOARD",
  "SLUMP",
  "AIR",
  "CHLORIDE",
  "TEMPERATURE",
  "WATER",
];

function joinCounts(entries: Array<{ label: string; count: number }>) {
  return entries
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.label} ${entry.count}장`)
    .join(", ");
}

export function buildMirPhotoSummary(result: MirAnalysisResponse) {
  const counts = new Map<MirPhotoType, number>();

  result.photos.forEach((photo) => {
    const type = photo.type as MirPhotoType;

    counts.set(type, (counts.get(type) ?? 0) + 1);
  });

  const ordered = MIR_ORDER.map((type) => ({
    label: MIR_PHOTO_TYPE_LABEL[type],
    count: counts.get(type) ?? 0,
  }));

  return joinCounts(ordered) || `사진 ${result.photos.length}장`;
}

export function buildCatPhotoSummary(result: CatAnalysisResponse) {
  const counts = new Map<CatPhotoType, number>();

  result.photos.forEach((photo) => {
    const type = photo.type as CatPhotoType;

    counts.set(type, (counts.get(type) ?? 0) + 1);
  });

  result.batches.forEach((batch) => {
    batch.photos.forEach((photo) => {
      const type = photo.type as CatPhotoType;

      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
  });

  const ordered = CAT_ORDER.map((type) => ({
    label: CAT_PHOTO_TYPE_LABEL[type],
    count: counts.get(type) ?? 0,
  }));
  const totalPhotos =
    result.photos.length +
    result.batches.reduce((sum, batch) => sum + batch.photos.length, 0);

  return joinCounts(ordered) || `사진 ${totalPhotos}장`;
}

export function buildGenericPhotoSummary(fileCount: number) {
  return `사진 ${fileCount}장`;
}
