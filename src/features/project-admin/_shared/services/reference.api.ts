import { axiosClient } from "@/shared/network/axios-client";

// 공통 타입
export interface IdNameResponse {
  id: number;
  name: string;
}

// 공종 분류 타입
export interface WorkTypeResponse {
  id: number;
  name: string;
  divisionId: number;
}

// 부재 타입 응답
export interface ComponentTypeResponse {
  id: number;
  name: string;
}

export interface SubWorkTypeResponse {
  id: number;
  name: string;
  workTypeId: number;
}

export interface WorkStepResponse {
  id: number;
  name: string;
  subWorkTypeId: number;
  componentTypeId: number;
}

// 직종(LaborType) 타입
export interface LaborTypeResponse {
  id: number;
  name: string;
  workTypeId: number | null;
  workTypeName: string | null;
  isVisible: boolean;
}

export interface LaborTypeGroupItem {
  id: number;
  name: string;
  isVisible: boolean;
}

export interface LaborTypeGroupedResponse {
  workTypeId: number | null;
  workTypeName: string | null;
  laborTypes: LaborTypeGroupItem[];
}

// 장비 마스터 타입
export interface EquipmentTypeResponse {
  id: number;
  name: string;
}

export interface EquipmentSpecResponse {
  id: number;
  name: string;
  equipmentTypeId: number;
  equipmentTypeName: string;
  isVisible: boolean;
}

// 자재 마스터 타입
export interface MaterialTypeResponse {
  id: number;
  name: string;
  unit: string;
}

export interface MaterialSpecResponse {
  id: number;
  name: string;
  materialTypeId: number;
  isVisible: boolean;
}

// 부재 코드 타입
export interface ComponentCodeResponse {
  id: number;
  componentTypeId: number;
  code: string;
}

export interface CcodeDetailResponse {
  id: number;
  componentCodeId: number;
  componentCodeName: string;
  workStepId: number;
  workStepName: string;
  materialSpecId: number | null;
  materialSpecName: string | null;
  floorId: number | null;
  floorName: string | null;
}

export interface MappingResultResponse {
  mappedCount: number;
  skippedCount: number;
  componentCodeCount: number;
  workStepCount: number;
}

export interface UpdateMappingResultResponse {
  updatedCount: number;
  materialSpecId: number;
}

export interface CreateTasksResponse {
  createdCount: number;
  skippedDuplicateCount: number;
  skippedNoCcodeCount: number;
}

export interface UpdateReferenceRequest {
  id?: number;
  name?: string;
  unit?: string;
  ids?: number[];
  isVisible?: boolean;
}

export interface UpdateChildReferenceRequest extends UpdateReferenceRequest {
  parentId?: number;
  componentTypeId?: number;
}

