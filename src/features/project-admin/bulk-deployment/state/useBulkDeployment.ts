import { computed, ref } from "vue";

import {
  referenceApi,
  type EquipmentSpecResponse,
  type LaborTypeResponse,
} from "@/features/project-admin/_shared/services/reference.api";
import { projectApi } from "@/features/project-admin/_shared/services/project.api";
import { bulkDeploymentApi } from "@/features/project-admin/bulk-deployment/services/bulk-deployment.api";

export interface AttendanceLaborRow {
  laborTypeId: number;
  laborTypeName: string;
  totalCount: number;
}

export interface AttendanceBox {
  id: number;
  workTypeId: number | null;
  workTypeName: string;
  laborRows: AttendanceLaborRow[];
}

export interface EquipmentRow {
  id: number;
  equipmentSpecId: number | null;
  workTypeId: number | null;
  totalCount: number;
}

function readSelectedProjectId(): string | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem("selectedProjectId");
  if (!v || v === "undefined" || v === "null") return null;
  return v;
}

export function useBulkDeployment() {
  const startDate = ref("");
  const endDate = ref("");
  const isSubmittingAttendance = ref(false);
  const isSubmittingEquipment = ref(false);

  const laborTypes = ref<LaborTypeResponse[]>([]);
  const equipmentSpecs = ref<EquipmentSpecResponse[]>([]);
  const workTypes = ref<{ id: number; name: string }[]>([]);

  let nextAttendanceId = 1;
  let nextEquipmentId = 1;
  const attendanceBoxes = ref<AttendanceBox[]>([
    { id: nextAttendanceId++, workTypeId: null, workTypeName: "", laborRows: [] },
  ]);
  const equipmentRows = ref<EquipmentRow[]>([
    { id: nextEquipmentId++, equipmentSpecId: null, workTypeId: null, totalCount: 0 },
  ]);

  const laborTypesByWorkType = computed(() => {
    const map = new Map<
      number,
      { workTypeId: number; workTypeName: string; laborTypes: LaborTypeResponse[] }
    >();
    for (const lt of laborTypes.value) {
      if (lt.workTypeId === null) {
        continue;
      }

      if (!map.has(lt.workTypeId)) {
        map.set(lt.workTypeId, {
          workTypeId: lt.workTypeId,
          workTypeName: lt.workTypeName ?? "",
          laborTypes: [],
        });
      }
      map.get(lt.workTypeId)!.laborTypes.push(lt);
    }
    return Array.from(map.values());
  });

  const canSubmitAttendance = computed(() => {
    if (!startDate.value || !endDate.value) return false;
    return attendanceBoxes.value.some(
      (box) => box.workTypeId !== null && box.laborRows.some((r) => r.totalCount > 0),
    );
  });

  const canSubmitEquipment = computed(() => {
    if (!startDate.value || !endDate.value) return false;
    return equipmentRows.value.some(
      (r) => r.equipmentSpecId !== null && r.workTypeId !== null && r.totalCount > 0,
    );
  });

  async function initDates() {
    try {
      const selectedId = readSelectedProjectId();
      const projects = await projectApi.getProjects();
      const project = projects.find((p) => p.id === selectedId) ?? projects[0];
      if (project) {
        startDate.value = project.startDate;
        endDate.value = project.completionDate;
      }
    } catch (error) {
      console.error("프로젝트 날짜 초기화 실패:", error);
    }
  }

  async function loadReferenceData() {
    try {
      const [laborRes, equipRes] = await Promise.all([
        referenceApi.getLaborTypeList(),
        referenceApi.getEquipmentSpecList(),
      ]);
      laborTypes.value = laborRes;
      equipmentSpecs.value = equipRes;

      const wtMap = new Map<number, { id: number; name: string }>();
      laborRes.forEach((lt) => {
        if (lt.workTypeId === null) {
          return;
        }

        if (!wtMap.has(lt.workTypeId)) {
          wtMap.set(lt.workTypeId, { id: lt.workTypeId, name: lt.workTypeName ?? "" });
        }
      });
      workTypes.value = Array.from(wtMap.values());
    } catch (error: unknown) {
      console.error("참조 데이터 로드 실패:", error);
      alert((error as Error).message);
    }
  }

  function addAttendanceBox() {
    attendanceBoxes.value = [
      ...attendanceBoxes.value,
      { id: nextAttendanceId++, workTypeId: null, workTypeName: "", laborRows: [] },
    ];
  }

  function removeAttendanceBox(id: number) {
    if (attendanceBoxes.value.length <= 1) return;
    attendanceBoxes.value = attendanceBoxes.value.filter((b) => b.id !== id);
  }

  function selectWorkType(boxId: number, workTypeId: number) {
    const group = laborTypesByWorkType.value.find((g) => g.workTypeId === workTypeId);
    if (!group) return;
    attendanceBoxes.value = attendanceBoxes.value.map((box) => {
      if (box.id !== boxId) return box;
      return {
        ...box,
        workTypeId,
        workTypeName: group.workTypeName,
        laborRows: group.laborTypes.map((lt) => ({
          laborTypeId: lt.id,
          laborTypeName: lt.name,
          totalCount: 0,
        })),
      };
    });
  }

  function addEquipmentRow() {
    equipmentRows.value = [
      ...equipmentRows.value,
      { id: nextEquipmentId++, equipmentSpecId: null, workTypeId: null, totalCount: 0 },
    ];
  }

  function removeEquipmentRow(id: number) {
    if (equipmentRows.value.length <= 1) return;
    equipmentRows.value = equipmentRows.value.filter((r) => r.id !== id);
  }

  async function submitAttendance() {
    if (!canSubmitAttendance.value) return;

    const entries = attendanceBoxes.value
      .filter((box) => box.workTypeId !== null)
      .flatMap((box) =>
        box.laborRows
          .filter((r) => r.totalCount > 0)
          .map((r) => ({ laborTypeId: r.laborTypeId, totalCount: r.totalCount })),
      );

    isSubmittingAttendance.value = true;
    try {
      await bulkDeploymentApi.createBulkAttendance({
        startDate: startDate.value,
        endDate: endDate.value,
        entries,
      });
      alert("출역 대량 입력이 완료되었습니다.");
      attendanceBoxes.value = [
        { id: nextAttendanceId++, workTypeId: null, workTypeName: "", laborRows: [] },
      ];
    } catch (error: unknown) {
      console.error("출역 대량 입력 실패:", error);
      alert((error as Error).message);
    } finally {
      isSubmittingAttendance.value = false;
    }
  }

  async function submitEquipment() {
    if (!canSubmitEquipment.value) return;

    const entries = equipmentRows.value
      .filter((r) => r.equipmentSpecId !== null && r.workTypeId !== null && r.totalCount > 0)
      .map((r) => ({
        equipmentSpecId: r.equipmentSpecId!,
        workTypeId: r.workTypeId!,
        totalCount: r.totalCount,
      }));

    isSubmittingEquipment.value = true;
    try {
      await bulkDeploymentApi.createBulkEquipment({
        startDate: startDate.value,
        endDate: endDate.value,
        entries,
      });
      alert("장비 대량 입력이 완료되었습니다.");
      equipmentRows.value = [
        { id: nextEquipmentId++, equipmentSpecId: null, workTypeId: null, totalCount: 0 },
      ];
    } catch (error: unknown) {
      console.error("장비 대량 입력 실패:", error);
      alert((error as Error).message);
    } finally {
      isSubmittingEquipment.value = false;
    }
  }

  return {
    startDate,
    endDate,
    isSubmittingAttendance,
    isSubmittingEquipment,
    laborTypes,
    laborTypesByWorkType,
    equipmentSpecs,
    workTypes,
    attendanceBoxes,
    equipmentRows,
    canSubmitAttendance,
    canSubmitEquipment,
    initDates,
    loadReferenceData,
    addAttendanceBox,
    removeAttendanceBox,
    selectWorkType,
    addEquipmentRow,
    removeEquipmentRow,
    submitAttendance,
    submitEquipment,
  };
}
