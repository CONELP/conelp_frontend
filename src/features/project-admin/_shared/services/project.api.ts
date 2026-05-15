import { axiosClient } from "@/shared/network/axios-client";

import type { Project } from "@/features/project-admin/_shared/model/project.types";

export const projectApi = {
  async getProjects(): Promise<Project[]> {
    const { data } = await axiosClient.get<Project[]>("/project/getProjectList");
    return data;
  },
};
