export type ReferenceEditType =
  | "equipment"
  | "labor"
  | "material"
  | "work-classification"
  | "component"
  | "zone"
  | "floor"
  | "location";

export const REFERENCE_EDIT_TITLES: Record<ReferenceEditType, string> = {
  equipment: "장비 관리",
  labor: "직종 관리",
  material: "자재 관리",
  "work-classification": "공종분류 관리",
  component: "부재코드 관리",
  zone: "공구 관리",
  floor: "층 관리",
  location: "위치 관리",
};

export const REFERENCE_EDIT_DIALOG_WIDTH: Record<ReferenceEditType, "sm" | "md" | "lg" | "xl"> = {
  equipment: "lg",
  labor: "xl",
  material: "lg",
  "work-classification": "xl",
  component: "lg",
  zone: "sm",
  floor: "sm",
  location: "md",
};
