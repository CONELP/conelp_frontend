import { axiosClient } from "@/shared/network/axios-client";

export type DocConfigDocType = "MIR" | "CAT" | "CCST";
export type UploadDocType = "MIR" | "CAT" | "DR" | "MAT_INOUT" | "CONC_LOG";
export type DocGenPromptDocType =
  | "DR"
  | "MIR"
  | "CAT"
  | "CCST"
  | "MAT_INOUT"
  | "CONC_LOG";
export type PreprocessPromptDocType = "DR" | "MAT_INOUT";
export type TemplateDocType = "MIR" | "CAT" | "DR" | "MAT_INOUT" | "CONC_LOG";
export type TemplateRefDocType =
  | "MIR"
  | "CAT"
  | "CCST"
  | "DR"
  | "MAT_INOUT"
  | "CONC_LOG";

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
  // doc-gen 단계 (양식변경 + 내용입력) 추가 지침 — 6종
  drDocGenPrompt: string | null;
  mirDocGenPrompt: string | null;
  catDocGenPrompt: string | null;
  ccstDocGenPrompt: string | null;
  matInoutDocGenPrompt: string | null;
  concLogDocGenPrompt: string | null;
  // preprocess 단계 (서버 집계 전 grouping 분류) — DR / MAT_INOUT 만
  drPreprocessPrompt: string | null;
  matInoutPreprocessPrompt: string | null;
  // analyze 단계 (MIR 송장 이미지 자재 식별)
  mirAnalyzePhotoPrompt: string | null;
  matInoutTemplateUrl: string | null;
  matInoutTemplateRefUrl: string | null;
  concLogTemplateUrl: string | null;
  concLogTemplateRefUrl: string | null;
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

  // doc-gen 단계 추가 지침 (양식변경 + 내용입력 공통) — DR 포함 6종
  async updateDocGenPrompt(
    projectId: string,
    body: { docType: DocGenPromptDocType; prompt: string | null },
  ): Promise<DocConfigResponse> {
    const { data } = await axiosClient.put<DocConfigResponse>(
      `/docConfig/updateDocGenPrompt/${projectId}`,
      body,
    );
    return data;
  },

  // preprocess 단계 전용 지침 — DR / MAT_INOUT 만
  async updatePreprocessPrompt(
    projectId: string,
    body: { docType: PreprocessPromptDocType; prompt: string | null },
  ): Promise<DocConfigResponse> {
    const { data } = await axiosClient.put<DocConfigResponse>(
      `/docConfig/updatePreprocessPrompt/${projectId}`,
      body,
    );
    return data;
  },

  // MIR analyze 단계 추가 규칙 (송장 이미지 자재 식별)
  async updateMirAnalyzePhotoPrompt(
    projectId: string,
    body: { prompt: string | null },
  ): Promise<DocConfigResponse> {
    const { data } = await axiosClient.put<DocConfigResponse>(
      `/docConfig/updateMirAnalyzePhotoPrompt/${projectId}`,
      body,
    );
    return data;
  },
};
