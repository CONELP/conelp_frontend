import { axiosClient } from "@/shared/network/axios-client";
import type { ProjectMember } from "@/features/ai-agent/model/ai-agent.types";

export const userProjectApi = {
  async listMembers(): Promise<ProjectMember[]> {
    const { data } = await axiosClient.get<ProjectMember[]>(
      "/userProject/getUserToProjectList",
    );
    return data;
  },
};
