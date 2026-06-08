export interface MediaAsset {
  /** 절대 URL (conelp-public 버킷, percent-encoded) */
  src: string;
  alt: string;
}

export interface VideoAsset {
  /** mp4 절대 URL */
  src: string;
  /** 로딩/실패 시 보여줄 포스터 이미지 URL */
  poster: string;
  /** 접근성 라벨 */
  label: string;
}

export interface PainPoint {
  title: string;
  description: string;
}

export interface StepItem {
  image: MediaAsset;
  caption: string;
}

export interface FeatureCard {
  title: string;
  lines: string[];
}

export interface CatalogColumn {
  heading: string;
  /** 강조(현재 지원) 항목은 highlighted=true */
  items: Array<{ label: string; highlighted?: boolean }>;
}
