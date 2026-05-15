import { computed, ref, watch } from "vue";

import {
  referenceApi,
  type CcodeDetailResponse,
  type ComponentCodeResponse,
  type ComponentTypeResponse,
  type CreateTasksResponse,
  type IdNameResponse,
  type MaterialSpecResponse,
  type MaterialTypeResponse,
  type SubWorkTypeResponse,
  type WorkStepResponse,
  type WorkTypeResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

export function useComponentCode() {
  const componentTypes = ref<ComponentTypeResponse[]>([]);
  const componentTypeLookupMap = ref<Map<number, string>>(new Map());

  const componentCodes = ref<ComponentCodeResponse[]>([]);
  const selectedComponentTypeId = ref<number | null>(null);
  const newComponentCode = ref("");
  const isCreatingCode = ref(false);
  const isDeletingCode = ref(false);

  const allMappings = ref<CcodeDetailResponse[]>([]);
  const selectedComponentCodeIds = ref<number[]>([]);
  const isCreatingMapping = ref(false);
  const isDeletingMapping = ref(false);

  const divisions = ref<IdNameResponse[]>([]);
  const workTypes = ref<WorkTypeResponse[]>([]);
  const subWorkTypes = ref<SubWorkTypeResponse[]>([]);
  const workSteps = ref<WorkStepResponse[]>([]);
  const selectedWorkStepIds = ref<number[]>([]);

  const materialTypes = ref<MaterialTypeResponse[]>([]);
  const materialSpecs = ref<MaterialSpecResponse[]>([]);

  const mappingForm = ref({
    divisionId: "",
    workTypeId: "",
    subWorkTypeId: "",
  });

  const materialApplyForm = ref({
    materialTypeId: "",
    materialSpecId: "",
  });

  const selectedMappingIds = ref<number[]>([]);

  const isLoadingWorkTypes = ref(false);
  const isLoadingSubWorkTypes = ref(false);
  const isLoadingWorkSteps = ref(false);
  const isLoadingMaterialSpecs = ref(false);
  const isApplyingMaterial = ref(false);

  const isCreatingTasks = ref(false);
  const createTasksResult = ref<CreateTasksResponse | null>(null);
  const showCreateTasksResult = ref(false);

  const loadComponentTypes = async () => {
    try {
      const list = await referenceApi.getComponentTypeList();
      componentTypes.value = list;
      componentTypeLookupMap.value = new Map(list.map((ct) => [ct.id, ct.name]));
    } catch (error) {
      console.error("ComponentType 목록 로드 실패:", error);
    }
  };

  const getComponentTypeName = (id: number): string => {
    return componentTypeLookupMap.value.get(id) ?? "";
  };

  const loadComponentCodes = async (componentTypeId: number) => {
    try {
      componentCodes.value = await referenceApi.getComponentCodeList(componentTypeId);
    } catch (error) {
      console.error("ComponentCode 목록 로드 실패:", error);
      componentCodes.value = [];
    }
  };

  const addComponentCode = async () => {
    if (isCreatingCode.value) return;
    if (selectedComponentTypeId.value == null) return;
    const code = newComponentCode.value.trim();
    if (!code) return;

    isCreatingCode.value = true;
    try {
      await referenceApi.createComponentCode(selectedComponentTypeId.value, code);
      newComponentCode.value = "";
      await loadComponentCodes(selectedComponentTypeId.value);
      analyticsClient.trackAction("admin_master_data", "create_component_code", "success");
    } catch (error: unknown) {
      console.error("ComponentCode 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_component_code", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isCreatingCode.value = false;
    }
  };

  const deleteComponentCode = async (id: number) => {
    if (isDeletingCode.value) return;
    isDeletingCode.value = true;
    try {
      await referenceApi.deleteComponentCode(id);
      selectedComponentCodeIds.value = selectedComponentCodeIds.value.filter((v) => v !== id);
      componentCodes.value = componentCodes.value.filter((cc) => cc.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_component_code", "success");
    } catch (error: unknown) {
      console.error("ComponentCode 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_component_code", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isDeletingCode.value = false;
    }
  };

  const isAllComponentCodesSelected = computed(() => {
    if (componentCodes.value.length === 0) return false;
    return componentCodes.value.every((cc) => selectedComponentCodeIds.value.includes(cc.id));
  });

  const toggleComponentCode = (id: number) => {
    const idx = selectedComponentCodeIds.value.indexOf(id);
    if (idx === -1) {
      selectedComponentCodeIds.value = [...selectedComponentCodeIds.value, id];
    } else {
      selectedComponentCodeIds.value = selectedComponentCodeIds.value.filter((v) => v !== id);
    }
  };

  const toggleAllComponentCodes = () => {
    if (isAllComponentCodesSelected.value) {
      selectedComponentCodeIds.value = [];
    } else {
      selectedComponentCodeIds.value = componentCodes.value.map((cc) => cc.id);
    }
  };

  const isAllWorkStepsSelected = computed(() => {
    if (workSteps.value.length === 0) return false;
    return workSteps.value.every((ws) => selectedWorkStepIds.value.includes(ws.id));
  });

  const toggleWorkStep = (id: number) => {
    const idx = selectedWorkStepIds.value.indexOf(id);
    if (idx === -1) {
      selectedWorkStepIds.value = [...selectedWorkStepIds.value, id];
    } else {
      selectedWorkStepIds.value = selectedWorkStepIds.value.filter((v) => v !== id);
    }
  };

  const toggleAllWorkSteps = () => {
    if (isAllWorkStepsSelected.value) {
      selectedWorkStepIds.value = [];
    } else {
      selectedWorkStepIds.value = workSteps.value.map((ws) => ws.id);
    }
  };

  const loadAllMappings = async () => {
    try {
      allMappings.value = await referenceApi.getCcodeDetailList();
      selectedMappingIds.value = [];
    } catch (error) {
      console.error("전체 매핑 로드 실패:", error);
      allMappings.value = [];
    }
  };

  const filteredMappings = computed(() => {
    let result = allMappings.value;

    if (selectedComponentTypeId.value != null && componentCodes.value.length > 0) {
      const codeIds = componentCodes.value.map((c) => c.id);
      result = result.filter((m) => codeIds.includes(m.componentCodeId));
    }

    if (selectedComponentCodeIds.value.length > 0) {
      result = result.filter((m) => selectedComponentCodeIds.value.includes(m.componentCodeId));
    }

    if (selectedWorkStepIds.value.length > 0) {
      result = result.filter((m) => selectedWorkStepIds.value.includes(m.workStepId));
    }

    return result;
  });

  const isAllMappingsSelected = computed(() => {
    if (filteredMappings.value.length === 0) return false;
    return filteredMappings.value.every((m) => selectedMappingIds.value.includes(m.id));
  });

  const toggleMapping = (id: number) => {
    const idx = selectedMappingIds.value.indexOf(id);
    if (idx === -1) {
      selectedMappingIds.value = [...selectedMappingIds.value, id];
    } else {
      selectedMappingIds.value = selectedMappingIds.value.filter((v) => v !== id);
    }
  };

  const toggleAllMappings = () => {
    if (isAllMappingsSelected.value) {
      selectedMappingIds.value = [];
    } else {
      selectedMappingIds.value = filteredMappings.value.map((m) => m.id);
    }
  };

  const loadDivisions = async () => {
    try {
      divisions.value = await referenceApi.getDivisionList();
    } catch (error) {
      console.error("Division 목록 로드 실패:", error);
    }
  };

  const loadMaterialTypes = async () => {
    try {
      materialTypes.value = await referenceApi.getMaterialTypeList();
    } catch (error) {
      console.error("MaterialType 목록 로드 실패:", error);
    }
  };

  const addMapping = async () => {
    if (isCreatingMapping.value) return;
    if (selectedComponentCodeIds.value.length === 0) return;
    if (selectedWorkStepIds.value.length === 0) return;

    isCreatingMapping.value = true;
    try {
      let totalMapped = 0;
      let totalSkipped = 0;

      for (const componentCodeId of selectedComponentCodeIds.value) {
        for (const workStepId of selectedWorkStepIds.value) {
          try {
            const result = await referenceApi.createCcodeDetail({
              componentCodeId,
              workStepId,
            });
            totalMapped += result.mappedCount;
            totalSkipped += result.skippedCount;
          } catch {
            totalSkipped += 1;
          }
        }
      }

      const messages: string[] = [];
      if (totalMapped > 0) messages.push(`${totalMapped}개 매핑 생성`);
      if (totalSkipped > 0) messages.push(`${totalSkipped}개 스킵(중복)`);
      alert(messages.join(", ") || "매핑 완료");

      await loadAllMappings();
      analyticsClient.trackAction("admin_master_data", "create_ccode_detail", "success");
    } catch (error: unknown) {
      console.error("매핑 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_ccode_detail", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isCreatingMapping.value = false;
    }
  };

  const deleteCcodeDetail = async (id: number) => {
    if (isDeletingMapping.value) return;
    isDeletingMapping.value = true;
    try {
      await referenceApi.deleteCcodeDetail(id);
      allMappings.value = allMappings.value.filter((m) => m.id !== id);
      selectedMappingIds.value = selectedMappingIds.value.filter((v) => v !== id);
      analyticsClient.trackAction("admin_master_data", "delete_ccode_detail", "success");
    } catch (error: unknown) {
      console.error("CcodeDetail 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_ccode_detail", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isDeletingMapping.value = false;
    }
  };

  const applyMaterialToSelectedMappings = async () => {
    if (selectedMappingIds.value.length === 0) return;
    if (!materialApplyForm.value.materialSpecId) return;

    isApplyingMaterial.value = true;
    try {
      const result = await referenceApi.updateCcodeDetail({
        ids: selectedMappingIds.value,
        materialSpecId: Number(materialApplyForm.value.materialSpecId),
      });

      alert(`${result.updatedCount}개 매핑에 자재규격 적용됨`);
      await loadAllMappings();
      materialApplyForm.value.materialTypeId = "";
      materialApplyForm.value.materialSpecId = "";
      analyticsClient.trackAction("admin_master_data", "update_ccode_detail", "success");
    } catch (error: unknown) {
      console.error("자재 적용 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_ccode_detail", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isApplyingMaterial.value = false;
    }
  };

  const createTasks = async () => {
    if (isCreatingTasks.value) return;

    isCreatingTasks.value = true;
    try {
      const result = await referenceApi.createTasks();
      createTasksResult.value = result;
      showCreateTasksResult.value = true;
    } catch (error: unknown) {
      console.error("세부작업 생성 실패:", error);
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isCreatingTasks.value = false;
    }
  };

  watch(selectedComponentTypeId, (typeId) => {
    if (typeId != null) {
      loadComponentCodes(typeId);
    } else {
      componentCodes.value = [];
    }
    selectedComponentCodeIds.value = [];
  });

  watch(
    () => mappingForm.value.divisionId,
    async (divisionId) => {
      workTypes.value = [];
      subWorkTypes.value = [];
      workSteps.value = [];
      mappingForm.value.workTypeId = "";
      mappingForm.value.subWorkTypeId = "";
      selectedWorkStepIds.value = [];
      if (!divisionId) return;

      isLoadingWorkTypes.value = true;
      try {
        workTypes.value = await referenceApi.getWorkTypeList(Number(divisionId));
      } catch (error) {
        console.error("WorkType 목록 로드 실패:", error);
      } finally {
        isLoadingWorkTypes.value = false;
      }
    },
  );

  watch(
    () => mappingForm.value.workTypeId,
    async (workTypeId) => {
      subWorkTypes.value = [];
      workSteps.value = [];
      mappingForm.value.subWorkTypeId = "";
      selectedWorkStepIds.value = [];
      if (!workTypeId) return;

      isLoadingSubWorkTypes.value = true;
      try {
        subWorkTypes.value = await referenceApi.getSubWorkTypeList(Number(workTypeId));
      } catch (error) {
        console.error("SubWorkType 목록 로드 실패:", error);
      } finally {
        isLoadingSubWorkTypes.value = false;
      }
    },
  );

  watch(
    () => mappingForm.value.subWorkTypeId,
    async (subWorkTypeId) => {
      workSteps.value = [];
      selectedWorkStepIds.value = [];
      if (!subWorkTypeId) return;

      isLoadingWorkSteps.value = true;
      try {
        workSteps.value = await referenceApi.getWorkStepList(Number(subWorkTypeId));
      } catch (error) {
        console.error("WorkStep 목록 로드 실패:", error);
      } finally {
        isLoadingWorkSteps.value = false;
      }
    },
  );

  watch(
    () => materialApplyForm.value.materialTypeId,
    async (materialTypeId) => {
      materialSpecs.value = [];
      materialApplyForm.value.materialSpecId = "";
      if (!materialTypeId) return;

      isLoadingMaterialSpecs.value = true;
      try {
        materialSpecs.value = await referenceApi.getMaterialSpecList(Number(materialTypeId));
      } catch (error) {
        console.error("MaterialSpec 목록 로드 실패:", error);
      } finally {
        isLoadingMaterialSpecs.value = false;
      }
    },
  );

  return {
    componentTypes,
    loadComponentTypes,
    getComponentTypeName,

    componentCodes,
    selectedComponentTypeId,
    newComponentCode,
    isCreatingCode,
    isDeletingCode,
    addComponentCode,
    deleteComponentCode,

    selectedComponentCodeIds,
    isAllComponentCodesSelected,
    toggleComponentCode,
    toggleAllComponentCodes,

    allMappings,
    filteredMappings,
    isCreatingMapping,
    isDeletingMapping,
    deleteCcodeDetail,
    divisions,
    workTypes,
    subWorkTypes,
    workSteps,
    materialTypes,
    materialSpecs,
    mappingForm,
    isLoadingWorkTypes,
    isLoadingSubWorkTypes,
    isLoadingWorkSteps,
    isLoadingMaterialSpecs,
    loadDivisions,
    loadMaterialTypes,
    loadAllMappings,
    addMapping,

    selectedWorkStepIds,
    isAllWorkStepsSelected,
    toggleWorkStep,
    toggleAllWorkSteps,

    selectedMappingIds,
    isAllMappingsSelected,
    toggleMapping,
    toggleAllMappings,

    materialApplyForm,
    isApplyingMaterial,
    applyMaterialToSelectedMappings,

    isCreatingTasks,
    createTasksResult,
    showCreateTasksResult,
    createTasks,
  };
}
