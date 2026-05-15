import { ref } from "vue";

import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type {
  CompanyRole,
  SystemRole,
} from "@/features/system-admin/model/system-admin.types";

export function useRoleManagement() {
  const systemRoles = ref<SystemRole[]>([]);
  const isLoadingSystemRoles = ref(false);
  const isCreatingSystemRole = ref(false);
  const newSystemRoleName = ref("");

  const companyRoles = ref<CompanyRole[]>([]);
  const isLoadingCompanyRoles = ref(false);
  const isCreatingCompanyRole = ref(false);
  const newCompanyRoleName = ref("");

  const loadSystemRoles = async () => {
    isLoadingSystemRoles.value = true;
    try {
      systemRoles.value = await systemAdminApi.getSystemRoleList();
    } catch (error) {
      console.error("시스템 역할 목록 조회 실패:", error);
    } finally {
      isLoadingSystemRoles.value = false;
    }
  };

  const createSystemRole = async () => {
    if (isCreatingSystemRole.value || !newSystemRoleName.value.trim()) return;
    isCreatingSystemRole.value = true;
    try {
      await systemAdminApi.createSystemRole(newSystemRoleName.value.trim());
      newSystemRoleName.value = "";
      await loadSystemRoles();
    } catch (error: unknown) {
      console.error("시스템 역할 생성 실패:", error);
      alert((error as Error).message);
    } finally {
      isCreatingSystemRole.value = false;
    }
  };

  const loadCompanyRoles = async () => {
    isLoadingCompanyRoles.value = true;
    try {
      companyRoles.value = await systemAdminApi.getCompanyRoleList();
    } catch (error) {
      console.error("회사 역할 목록 조회 실패:", error);
    } finally {
      isLoadingCompanyRoles.value = false;
    }
  };

  const createCompanyRole = async () => {
    if (isCreatingCompanyRole.value || !newCompanyRoleName.value.trim()) return;
    isCreatingCompanyRole.value = true;
    try {
      await systemAdminApi.createCompanyRole(newCompanyRoleName.value.trim());
      newCompanyRoleName.value = "";
      await loadCompanyRoles();
    } catch (error: unknown) {
      console.error("회사 역할 생성 실패:", error);
      alert((error as Error).message);
    } finally {
      isCreatingCompanyRole.value = false;
    }
  };

  const loadAllRoles = async () => {
    await Promise.all([loadSystemRoles(), loadCompanyRoles()]);
  };

  return {
    systemRoles,
    isLoadingSystemRoles,
    isCreatingSystemRole,
    newSystemRoleName,
    loadSystemRoles,
    createSystemRole,
    companyRoles,
    isLoadingCompanyRoles,
    isCreatingCompanyRole,
    newCompanyRoleName,
    loadCompanyRoles,
    createCompanyRole,
    loadAllRoles,
  };
}
