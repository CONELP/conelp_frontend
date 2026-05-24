import { axiosClient } from "@/shared/network/axios-client";

export type DocConfigDocType = "MIR" | "CAT" | "CCST";
export type UploadDocType = "MIR" | "CAT" | "DR";
export type ScriptPromptDocType = "MIR" | "CAT" | "CCST";
export type TemplateDocType = "MIR" | "CAT" | "DR";
export type TemplateRefDocType = "MIR" | "CAT" | "CCST" | "DR";

export interface DocConfigResponse {
  id: number;
  projectId: string;
  drTemplateUrl: string | null;
  drTemplateRefUrl: string | null;
  mirTemplateUrl: string | null;
  catTemplateUrl: string | null;
  mirTemplateRefUrl: string | null;
  catTemplateRefUrl: string | null;
  ccstTemplateRefUrl: string | null;
  mirDocNoPrompt: string | null;
  catDocNoPrompt: string | null;
  ccstDocNoPrompt: string | null;
  mirScriptPrompt: string | null;
  catScriptPrompt: string | null;
  ccstScriptPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const docConfigApi = {
  async createDocConfig(projectId: string): Promise<DocConfigResponse> {
    const { data } = await axiosClient.post<DocConfigResponse>(
      `/docConfig/createDocConfig/${projectId}`,
    );
    return data;
  },

  async getDocConfig(projectId: string): Promise<DocConfigResponse> {
    const { data } = await axiosClient.get<DocConfigResponse>(
      `/docConfig/getDocConfig/${projectId}`,
    );
    return data;
  },

  async updateDocNoPrompt(
    projectId: string,
    body: { docType: DocConfigDocType; prompt: string },
  ): Promise<DocConfigResponse> {
    const { data } = await axiosClient.put<DocConfigResponse>(
      `/docConfig/updateDocNoPrompt/${projectId}`,
      body,
    );
    return data;
  },

  async uploadTemplate(
    projectId: string,
    docType: UploadDocType,
    file: File,
  ): Promise<DocConfigResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosClient.post<DocConfigResponse>(
      `/docConfig/uploadTemplate/${projectId}/${docType}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      },
    );
    return data;
  },

  async updateTemplateRefUrl(
    projectId: string,
    body: { docType: TemplateRefDocType; url: string },
  ): Promise<DocConfigResponse> {
    const { data } = await axiosClient.put<DocConfigResponse>(
      `/docConfig/updateTemplateRefUrl/${projectId}`,
      body,
    );
    return data;
  },

  async uploadTemplateRef(
    projectId: string,
    docType: TemplateRefDocType,
    file: File,
  ): Promise<DocConfigResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosClient.post<DocConfigResponse>(
      `/docConfig/uploadTemplateRef/${projectId}/${docType}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      },
    );
    return data;
  },

  async updateScriptPrompt(
    projectId: string,
    body: { docType: ScriptPromptDocType; prompt: string | null },
  ): Promise<DocConfigResponse> {
    const { data } = await axiosClient.put<DocConfigResponse>(
      `/docConfig/updateScriptPrompt/${projectId}`,
      body,
    );
    return data;
  },
};
