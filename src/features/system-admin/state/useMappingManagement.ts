import { ref, watch } from "vue";

import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type {
  Company,
  CompanyRole,
  CompanyToProject,
  CreateCompanyToProjectPayload,
  CreateUserToProjectPayload,
  Project,
  SystemRole,
  UpdateCompanyToProjectPayload,
  UpdateUserToProjectPayload,
  User,
  UserToProject,
  WorkType,
} from "@/features/system-admin/model/system-admin.types";

export function useMappingManagement() {
  const companies = ref<Company[]>([]);
  const projects = ref<Project[]>([]);
  const companyRoles = ref<CompanyRole[]>([]);
  const systemRoles = ref<SystemRole[]>([]);
  const workTypes = ref<WorkType[]>([]);
  const users = ref<User[]>([]);
  const isLoadingWorkTypes = ref(false);

  const companyToProjectList = ref<CompanyToProject[]>([]);
  const isLoadingCompanyToProject = ref(false);
  const isCreatingCompanyToProject = ref(false);
  const isDeletingCompanyToProject = ref(false);
  const companyToProjectFilter = ref<{ projectId?: string; companyId?: string }>({});

  const isUpdatingCompanyToProject = ref(false);

  const userToProjectList = ref<UserToProject[]>([]);
  const isLoadingUserToProject = ref(false);
  const isCreatingUserToProject = ref(false);
  const isDeletingUserToProject = ref(false);
  const isUpdatingUserToProject = ref(false);
  const userToProjectFilter = ref<{ projectId?: string; userId?: string }>({});

  const loadLookupData = async () => {
    try {
      const [companiesData, projectsData, companyRolesData, systemRolesData, usersData] =
        await Promise.all([
          systemAdminApi.getCompanyList(),
          systemAdminApi.getProjectList(),
          systemAdminApi.getCompanyRoleList(),
          systemAdminApi.getSystemRoleList(),
          systemAdminApi.getUserList(),
        ]);
      companies.value = companiesData;
      projects.value = projectsData;
      companyRoles.value = companyRolesData;
      systemRoles.value = systemRolesData;
      users.value = usersData;
    } catch (error) {
      console.error("조회 데이터 로드 실패:", error);
    }
  };

  const loadWorkTypes = async (projectId: string) => {
    if (!projectId || projectId === "__all__") {
      workTypes.value = [];
      return;
    }
    isLoadingWorkTypes.value = true;
    try {
      workTypes.value = await systemAdminApi.getWorkTypeList(projectId);
    } catch (error) {
      console.error("공종 목록 로드 실패:", error);
      workTypes.value = [];
    } finally {
      isLoadingWorkTypes.value = false;
    }
  };

  const loadCompanyToProjectList = async () => {
    isLoadingCompanyToProject.value = true;
    try {
      const params: { projectId?: string; companyId?: string } = {};
      if (
        companyToProjectFilter.value.projectId &&
        companyToProjectFilter.value.projectId !== "__all__"
      ) {
        params.projectId = companyToProjectFilter.value.projectId;
      }
      if (
        companyToProjectFilter.value.companyId &&
        companyToProjectFilter.value.companyId !== "__all__"
      ) {
        params.companyId = companyToProjectFilter.value.companyId;
      }
      companyToProjectList.value = await systemAdminApi.getCompanyToProjectList(
        Object.keys(params).length > 0 ? params : undefined,
      );
    } catch (error) {
      console.error("회사-프로젝트 매핑 조회 실패:", error);
    } finally {
      isLoadingCompanyToProject.value = false;
    }
  };

  const createCompanyToProject = async (payload: CreateCompanyToProjectPayload) => {
    if (isCreatingCompanyToProject.value) return false;
    isCreatingCompanyToProject.value = true;
    try {
      await systemAdminApi.createCompanyToProject(payload);
      await loadCompanyToProjectList();
      return true;
    } catch (error: unknown) {
      console.error("회사-프로젝트 매핑 생성 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isCreatingCompanyToProject.value = false;
    }
  };

  const updateCompanyToProject = async (id: number, payload: UpdateCompanyToProjectPayload) => {
    if (isUpdatingCompanyToProject.value) return false;
    isUpdatingCompanyToProject.value = true;
    try {
      await systemAdminApi.updateCompanyToProject(id, payload);
      await loadCompanyToProjectList();
      return true;
    } catch (error: unknown) {
      console.error("회사-프로젝트 매핑 수정 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isUpdatingCompanyToProject.value = false;
    }
  };

  const loadUserToProjectList = async () => {
    isLoadingUserToProject.value = true;
    try {
      const params: { projectId?: string; userId?: string } = {};
      if (
        userToProjectFilter.value.projectId &&
        userToProjectFilter.value.projectId !== "__all__"
      ) {
        params.projectId = userToProjectFilter.value.projectId;
      }
      if (userToProjectFilter.value.userId && userToProjectFilter.value.userId !== "__all__") {
        params.userId = userToProjectFilter.value.userId;
      }
      userToProjectList.value = await systemAdminApi.getUserToProjectList(
        Object.keys(params).length > 0 ? params : undefined,
      );
    } catch (error) {
      console.error("사용자-프로젝트 매핑 조회 실패:", error);
    } finally {
      isLoadingUserToProject.value = false;
    }
  };

  const createUserToProject = async (payload: CreateUserToProjectPayload) => {
    if (isCreatingUserToProject.value) return false;
    isCreatingUserToProject.value = true;
    try {
      await systemAdminApi.createUserToProject(payload);
      await loadUserToProjectList();
      return true;
    } catch (error: unknown) {
      console.error("사용자-프로젝트 매핑 생성 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isCreatingUserToProject.value = false;
    }
  };

  const updateUserToProject = async (id: number, payload: UpdateUserToProjectPayload) => {
    if (isUpdatingUserToProject.value) return false;
    isUpdatingUserToProject.value = true;
    try {
      await systemAdminApi.updateUserToProject(id, payload);
      await loadUserToProjectList();
      return true;
    } catch (error: unknown) {
      console.error("사용자-프로젝트 매핑 수정 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isUpdatingUserToProject.value = false;
    }
  };

  const deleteCompanyToProject = async (id: number) => {
    if (isDeletingCompanyToProject.value) return;
    isDeletingCompanyToProject.value = true;
    try {
      await systemAdminApi.deleteCompanyToProject(id);
      await loadCompanyToProjectList();
    } catch (error: unknown) {
      console.error("회사-프로젝트 매핑 삭제 실패:", error);
      alert((error as Error).message);
    } finally {
      isDeletingCompanyToProject.value = false;
    }
  };

  const deleteUserToProject = async (id: number) => {
    if (isDeletingUserToProject.value) return;
    isDeletingUserToProject.value = true;
    try {
      await systemAdminApi.deleteUserToProject(id);
      await loadUserToProjectList();
    } catch (error: unknown) {
      console.error("사용자-프로젝트 매핑 삭제 실패:", error);
      alert((error as Error).message);
    } finally {
      isDeletingUserToProject.value = false;
    }
  };

  watch(companyToProjectFilter, () => loadCompanyToProjectList(), { deep: true });
  watch(userToProjectFilter, () => loadUserToProjectList(), { deep: true });

  const loadAll = async () => {
    await loadLookupData();
    await Promise.all([loadCompanyToProjectList(), loadUserToProjectList()]);
  };

  return {
    companies,
    projects,
    companyRoles,
    systemRoles,
    workTypes,
    users,
    isLoadingWorkTypes,
    loadWorkTypes,
    companyToProjectList,
    isLoadingCompanyToProject,
    isCreatingCompanyToProject,
    isDeletingCompanyToProject,
    isUpdatingCompanyToProject,
    companyToProjectFilter,
    loadCompanyToProjectList,
    createCompanyToProject,
    updateCompanyToProject,
    deleteCompanyToProject,
    userToProjectList,
    isLoadingUserToProject,
    isCreatingUserToProject,
    isDeletingUserToProject,
    isUpdatingUserToProject,
    userToProjectFilter,
    loadUserToProjectList,
    createUserToProject,
    updateUserToProject,
    deleteUserToProject,
    loadLookupData,
    loadAll,
  };
}