export const referenceApi = {
  // ========== 공종 분류 (Division → WorkType → SubWorkType) ==========

  async getDivisionList(): Promise<IdNameResponse[]> {
    const { data } = await axiosClient.get<IdNameResponse[]>("/reference/getDivisionList");
    return data;
  },

  async createDivision(name: string): Promise<IdNameResponse> {
    const { data } = await axiosClient.post<IdNameResponse>("/reference/createDivision", { name });
    return data;
  },

  async getWorkTypeList(divisionId: number): Promise<WorkTypeResponse[]> {
    const { data } = await axiosClient.get<WorkTypeResponse[]>("/reference/getWorkTypeList", {
      params: { divisionId },
    });
    return data;
  },

  async getWorkTypeListByName(name: string): Promise<WorkTypeResponse[]> {
    const { data } = await axiosClient.get<WorkTypeResponse[]>("/reference/getWorkTypeListByName", {
      params: { name },
    });
    return data;
  },

  async createWorkType(divisionId: number, name: string): Promise<WorkTypeResponse> {
    const { data } = await axiosClient.post<WorkTypeResponse>("/reference/createWorkType", {
      divisionId,
      name,
    });
    return data;
  },

  async getSubWorkTypeList(workTypeId: number): Promise<SubWorkTypeResponse[]> {
    const { data } = await axiosClient.get<SubWorkTypeResponse[]>("/reference/getSubWorkTypeList", {
      params: { workTypeId },
    });
    return data;
  },

  async createSubWorkType(workTypeId: number, name: string): Promise<SubWorkTypeResponse> {
    const { data } = await axiosClient.post<SubWorkTypeResponse>("/reference/createSubWorkType", {
      workTypeId,
      name,
    });
    return data;
  },

  async getWorkStepList(subWorkTypeId: number): Promise<WorkStepResponse[]> {
    const { data } = await axiosClient.get<WorkStepResponse[]>("/reference/getWorkStepList", {
      params: { subWorkTypeId },
    });
    return data;
  },

  async createWorkStep(
    subWorkTypeId: number,
    name: string,
    componentTypeId: number,
  ): Promise<WorkStepResponse> {
    const { data } = await axiosClient.post<WorkStepResponse>("/super/reference/createWorkStep", {
      subWorkTypeId,
      name,
      componentTypeId,
    });
    return data;
  },

  // ========== 자재 마스터 (MaterialType → MaterialSpec) ==========

  async getMaterialTypeList(): Promise<MaterialTypeResponse[]> {
    const { data } = await axiosClient.get<MaterialTypeResponse[]>("/reference/getMaterialTypeList");
    return data;
  },

  async createMaterialType(name: string, unit?: string): Promise<MaterialTypeResponse> {
    const { data } = await axiosClient.post<MaterialTypeResponse>("/reference/createMaterialType", {
      name,
      unit,
    });
    return data;
  },

  async getMaterialSpecList(materialTypeId: number): Promise<MaterialSpecResponse[]> {
    const { data } = await axiosClient.get<MaterialSpecResponse[]>("/reference/getMaterialSpecList", {
      params: { materialTypeId },
    });
    return data;
  },

  async createMaterialSpec(
    materialTypeId: number,
    name: string,
    isVisible?: boolean,
  ): Promise<MaterialSpecResponse> {
    const { data } = await axiosClient.post<MaterialSpecResponse>("/reference/createMaterialSpec", {
      materialTypeId,
      name,
      isVisible,
    });
    return data;
  },

  // ========== 작업 위치 (Zone / Floor) ==========

  async getZoneList(): Promise<IdNameResponse[]> {
    const { data } = await axiosClient.get<IdNameResponse[]>("/reference/getZoneList");
    return data;
  },

  async createZone(name: string): Promise<IdNameResponse> {
    const { data } = await axiosClient.post<IdNameResponse>("/reference/createZone", { name });
    return data;
  },

  async getFloorList(): Promise<IdNameResponse[]> {
    const { data } = await axiosClient.get<IdNameResponse[]>("/reference/getFloorList");
    return data;
  },

  async createFloor(name: string): Promise<IdNameResponse> {
    const { data } = await axiosClient.post<IdNameResponse>("/reference/createFloor", { name });
    return data;
  },

  // ========== 부재 타입 (ComponentType → ComponentCode) ==========

  async getComponentTypeList(): Promise<ComponentTypeResponse[]> {
    const { data } = await axiosClient.get<ComponentTypeResponse[]>(
      "/reference/getComponentTypeList",
    );
    return data;
  },

  async createComponentType(name: string): Promise<ComponentTypeResponse> {
    const { data } = await axiosClient.post<ComponentTypeResponse>(
      "/super/reference/createComponentType",
      { name },
    );
    return data;
  },

  async getComponentCodeList(componentTypeId?: number): Promise<ComponentCodeResponse[]> {
    const { data } = await axiosClient.get<ComponentCodeResponse[]>(
      "/reference/getComponentCodeList",
      { params: componentTypeId != null ? { componentTypeId } : undefined },
    );
    return data;
  },

  async createComponentCode(componentTypeId: number, code: string): Promise<ComponentCodeResponse> {
    const { data } = await axiosClient.post<ComponentCodeResponse>(
      "/reference/createComponentCode",
      { componentTypeId, code },
    );
    return data;
  },

  async getCcodeDetailList(componentCodeId?: number): Promise<CcodeDetailResponse[]> {
    const { data } = await axiosClient.get<CcodeDetailResponse[]>(
      "/reference/getCcodeDetailList",
      { params: componentCodeId != null ? { componentCodeId } : undefined },
    );
    return data;
  },

  async createCcodeDetail(params: {
    componentCodeId: number;
    workStepId: number;
    floorId?: number;
  }): Promise<MappingResultResponse> {
    const { data } = await axiosClient.post<MappingResultResponse>(
      "/super/reference/createCcodeDetail",
      params,
    );
    return data;
  },

  async updateCcodeDetail(params: {
    ids: number[];
    materialSpecId: number;
  }): Promise<UpdateMappingResultResponse> {
    const { data } = await axiosClient.post<UpdateMappingResultResponse>(
      "/super/reference/updateCcodeDetail",
      params,
    );
    return data;
  },

  // ========== 장비 마스터 (EquipmentType → EquipmentSpec) ==========

  async getEquipmentTypeList(): Promise<EquipmentTypeResponse[]> {
    const { data } = await axiosClient.get<EquipmentTypeResponse[]>(
      "/reference/getEquipmentTypeList",
    );
    return data;
  },

  async createEquipmentType(name: string): Promise<EquipmentTypeResponse> {
    const { data } = await axiosClient.post<EquipmentTypeResponse>(
      "/super/reference/createEquipmentType",
      { name },
    );
    return data;
  },

  async getEquipmentSpecList(equipmentTypeId?: number): Promise<EquipmentSpecResponse[]> {
    const { data } = await axiosClient.get<EquipmentSpecResponse[]>(
      "/reference/getEquipmentSpecList",
      { params: equipmentTypeId != null ? { equipmentTypeId } : undefined },
    );
    return data;
  },

  async createEquipmentSpec(
    equipmentTypeId: number,
    name: string,
    isVisible?: boolean,
  ): Promise<EquipmentSpecResponse> {
    const { data } = await axiosClient.post<EquipmentSpecResponse>(
      "/reference/createEquipmentSpec",
      { equipmentTypeId, name, isVisible },
    );
    return data;
  },

  // ========== 직종 (LaborType) ==========

  async getLaborTypeList(): Promise<LaborTypeResponse[]> {
    const { data } = await axiosClient.get<LaborTypeGroupedResponse[]>(
      "/reference/getLaborTypeList",
    );
    return data.flatMap((group) =>
      group.laborTypes.map((laborType) => ({
        id: laborType.id,
        name: laborType.name,
        workTypeId: group.workTypeId,
        workTypeName: group.workTypeName,
        isVisible: laborType.isVisible,
      })),
    );
  },

  async getLaborTypeListByWorkType(workTypeId: number): Promise<LaborTypeResponse[]> {
    const { data } = await axiosClient.get<LaborTypeResponse[]>(
      "/reference/getLaborTypeListByWorkType",
      { params: { workTypeId } },
    );
    return data;
  },

  async createLaborType(params: {
    name: string;
    workTypeId: number;
    isVisible?: boolean;
  }): Promise<LaborTypeResponse> {
    const { data } = await axiosClient.post<LaborTypeResponse>(
      "/reference/createLaborType",
      params,
    );
    return data;
  },

  // ========== 수정 (이름 변경 + 정렬 변경) ==========

  async updateDivision(params: UpdateReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateDivision", params);
  },

  async updateMaterialType(params: UpdateReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateMaterialType", params);
  },

  async updateEquipmentType(params: UpdateReferenceRequest): Promise<void> {
    await axiosClient.post("/super/reference/updateEquipmentType", params);
  },

  async updateComponentType(params: UpdateChildReferenceRequest): Promise<void> {
    await axiosClient.post("/super/reference/updateComponentType", params);
  },

  async updateLaborType(params: UpdateReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateLaborType", params);
  },

  async updateZone(params: UpdateReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateZone", params);
  },

  async updateFloor(params: UpdateReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateFloor", params);
  },

  async updateWorkType(params: UpdateChildReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateWorkType", params);
  },

  async updateSubWorkType(params: UpdateChildReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateSubWorkType", params);
  },

  async updateWorkStep(params: UpdateChildReferenceRequest): Promise<void> {
    await axiosClient.post("/super/reference/updateWorkStep", params);
  },

  async updateMaterialSpec(params: UpdateChildReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateMaterialSpec", params);
  },

  async updateEquipmentSpec(params: UpdateChildReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateEquipmentSpec", params);
  },

  async updateComponentCode(params: UpdateChildReferenceRequest): Promise<void> {
    await axiosClient.post("/reference/updateComponentCode", params);
  },

  // ========== 삭제 ==========

  async deleteDivision(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteDivision/${id}`);
  },

  async deleteWorkType(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteWorkType/${id}`);
  },

  async deleteSubWorkType(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteSubWorkType/${id}`);
  },

  async deleteWorkStep(id: number): Promise<void> {
    await axiosClient.delete(`/super/reference/deleteWorkStep/${id}`);
  },

  async deleteMaterialType(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteMaterialType/${id}`);
  },

  async deleteMaterialSpec(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteMaterialSpec/${id}`);
  },

  async deleteEquipmentType(id: number): Promise<void> {
    await axiosClient.delete(`/super/reference/deleteEquipmentType/${id}`);
  },

  async deleteEquipmentSpec(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteEquipmentSpec/${id}`);
  },

  async deleteComponentType(id: number): Promise<void> {
    await axiosClient.delete(`/super/reference/deleteComponentType/${id}`);
  },

  async deleteLaborType(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteLaborType/${id}`);
  },

  async deleteCcodeDetail(id: number): Promise<void> {
    await axiosClient.delete(`/super/reference/deleteCcodeDetail/${id}`);
  },

  async deleteComponentCode(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteComponentCode/${id}`);
  },

  async deleteZone(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteZone/${id}`);
  },

  async deleteFloor(id: number): Promise<void> {
    await axiosClient.delete(`/reference/deleteFloor/${id}`);
  },

  // ========== 세부작업 생성 ==========

  async createTasks(): Promise<CreateTasksResponse> {
    const { data } = await axiosClient.post<CreateTasksResponse>("/task/createTasks");
    return data;
  },
};
