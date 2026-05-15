import { ref } from "vue";

import {
  referenceApi,
  type IdNameResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

export function useLocationMaster() {
  const zones = ref<IdNameResponse[]>([]);
  const floors = ref<IdNameResponse[]>([]);

  const newZone = ref("");
  const newFloor = ref("");

  const isCreating = ref<Record<string, boolean>>({
    zone: false,
    floor: false,
  });

  const isDeleting = ref<Record<string, boolean>>({
    zone: false,
    floor: false,
  });

  const loadZones = async () => {
    try {
      zones.value = await referenceApi.getZoneList();
    } catch (error) {
      console.error("Zone 목록 로드 실패:", error);
    }
  };

  const loadFloors = async () => {
    try {
      floors.value = await referenceApi.getFloorList();
    } catch (error) {
      console.error("Floor 목록 로드 실패:", error);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadZones(), loadFloors()]);
  };

  const addZone = async () => {
    if (isCreating.value.zone) return;
    const name = newZone.value.trim();
    if (!name) return;

    isCreating.value.zone = true;
    try {
      await referenceApi.createZone(name);
      newZone.value = "";
      await loadZones();
      analyticsClient.trackAction("admin_master_data", "create_zone", "success");
    } catch (error: unknown) {
      console.error("Zone 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_zone", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isCreating.value.zone = false;
    }
  };

  const addFloor = async () => {
    if (isCreating.value.floor) return;
    const name = newFloor.value.trim();
    if (!name) return;

    isCreating.value.floor = true;
    try {
      await referenceApi.createFloor(name);
      newFloor.value = "";
      await loadFloors();
      analyticsClient.trackAction("admin_master_data", "create_floor", "success");
    } catch (error: unknown) {
      console.error("Floor 추가 실패:", error);
      analyticsClient.trackAction("admin_master_data", "create_floor", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isCreating.value.floor = false;
    }
  };

  const deleteZone = async (id: number) => {
    if (isDeleting.value.zone) return;
    isDeleting.value.zone = true;
    try {
      await referenceApi.deleteZone(id);
      zones.value = zones.value.filter((z) => z.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_zone", "success");
    } catch (error: unknown) {
      console.error("Zone 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_zone", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isDeleting.value.zone = false;
    }
  };

  const deleteFloor = async (id: number) => {
    if (isDeleting.value.floor) return;
    isDeleting.value.floor = true;
    try {
      await referenceApi.deleteFloor(id);
      floors.value = floors.value.filter((f) => f.id !== id);
      analyticsClient.trackAction("admin_master_data", "delete_floor", "success");
    } catch (error: unknown) {
      console.error("Floor 삭제 실패:", error);
      analyticsClient.trackAction("admin_master_data", "delete_floor", "fail");
      const err = error as { message?: string };
      alert(err.message);
    } finally {
      isDeleting.value.floor = false;
    }
  };

  const updateZoneName = async (id: number, name: string) => {
    try {
      await referenceApi.updateZone({ id, name });
      const item = zones.value.find((z) => z.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_master_data", "update_zone", "success");
    } catch (error: unknown) {
      console.error("Zone 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_zone", "fail");
      const err = error as { message?: string };
      alert(err.message);
      await loadZones();
    }
  };

  const updateFloorName = async (id: number, name: string) => {
    try {
      await referenceApi.updateFloor({ id, name });
      const item = floors.value.find((f) => f.id === id);
      if (item) item.name = name;
      analyticsClient.trackAction("admin_master_data", "update_floor", "success");
    } catch (error: unknown) {
      console.error("Floor 이름 수정 실패:", error);
      analyticsClient.trackAction("admin_master_data", "update_floor", "fail");
      const err = error as { message?: string };
      alert(err.message);
      await loadFloors();
    }
  };

  const reorderZones = async (ids: number[]) => {
    try {
      await referenceApi.updateZone({ ids });
      await loadZones();
    } catch (error: unknown) {
      console.error("Zone 정렬 실패:", error);
      const err = error as { message?: string };
      alert(err.message);
      await loadZones();
    }
  };

  const reorderFloors = async (ids: number[]) => {
    try {
      await referenceApi.updateFloor({ ids });
      await loadFloors();
    } catch (error: unknown) {
      console.error("Floor 정렬 실패:", error);
      const err = error as { message?: string };
      alert(err.message);
      await loadFloors();
    }
  };

  return {
    zones,
    floors,
    newZone,
    newFloor,
    isCreating,
    isDeleting,
    loadAll,
    addZone,
    addFloor,
    deleteZone,
    deleteFloor,
    updateZoneName,
    updateFloorName,
    reorderZones,
    reorderFloors,
  };
}
