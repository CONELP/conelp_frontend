export interface DailyReportLaborTypeResponse {
  id: number;
  name: string;
  workTypeId: number;
  workTypeName: string;
}

export interface DailyReportEquipmentSpecResponse {
  id: number;
  name: string;
  equipmentTypeId: number;
  equipmentTypeName: string;
}

export interface DailyReportAttendanceByDateResponse {
  laborTypeId: number;
  laborTypeName: string | null;
  workTypeId: number | null;
  workTypeName: string | null;
  companyId: string | null;
  companyName: string | null;
  companyDisplayName: string | null;
  count: number;
}

export interface DailyReportAttendanceUpdateRequest {
  date: string;
  entries: Array<{
    laborTypeId: number;
    count: number;
  }>;
}

export interface DailyReportEquipmentDeploymentResponse {
  equipmentSpecId: number | null;
  equipmentSpecName: string | null;
  equipmentTypeId: number | null;
  equipmentTypeName: string | null;
  count: number;
  workTypeId: number | null;
  workTypeName: string | null;
  companyId: string | null;
  companyName: string | null;
  companyDisplayName: string | null;
}

export interface DailyReportEquipmentDeploymentRequest {
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
}

export interface DailyReportMaterialSpecResponse {
  id: number;
  name: string;
  materialTypeId: number;
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
