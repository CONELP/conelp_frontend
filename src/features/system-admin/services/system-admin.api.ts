import { axiosClient } from "@/shared/network/axios-client";

import type {
  ApiKeyMasked,
  Company,
  CompanyRole,
  CompanyToProject,
  CreateApiKeyPayload,
  CreateApiKeyResponse,
  CreateCompanyPayload,
  CreateCompanyToProjectPayload,
  CreateProjectPayload,
  CreateUserToProjectPayload,
  Project,
  RecalculateEmbeddingsResponse,
  SystemRole,
  UpdateCompanyPayload,
  UpdateCompanyToProjectPayload,
  UpdateProjectPayload,
  UpdateUserPayload,
  UpdateUserToProjectPayload,
  User,
  UserToProject,
  WorkType,
} from "@/features/system-admin/model/system-admin.types";

export const systemAdminApi = {
  // Company
  async getCompanyList(): Promise<Company[]> {
    const { data } = await axiosClient.get<Company[]>("/super/getCompanyList");
    return data;
  },
  async createCompany(payload: CreateCompanyPayload): Promise<Company> {
    const { data } = await axiosClient.post<Company>("/super/createCompany", payload);
    return data;
  },
  async updateCompany(id: string, payload: UpdateCompanyPayload): Promise<Company> {
    const { data } = await axiosClient.put<Company>(`/super/updateCompany/${id}`, payload);
    return data;
  },
  async deleteCompany(id: string): Promise<void> {
    await axiosClient.delete(`/super/deleteCompany/${id}`);
  },

  // Project
  async getProjectList(): Promise<Project[]> {
    const { data } = await axiosClient.get<Project[]>("/super/getProjectList");
    return data;
  },
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    const { data } = await axiosClient.post<Project>("/super/createProject", payload);
    return data;
  },
  async updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
    const { data } = await axiosClient.put<Project>(`/super/updateProject/${id}`, payload);
    return data;
  },
  async deleteProject(id: string): Promise<void> {
    await axiosClient.delete(`/super/deleteProject/${id}`);
  },

  // User
  async getUserList(): Promise<User[]> {
    const { data } = await axiosClient.get<User[]>("/super/getUserList");
    return data;
  },
  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const { data } = await axiosClient.put<User>(`/super/updateUser/${id}`, payload);
    return data;
  },

  // System Role
  async getSystemRoleList(): Promise<SystemRole[]> {
    const { data } = await axiosClient.get<SystemRole[]>("/super/getSystemRoleList");
    return data;
  },
  async createSystemRole(name: string): Promise<SystemRole> {
    const { data } = await axiosClient.post<SystemRole>("/super/createSystemRole", { name });
    return data;
  },

  // Company Role
  async getCompanyRoleList(): Promise<CompanyRole[]> {
    const { data } = await axiosClient.get<CompanyRole[]>("/super/getCompanyRoleList");
    return data;
  },
  async createCompanyRole(name: string): Promise<CompanyRole> {
    const { data } = await axiosClient.post<CompanyRole>("/super/createCompanyRole", { name });
    return data;
  },

  // WorkType
  async getWorkTypeList(projectId: string): Promise<WorkType[]> {
    const { data } = await axiosClient.get<WorkType[]>("/super/getWorkTypeList", {
      params: { projectId },
    });
    return data;
  },

  // Company-Project Mapping
  async getCompanyToProjectList(params?: {
    projectId?: string;
    companyId?: string;
  }): Promise<CompanyToProject[]> {
    const { data } = await axiosClient.get<CompanyToProject[]>("/super/getCompanyToProjectList", {
      params,
    });
    return data;
  },
  async createCompanyToProject(
    payload: CreateCompanyToProjectPayload,
  ): Promise<CompanyToProject> {
    const { data } = await axiosClient.post<CompanyToProject>(
      "/super/createCompanyToProject",
      payload,
    );
    return data;
  },
  async updateCompanyToProject(
    id: number,
    payload: UpdateCompanyToProjectPayload,
  ): Promise<CompanyToProject> {
    const { data } = await axiosClient.put<CompanyToProject>(
      `/super/updateCompanyToProject/${id}`,
      payload,
    );
    return data;
  },

  // User-Project Mapping
  async getUserToProjectList(params?: {
    projectId?: string;
    userId?: string;
  }): Promise<UserToProject[]> {
    const { data } = await axiosClient.get<UserToProject[]>("/super/getUserToProjectList", {
      params,
    });
    return data;
  },
  async createUserToProject(payload: CreateUserToProjectPayload): Promise<UserToProject> {
    const { data } = await axiosClient.post<UserToProject>("/super/createUserToProject", payload);
    return data;
  },
  async updateUserToProject(
    id: number,
    payload: UpdateUserToProjectPayload,
  ): Promise<UserToProject> {
    const { data } = await axiosClient.put<UserToProject>(
      `/super/updateUserToProject/${id}`,
      payload,
    );
    return data;
  },
  async deleteCompanyToProject(id: number): Promise<void> {
    await axiosClient.delete(`/companyProject/deleteCompanyToProject/${id}`);
  },
  async deleteUserToProject(id: number): Promise<void> {
    await axiosClient.delete(`/userProject/deleteUserToProject/${id}`);
  },

  // API Key
  async createApiKey(payload: CreateApiKeyPayload): Promise<CreateApiKeyResponse> {
    const { data } = await axiosClient.post<CreateApiKeyResponse>("/super/createApiKey", payload);
    return data;
  },
  async getApiKeyList(comId: string): Promise<ApiKeyMasked[]> {
    const { data } = await axiosClient.get<ApiKeyMasked[]>("/super/getApiKeyList", {
      params: { comId },
    });
    return data;
  },
  async getApiKey(apiKeyId: string): Promise<ApiKeyMasked> {
    const { data } = await axiosClient.get<ApiKeyMasked>(`/super/getApiKey/${apiKeyId}`);
    return data;
  },
  async deleteApiKey(projectId: string): Promise<void> {
    await axiosClient.delete(`/super/deleteApiKey/${projectId}`);
  },

  // Embedding
  async recalculateAllEmbeddings(): Promise<RecalculateEmbeddingsResponse> {
    // 전 프로젝트 모든 행을 동기로 재계산하는 장시간 API — 기본 10s 타임아웃으로는 부족
    const { data } = await axiosClient.post<RecalculateEmbeddingsResponse>(
      "/super/embedding/recalculateAllEmbeddings",
      undefined,
      { timeout: 0 },
    );
    return data;
  },
};
