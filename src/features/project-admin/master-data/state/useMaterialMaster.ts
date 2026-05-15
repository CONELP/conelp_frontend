import { ref, watch } from "vue";

import {
  referenceApi,
  type MaterialSpecResponse,
  type MaterialTypeResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

export function useMaterialMaster() {
  const materialTypes = ref<MaterialTypeResponse[]>([]);
  const materialSpecs = ref<MaterialSpecResponse[]>([]);

  const selectedMaterialTypeId = ref<number | null>(null);

  const newMaterialTypeName = ref("");
  const newMaterialTypeUnit = ref("");
  const newMaterialSpecName = ref("");

  const isCreating = ref(false);
  const isDeleting = ref(false);

  const loadMaterialTypes = async () => {
    try {
      materialTypes.value = await referenceApi.getMaterialTypeList();
    } catch (error) {
      console.error("MaterialType 목록 로드 실패:", error);
    }
  };

  const loadMaterialSpecs = async (materialTypeId: number) => {
    try {
      materialSpecs.value = await referenceApi.getMaterialSpecList(materialTypeId);
    } catch (error) {
      console.error("MaterialSpec 목록 로드 실패:", error);
    }
  };

  const selectMaterialType = (id: number) => {
    selectedMaterialTypeId.value = id;
  };

  const addMaterialType = async () => {
    if (isCreating.value) return;
    const name = newMaterialTypeName.value.trim();
    if (!name) return;

    isCreating.value = true;
    try {
      const unit = newMaterialTypeUnit.value.trim() || undefined;
      const result = await referenceApi.createMaterialType(name, unit);
      newMaterialTypeName.value = "";
      newMaterialTypeUnit.value = "";
      await loadMaterialTypes();
      selectMaterialType(result.id);
      analyticsClient.trackAction("admin_master_data", "create_material_type", "success");
    } catch (error: unknown) {
      console.error("MaterialType 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_material_type", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isCreating.value = false;
    }
  };

  const addMaterialSpec = async () => {
    if (isCreating.value) return;
    const name = newMaterialSpecName.value.trim();
    if (!name || !selectedMaterialTypeId.value) return;

    isCreating.value = true;
    try {
      await referenceApi.createMaterialSpec(selectedMaterialTypeId.value, name);
      newMaterialSpecName.value = "";
      await loadMaterialSpecs(selectedMaterialTypeId.value);
      analyticsClient.trackAction("admin_master_data", "create_material_spec", "success");
    } catch (error: unknown) {
      console.error("MaterialSpec 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_material_spec", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isCreating.value = false;
    }
  };

  const deleteMaterialType = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteMaterialType(id);
      if (selectedMaterialTypeId.value === id) {
        selectedMaterialTypeId.value = null;
        materialSpecs.value = [];
      }
      materialTypes.value = materialTypes.value.filter((mt) => mt.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_material_type", "success");
    } catch (error: unknown) {
      console.error("MaterialType 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_material_type", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isDeleting.value = false;
    }
  };

  const deleteMaterialSpec = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteMaterialSpec(id);
      materialSpecs.value = materialSpecs.value.filter((ms) => ms.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_material_spec", "success");
    } catch (error: unknown) {
      console.error("MaterialSpec 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_material_spec", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isDeleting.value = false;
    }
  };

  const updateMaterialType = async (id: number, name: string, unit?: string) => {
    try {
      await referenceApi.updateMaterialType({ id, name, unit });
      const item = materialTypes.value.find((mt) => mt.id === id);
      if (item) {
        item.name = name;
        if (unit !== undefined) item.unit = unit;
      }
      analyticsClient.trackAction("admin_master_data", "update_material_type", "success");
    } catch (error: unknown) {
      console.error("MaterialType 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_material_type", "fail");
      const err = error as { message?: string };
      alert(err.message);
      await loadMaterialTypes();
    }
  };

  const updateMaterialSpecName = async (id: number, name: string) => {
    try {
      await referenceApi.updateMaterialSpec({ id, name });
      const item = materialSpecs.value.find((ms) => ms.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_master_data", "update_material_spec", "success");
    } catch (error: unknown) {
      console.error("MaterialSpec 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_material_spec", "fail");
      const err = error as { message?: string };
      alert(err.message);
      if (selectedMaterialTypeId.value) await loadMaterialSpecs(selectedMaterialTypeId.value);
    }
  };

  const reorderMaterialTypes = async (ids: number[]) => {
    try {
      await referenceApi.updateMaterialType({ ids });
      await loadMaterialTypes();
    } catch (error: unknown) {
      console.error("MaterialType 정렬 실패:", error);
      const err = error as { message?: string };
      alert(err.message);
      await loadMaterialTypes();
    }
  };

  const reorderMaterialSpecs = async (ids: number[]) => {
    if (!selectedMaterialTypeId.value) return;
    try {
      await referenceApi.updateMaterialSpec({ ids, parentId: selectedMaterialTypeId.value });
      await loadMaterialSpecs(selectedMaterialTypeId.value);
    } catch (error: unknown) {
      console.error("MaterialSpec 정렬 실패:", error);
      const err = error as { message?: string };
      alert(err.message);
      if (selectedMaterialTypeId.value) await loadMaterialSpecs(selectedMaterialTypeId.value);
    }
  };

  watch(selectedMaterialTypeId, (id) => {
    materialSpecs.value = [];
    if (id) {
      loadMaterialSpecs(id);
    }
  });

  return {
    materialTypes,
    materialSpecs,
    selectedMaterialTypeId,
    newMaterialTypeName,
    newMaterialTypeUnit,
    newMaterialSpecName,
    isCreating,
    isDeleting,
    loadMaterialTypes,
    selectMaterialType,
    addMaterialType,
    addMaterialSpec,
    deleteMaterialType,
    deleteMaterialSpec,
    updateMaterialType,
    updateMaterialSpecName,
    reorderMaterialTypes,
    reorderMaterialSpecs,
  };
}
