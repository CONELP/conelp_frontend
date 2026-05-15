import { axiosClient } from "@/shared/network/axios-client";

export interface UpdateWorkDateRequest {
  dates: string[];
  isHoliday?: boolean;
  isActivated?: boolean;
  deactivatedReason?: string;
}

export const projectCalendarApi = {
  async updateWorkDate(body: UpdateWorkDateRequest): Promise<void> {
    await axiosClient.put("/project/updateWorkDate", body);
  },
};
