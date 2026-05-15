import { ref, watch } from "vue";

import {
  referenceApi,
  type IdNameResponse,
  type SubWorkTypeResponse,
  type WorkStepResponse,
  type WorkTypeResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

export function useWorkStepMaster() {
  const divisions = ref<IdNameResponse[]>([]);
  const workTypes = ref<WorkTypeResponse[]>([]);
  const subWorkTypes = ref<SubWorkTypeResponse[]>([]);
  const componentTypes = ref<IdNameResponse[]>([]);

  const selectedDivisionId = ref<number | null>(null);
  const selectedWorkTypeId = ref<number | null>(null);
  const selectedSubWorkTypeId = ref<number | null>(null);

  const workSteps = ref<WorkStepResponse[]>([]);
  const newWorkStepName = ref("");
  const newWorkStepComponentTypeId = ref<number | null>(null);

  const isCreating = ref(false);
  const isDeleting = ref(false);

  const loadDivisions = async () => {
    try {
      divisions.value = await referenceApi.getDivisionList();
    } catch (error) {
      console.error("Division 목록 로드 실패:", error);
    }
  };

  const loadComponentTypes = async () => {
    try {
      componentTypes.value = await referenceApi.getComponentTypeList();
    } catch (error) {
      console.error("ComponentType 목록 로드 실패:", error);
    }
  };

  const loadWorkTypes = async (divisionId: number) => {
    try {
      workTypes.value = await referenceApi.getWorkTypeList(divisionId);
    } catch (error) {
      console.error("WorkType 목록 로드 실패:", error);
    }
  };

  const loadSubWorkTypes = async (workTypeId: number) => {
    try {
      subWorkTypes.value = await referenceApi.getSubWorkTypeList(workTypeId);
    } catch (error) {
      console.error("SubWorkType 목록 로드 실패:", error);
    }
  };

  const loadWorkSteps = async (subWorkTypeId: number) => {
    try {
      workSteps.value = await referenceApi.getWorkStepList(subWorkTypeId);
    } catch (error) {
      console.error("WorkStep 목록 로드 실패:", error);
    }
  };

  const addWorkStep = async () => {
    if (isCreating.value) return;
    const name = newWorkStepName.value.trim();
    const componentTypeId = newWorkStepComponentTypeId.value;
    if (!name || !selectedSubWorkTypeId.value || componentTypeId == null) return;

    isCreating.value = true;
    try {
      await referenceApi.createWorkStep(selectedSubWorkTypeId.value, name, componentTypeId);
      newWorkStepName.value = "";
      newWorkStepComponentTypeId.value = null;
      await loadWorkSteps(selectedSubWorkTypeId.value);
      analyticsClient.trackAction("admin_master_data", "create_work_step", "success");
    } catch (error: unknown) {
      console.error("WorkStep 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_work_step", "fail");
      alert((error as Error).message);
    } finally {
      isCreating.value = false;
    }
  };

  const deleteWorkStep = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteWorkStep(id);
      workSteps.value = workSteps.value.filter((ws) => ws.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_work_step", "success");
    } catch (error: unknown) {
      console.error("WorkStep 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_work_step", "fail");
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  const updateWorkStepName = async (id: number, name: string) => {
    try {
      await referenceApi.updateWorkStep({ id, name });
      const item = workSteps.value.find((ws) => ws.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_master_data", "update_work_step", "success");
    } catch (error: unknown) {
      console.error("WorkStep 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_work_step", "fail");
      alert((error as Error).message);
      if (selectedSubWorkTypeId.value) await loadWorkSteps(selectedSubWorkTypeId.value);
    }
  };

  const updateWorkStepComponentType = async (id: number, componentTypeId: number) => {
    try {
      await referenceApi.updateWorkStep({ id, componentTypeId });
      const item = workSteps.value.find((ws) => ws.id === id);
      if (item) item.componentTypeId = componentTypeId;
      analyticsClient.trackAction("admin_master_data", "update_work_step_ctype", "success");
    } catch (error: unknown) {
      console.error("WorkStep ComponentType 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_work_step_ctype", "fail");
      alert((error as Error).message);
      if (selectedSubWorkTypeId.value) await loadWorkSteps(selectedSubWorkTypeId.value);
    }
  };

  const reorderWorkSteps = async (ids: number[]) => {
    if (!selectedSubWorkTypeId.value) return;
    try {
      await referenceApi.updateWorkStep({ ids, parentId: selectedSubWorkTypeId.value });
      await loadWorkSteps(selectedSubWorkTypeId.value);
    } catch (error: unknown) {
      console.error("WorkStep 정렬 실패:", error);
      alert((error as Error).message);
      if (selectedSubWorkTypeId.value) await loadWorkSteps(selectedSubWorkTypeId.value);
    }
  };

  const getComponentTypeName = (id: number): string => {
    return componentTypes.value.find((ct) => ct.id === id)?.name ?? "";
  };

  watch(selectedDivisionId, (id) => {
    workTypes.value = [];
    subWorkTypes.value = [];
    workSteps.value = [];
    selectedWorkTypeId.value = null;
    selectedSubWorkTypeId.value = null;
    if (id) loadWorkTypes(id);
  });

  watch(selectedWorkTypeId, (id) => {
    subWorkTypes.value = [];
    workSteps.value = [];
    selectedSubWorkTypeId.value = null;
    if (id) loadSubWorkTypes(id);
  });

  watch(selectedSubWorkTypeId, (id) => {
    workSteps.value = [];
    if (id) loadWorkSteps(id);
  });

  return {
    divisions,
    workTypes,
    subWorkTypes,
    componentTypes,
    workSteps,
    selectedDivisionId,
    selectedWorkTypeId,
    selectedSubWorkTypeId,
    newWorkStepName,
    newWorkStepComponentTypeId,
    isCreating,
    isDeleting,
    loadDivisions,
    loadComponentTypes,
    addWorkStep,
    deleteWorkStep,
    updateWorkStepName,
    updateWorkStepComponentType,
    reorderWorkSteps,
    getComponentTypeName,
  };
}
