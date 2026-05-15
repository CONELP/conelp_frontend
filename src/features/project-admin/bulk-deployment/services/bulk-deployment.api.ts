import { axiosClient } from "@/shared/network/axios-client";

export interface BulkAttendanceEntry {
  laborTypeId: number;
  totalCount: number;
}

export interface BulkEquipmentEntry {
  equipmentSpecId: number;
  workTypeId: number;
  totalCount: number;
}

export const bulkDeploymentApi = {
  async createBulkAttendance(payload: {
    startDate: string;
    endDate: string;
    entries: BulkAttendanceEntry[];
  }): Promise<void> {
    await axiosClient.post("/bulk/createBulkAttendance", payload);
  },

  async createBulkEquipment(payload: {
    startDate: string;
    endDate: string;
    entries: BulkEquipmentEntry[];
  }): Promise<void> {
    await axiosClient.post("/bulk/createBulkEquipment", payload);
  },
};
