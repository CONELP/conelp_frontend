import { ref, watch } from "vue";

import {
  referenceApi,
  type IdNameResponse,
  type SubWorkTypeResponse,
  type WorkTypeResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

export function useWorkClassification() {
  const divisions = ref<IdNameResponse[]>([]);
  const workTypes = ref<WorkTypeResponse[]>([]);
  const subWorkTypes = ref<SubWorkTypeResponse[]>([]);

  const selectedDivisionId = ref<number | null>(null);
  const selectedWorkTypeId = ref<number | null>(null);
  const selectedSubWorkTypeId = ref<number | null>(null);

  const newDivisionName = ref("");
  const newWorkTypeName = ref("");
  const newSubWorkTypeName = ref("");

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

  const loadSubWorkTypes = async (workTypeId: number) => {
    try {
      subWorkTypes.value = await referenceApi.getSubWorkTypeList(workTypeId);
    } catch (error) {
      console.error("SubWorkType 목록 로드 실패:", error);
    }
  };

  const selectDivision = (id: number) => {
    selectedDivisionId.value = id;
    selectedWorkTypeId.value = null;
    selectedSubWorkTypeId.value = null;
    subWorkTypes.value = [];
  };

  const selectWorkType = (id: number) => {
    selectedWorkTypeId.value = id;
    selectedSubWorkTypeId.value = null;
  };

  const selectSubWorkType = (id: number) => {
    selectedSubWorkTypeId.value = id;
  };

  const addDivision = async () => {
    if (isCreating.value) return;
    const name = newDivisionName.value.trim();
    if (!name) return;

    isCreating.value = true;
    try {
      const result = await referenceApi.createDivision(name);
      newDivisionName.value = "";
      await loadDivisions();
      selectDivision(result.id);
      analyticsClient.trackAction("admin_master_data", "create_division", "success");
    } catch (error: unknown) {
      console.error("Division 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_division", "fail");
      alert((error as Error).message);
    } finally {
      isCreating.value = false;
    }
  };

  const addWorkType = async () => {
    if (isCreating.value) return;
    const name = newWorkTypeName.value.trim();
    if (!name || !selectedDivisionId.value) return;

    isCreating.value = true;
    try {
      const result = await referenceApi.createWorkType(selectedDivisionId.value, name);
      newWorkTypeName.value = "";
      await loadWorkTypes(selectedDivisionId.value);
      selectWorkType(result.id);
      analyticsClient.trackAction("admin_master_data", "create_work_type", "success");
    } catch (error: unknown) {
      console.error("WorkType 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_work_type", "fail");
      alert((error as Error).message);
    } finally {
      isCreating.value = false;
    }
  };

  const addSubWorkType = async () => {
    if (isCreating.value) return;
    const name = newSubWorkTypeName.value.trim();
    if (!name || !selectedWorkTypeId.value) return;

    isCreating.value = true;
    try {
      const result = await referenceApi.createSubWorkType(selectedWorkTypeId.value, name);
      newSubWorkTypeName.value = "";
      await loadSubWorkTypes(selectedWorkTypeId.value);
      selectSubWorkType(result.id);
      analyticsClient.trackAction("admin_master_data", "create_sub_work_type", "success");
    } catch (error: unknown) {
      console.error("SubWorkType 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_sub_work_type", "fail");
      alert((error as Error).message);
    } finally {
      isCreating.value = false;
    }
  };

  const deleteDivision = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteDivision(id);
      if (selectedDivisionId.value === id) {
        selectedDivisionId.value = null;
        selectedWorkTypeId.value = null;
        selectedSubWorkTypeId.value = null;
        workTypes.value = [];
        subWorkTypes.value = [];
      }
      divisions.value = divisions.value.filter((d) => d.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_division", "success");
    } catch (error: unknown) {
      console.error("Division 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_division", "fail");
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  const deleteWorkType = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteWorkType(id);
      if (selectedWorkTypeId.value === id) {
        selectedWorkTypeId.value = null;
        selectedSubWorkTypeId.value = null;
        subWorkTypes.value = [];
      }
      workTypes.value = workTypes.value.filter((wt) => wt.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_work_type", "success");
    } catch (error: unknown) {
      console.error("WorkType 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_work_type", "fail");
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  const deleteSubWorkType = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteSubWorkType(id);
      if (selectedSubWorkTypeId.value === id) {
        selectedSubWorkTypeId.value = null;
      }
      subWorkTypes.value = subWorkTypes.value.filter((swt) => swt.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_sub_work_type", "success");
    } catch (error: unknown) {
      console.error("SubWorkType 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_sub_work_type", "fail");
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  const updateDivisionName = async (id: number, name: string) => {
    try {
      await referenceApi.updateDivision({ id, name });
      const item = divisions.value.find((d) => d.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_master_data", "update_division", "success");
    } catch (error: unknown) {
      console.error("Division 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_division", "fail");
      alert((error as Error).message);
      await loadDivisions();
    }
  };

  const updateWorkTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateWorkType({ id, name });
      const item = workTypes.value.find((wt) => wt.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_master_data", "update_work_type", "success");
    } catch (error: unknown) {
      console.error("WorkType 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_work_type", "fail");
      alert((error as Error).message);
      if (selectedDivisionId.value) await loadWorkTypes(selectedDivisionId.value);
    }
  };

  const updateSubWorkTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateSubWorkType({ id, name });
      const item = subWorkTypes.value.find((swt) => swt.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_master_data", "update_sub_work_type", "success");
    } catch (error: unknown) {
      console.error("SubWorkType 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_sub_work_type", "fail");
      alert((error as Error).message);
      if (selectedWorkTypeId.value) await loadSubWorkTypes(selectedWorkTypeId.value);
    }
  };

  const reorderDivisions = async (ids: number[]) => {
    try {
      await referenceApi.updateDivision({ ids });
      await loadDivisions();
    } catch (error: unknown) {
      console.error("Division 정렬 실패:", error);
      alert((error as Error).message);
      await loadDivisions();
    }
  };

  const reorderWorkTypes = async (ids: number[]) => {
    if (!selectedDivisionId.value) return;
    try {
      await referenceApi.updateWorkType({ ids, parentId: selectedDivisionId.value });
      await loadWorkTypes(selectedDivisionId.value);
    } catch (error: unknown) {
      console.error("WorkType 정렬 실패:", error);
      alert((error as Error).message);
      if (selectedDivisionId.value) await loadWorkTypes(selectedDivisionId.value);
    }
  };

  const reorderSubWorkTypes = async (ids: number[]) => {
    if (!selectedWorkTypeId.value) return;
    try {
      await referenceApi.updateSubWorkType({ ids, parentId: selectedWorkTypeId.value });
      await loadSubWorkTypes(selectedWorkTypeId.value);
    } catch (error: unknown) {
      console.error("SubWorkType 정렬 실패:", error);
      alert((error as Error).message);
      if (selectedWorkTypeId.value) await loadSubWorkTypes(selectedWorkTypeId.value);
    }
  };

  watch(selectedDivisionId, (id) => {
    workTypes.value = [];
    if (id) loadWorkTypes(id);
  });

  watch(selectedWorkTypeId, (id) => {
    subWorkTypes.value = [];
    if (id) loadSubWorkTypes(id);
  });

  return {
    divisions,
    workTypes,
    subWorkTypes,
    selectedDivisionId,
    selectedWorkTypeId,
    selectedSubWorkTypeId,
    newDivisionName,
    newWorkTypeName,
    newSubWorkTypeName,
    isCreating,
    isDeleting,
    loadDivisions,
    selectDivision,
    selectWorkType,
    selectSubWorkType,
    addDivision,
    addWorkType,
    addSubWorkType,
    deleteDivision,
    deleteWorkType,
    deleteSubWorkType,
    updateDivisionName,
    updateWorkTypeName,
    updateSubWorkTypeName,
    reorderDivisions,
    reorderWorkTypes,
    reorderSubWorkTypes,
  };
}
