export interface DailyReportLaborTypeResponse {
  id: number;
  name: string;
  workTypeId: number | null;
  workTypeName: string | null;
  isVisible: boolean;
}

export interface DailyReportLaborTypeGroupItem {
  id: number;
  name: string;
  isVisible: boolean;
}

export interface DailyReportLaborTypeGroupedResponse {
  workTypeId: number | null;
  workTypeName: string | null;
  laborTypes: DailyReportLaborTypeGroupItem[];
}

export interface DailyReportLaborTypeCreateRequest {
  name: string;
  workTypeId: number;
  isVisible?: boolean;
}

export interface DailyReportLaborTypeUpdateRequest {
  id: number;
  name?: string;
  isVisible?: boolean;
  ids?: number[];
}

export interface DailyReportEquipmentSpecResponse {
  id: number;
  name: string;
  equipmentTypeId: number;
  equipmentTypeName: string;
  isVisible: boolean;
}

export interface DailyReportEquipmentTypeResponse {
  id: number;
  name: string;
  workTypeId?: number | null;
  workTypeName?: string | null;
}

export interface DailyReportEquipmentTypeUpdateRequest {
  id?: number;
  name?: string;
  ids?: number[];
}

export interface DailyReportEquipmentSpecCreateRequest {
  name: string;
  equipmentTypeId?: number;
  newEquipmentType?: {
    name: string;
    workTypeId: number;
  };
  isVisible?: boolean;
}

export interface DailyReportEquipmentSpecUpdateRequest {
  id?: number;
  name?: string;
  isVisible?: boolean;
  parentId?: number;
  ids?: number[];
}

export interface DailyReportAttendanceByDateResponse {
  laborTypeId: number;
  laborTypeName: string | null;
  workTypeId: number | null;
  workTypeName: string | null;
  endDateCount: number;
  accumulativeCount: number;
}

export interface DailyReportAttendanceByDateGroupItem {
  laborTypeId: number;
  laborTypeName: string | null;
  endDateCount: number;
  accumulativeCount: number;
}

export interface DailyReportAttendanceByDateGroupedResponse {
  workTypeId: number | null;
  workTypeName: string | null;
  laborTypes: DailyReportAttendanceByDateGroupItem[];
}

export interface DailyReportAttendanceUpdateRequest {
  date: string;
  entries: Array<{
    laborTypeId: number;
    count: number;
  }>;
}

export interface DailyReportEquipmentDeploymentByDateSpec {
  equipmentSpecId: number;
  equipmentSpecName: string | null;
  endDateCount: number;
  accumulativeCount: number;
}

export interface DailyReportEquipmentDeploymentByDateType {
  equipmentTypeId: number;
  equipmentTypeName: string | null;
  equipmentSpecs: DailyReportEquipmentDeploymentByDateSpec[];
}

export interface DailyReportEquipmentDeploymentByDateGroup {
  workTypeId: number;
  workTypeName: string | null;
  equipmentTypes: DailyReportEquipmentDeploymentByDateType[];
}

export interface DailyReportEquipmentDeploymentUpdateRequest {
  date: string;
  entries: Array<{
    equipmentSpecId: number;
    count: number;
    workTypeId: number;
  }>;
}

export interface DailyReportMaterialQuantityByDateResponse {
  materialTypeName: string | null;
  materialSpecName: string | null;
  totalQuantity: string | number | null;
  unit: string | null;
  workTypeName: string | null;
}

export interface DailyReportMaterialTypeResponse {
  id: number;
  name: string;
  unit: string | null;
  workTypeId: number | null;
  workTypeName: string | null;
}

export interface DailyReportMaterialTypeUpdateRequest {
  id?: number;
  name?: string;
  unit?: string;
  ids?: number[];
}

export interface DailyReportMaterialSpecResponse {
  id: number;
  name: string;
  materialTypeId: number;
  materialTypeName: string | null;
  isVisible: boolean;
}

export interface DailyReportMaterialSpecCreateRequest {
  name: string;
  materialTypeId?: number;
  newMaterialType?: {
    name: string;
    unit?: string;
    workTypeId: number;
  };
  isVisible?: boolean;
}

export interface DailyReportMaterialSpecUpdateRequest {
  id?: number;
  name?: string;
  isVisible?: boolean;
  parentId?: number;
  ids?: number[];
}

export interface DailyReportMaterialHierarchySpec {
  id: number;
  name: string;
  isVisible: boolean;
}

export interface DailyReportMaterialHierarchyType {
  id: number;
  name: string;
  unit: string | null;
  materialSpecs: DailyReportMaterialHierarchySpec[];
}

export interface DailyReportMaterialHierarchyGroup {
  workTypeId: number | null;
  workTypeName: string | null;
  materialTypes: DailyReportMaterialHierarchyType[];
}

export interface DailyReportEquipmentHierarchySpec {
  id: number;
  name: string;
  isVisible: boolean;
}

export interface DailyReportEquipmentHierarchyType {
  id: number;
  name: string;
  equipmentSpecs: DailyReportEquipmentHierarchySpec[];
}

export interface DailyReportEquipmentHierarchyGroup {
  workTypeId: number | null;
  workTypeName: string | null;
  equipmentTypes: DailyReportEquipmentHierarchyType[];
}

export interface DailyReportMaterialDeliveryByDateSpec {
  materialSpecId: number;
  materialSpecName: string | null;
  endDateQuantity: string | number | null;
  accumulativeQuantity: string | number | null;
}

export interface DailyReportMaterialDeliveryByDateType {
  materialTypeId: number;
  materialTypeName: string | null;
  unit: string | null;
  materialSpecs: DailyReportMaterialDeliveryByDateSpec[];
}

export interface DailyReportMaterialDeliveryByDateGroup {
  workTypeId: number | null;
  workTypeName: string | null;
  materialTypes: DailyReportMaterialDeliveryByDateType[];
}

export interface DailyReportMaterialDeliveryLineResponse {
  deliveryLineId: number;
  materialSpecId: number;
  materialSpecName: string | null;
  quantity: string | number | null;
}

export interface DailyReportMaterialDeliveryResponse {
  materialDeliveryId: number;
  date: string;
  workTypeId: number | null;
  materialTypeId: number;
  materialTypeName: string | null;
  unit: string | null;
  lines: DailyReportMaterialDeliveryLineResponse[];
}

export interface DailyReportMaterialDeliveryUpdateLineRequest {
  materialSpecId: number;
  quantity: string;
}

export interface DailyReportMaterialDeliveryUpdateRequestItem {
  materialDeliveryId: number | null;
  date: string;
  workTypeId: number;
  materialTypeId: number;
  lines: DailyReportMaterialDeliveryUpdateLineRequest[];
}

export type DailyReportMaterialDeliveryUpdateRequest =
  DailyReportMaterialDeliveryUpdateRequestItem[];

export interface DailyReportWeatherByDateResponse {
  weather: string | null;
  minTemperature: number | null;
  maxTemperature: number | null;
}
