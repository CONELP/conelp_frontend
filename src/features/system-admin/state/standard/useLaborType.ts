import { ref, watch } from "vue";

import {
  referenceApi,
  type IdNameResponse,
  type LaborTypeResponse,
  type WorkTypeResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

export function useLaborType() {
  const divisions = ref<IdNameResponse[]>([]);
  const workTypes = ref<WorkTypeResponse[]>([]);

  const selectedDivisionId = ref<number | null>(null);
  const selectedWorkTypeId = ref<number | null>(null);

  const laborTypes = ref<LaborTypeResponse[]>([]);

  const newLaborTypeName = ref("");
  const isCreating = ref(false);
  const isDeleting = ref(false);

  const loadDivisions = async () => {
    try {
      divisions.value = await referenceApi.getDivisionList();
    } catch (error) {
      console.error("Division 목록 로드 실패:", error);
    }
  };

  const loadWorkTypes = async (divisionId: number) => {
    try {
      workTypes.value = await referenceApi.getWorkTypeList(divisionId);
    } catch (error) {
      console.error("WorkType 목록 로드 실패:", error);
    }
  };

  const loadLaborTypes = async (workTypeId: number) => {
    try {
      laborTypes.value = await referenceApi.getLaborTypeListByWorkType(workTypeId);
    } catch (error) {
      console.error("LaborType 목록 로드 실패:", error);
    }
  };

  const selectDivision = (id: number) => {
    selectedDivisionId.value = id;
    selectedWorkTypeId.value = null;
    workTypes.value = [];
    laborTypes.value = [];
  };

  const selectWorkType = (id: number) => {
    selectedWorkTypeId.value = id;
  };

  const addLaborType = async () => {
    if (isCreating.value) return;
    const name = newLaborTypeName.value.trim();
    const workTypeId = selectedWorkTypeId.value;
    if (!name || !workTypeId) return;

    isCreating.value = true;
    try {
      await referenceApi.createLaborType({ name, workTypeId });
      newLaborTypeName.value = "";
      await loadLaborTypes(workTypeId);
      analyticsClient.trackAction("admin_resource_data", "create_labor_type", "success");
    } catch (error: unknown) {
      console.error("LaborType 추가 실패:", error);
      analyticsClient.trackAction("admin_resource_data", "create_labor_type", "fail");
      alert((error as Error).message);
    } finally {
      isCreating.value = false;
    }
  };

  const deleteLaborType = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteLaborType(id);
      laborTypes.value = laborTypes.value.filter((lt) => lt.id !== id);
      analyticsClient.trackAction("admin_resource_data", "delete_labor_type", "success");
    } catch (error: unknown) {
      console.error("LaborType 삭제 실패:", error);
      analyticsClient.trackAction("admin_resource_data", "delete_labor_type", "fail");
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  const updateLaborTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateLaborType({ id, name });
      const item = laborTypes.value.find((lt) => lt.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_resource_data", "update_labor_type", "success");
    } catch (error: unknown) {
      console.error("LaborType 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_resource_data", "update_labor_type", "fail");
      alert((error as Error).message);
      if (selectedWorkTypeId.value) await loadLaborTypes(selectedWorkTypeId.value);
    }
  };

  const reorderLaborTypes = async (ids: number[]) => {
    if (!selectedWorkTypeId.value) return;
    try {
      await referenceApi.updateLaborType({ ids });
      await loadLaborTypes(selectedWorkTypeId.value);
    } catch (error: unknown) {
      console.error("LaborType 정렬 실패:", error);
      alert((error as Error).message);
      if (selectedWorkTypeId.value) await loadLaborTypes(selectedWorkTypeId.value);
    }
  };

  watch(selectedDivisionId, (id) => {
    workTypes.value = [];
    if (id) loadWorkTypes(id);
  });

  watch(selectedWorkTypeId, (id) => {
    laborTypes.value = [];
    if (id) loadLaborTypes(id);
  });

  return {
    divisions,
    workTypes,
    laborTypes,
    selectedDivisionId,
    selectedWorkTypeId,
    newLaborTypeName,
    isCreating,
    isDeleting,
    loadDivisions,
    selectDivision,
    selectWorkType,
    addLaborType,
    deleteLaborType,
    updateLaborTypeName,
    reorderLaborTypes,
  };
}
