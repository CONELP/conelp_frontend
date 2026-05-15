import { ref } from "vue";

import {
  referenceApi,
  type ComponentTypeResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

export function useComponentTypeMaster() {
  const componentTypes = ref<ComponentTypeResponse[]>([]);
  const newComponentTypeName = ref("");
  const isCreating = ref(false);
  const isDeleting = ref(false);

  const loadComponentTypes = async () => {
    try {
      componentTypes.value = await referenceApi.getComponentTypeList();
    } catch (error) {
      console.error("ComponentType 목록 로드 실패:", error);
      componentTypes.value = [];
    }
  };

  const addComponentType = async () => {
    if (isCreating.value) return;
    const name = newComponentTypeName.value.trim();
    if (!name) return;

    isCreating.value = true;
    try {
      await referenceApi.createComponentType(name);
      newComponentTypeName.value = "";
      await loadComponentTypes();
      analyticsClient.trackAction("system_admin", "create_component_type", "success");
    } catch (error: unknown) {
      console.error("ComponentType 추가 실패:", error);
      analyticsClient.trackAction("system_admin", "create_component_type", "fail");
      alert((error as Error).message);
    } finally {
      isCreating.value = false;
    }
  };

  const deleteComponentType = async (id: number) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await referenceApi.deleteComponentType(id);
      componentTypes.value = componentTypes.value.filter((ct) => ct.id !== id);
      analyticsClient.trackAction("system_admin", "delete_component_type", "success");
    } catch (error: unknown) {
      console.error("ComponentType 삭제 실패:", error);
      analyticsClient.trackAction("system_admin", "delete_component_type", "fail");
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  const updateComponentTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateComponentType({ id, name });
      const item = componentTypes.value.find((ct) => ct.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("system_admin", "update_component_type", "success");
    } catch (error: unknown) {
      console.error("ComponentType 이름 수정 실패:", error);
      analyticsClient.trackAction("system_admin", "update_component_type", "fail");
      alert((error as Error).message);
      await loadComponentTypes();
    }
  };

  const reorderComponentTypes = async (ids: number[]) => {
    try {
      await referenceApi.updateComponentType({ ids });
      await loadComponentTypes();
    } catch (error: unknown) {
      console.error("ComponentType 정렬 실패:", error);
      alert((error as Error).message);
      await loadComponentTypes();
    }
  };

  return {
    componentTypes,
    newComponentTypeName,
    isCreating,
    isDeleting,
    loadComponentTypes,
    addComponentType,
    deleteComponentType,
    updateComponentTypeName,
    reorderComponentTypes,
  };
}
