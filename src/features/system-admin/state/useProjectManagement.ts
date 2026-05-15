import { ref } from "vue";

import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type {
  CreateProjectPayload,
  Project,
  UpdateProjectPayload,
} from "@/features/system-admin/model/system-admin.types";

export function useProjectManagement() {
  const projects = ref<Project[]>([]);
  const isLoading = ref(false);
  const isCreating = ref(false);
  const isUpdating = ref(false);
  const isDeleting = ref(false);

  const loadProjects = async () => {
    isLoading.value = true;
    try {
      projects.value = await systemAdminApi.getProjectList();
    } catch (error) {
      console.error("프로젝트 목록 조회 실패:", error);
    } finally {
      isLoading.value = false;
    }
  };

  const createProject = async (payload: CreateProjectPayload) => {
    if (isCreating.value) return false;
    isCreating.value = true;
    try {
      await systemAdminApi.createProject(payload);
      await loadProjects();
      return true;
    } catch (error: unknown) {
      console.error("프로젝트 생성 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isCreating.value = false;
    }
  };

  const updateProject = async (id: string, payload: UpdateProjectPayload) => {
    if (isUpdating.value) return false;
    isUpdating.value = true;
    try {
      await systemAdminApi.updateProject(id, payload);
      await loadProjects();
      return true;
    } catch (error: unknown) {
      console.error("프로젝트 수정 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isUpdating.value = false;
    }
  };

  const deleteProject = async (id: string) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await systemAdminApi.deleteProject(id);
      await loadProjects();
    } catch (error: unknown) {
      console.error("프로젝트 삭제 실패:", error);
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  return {
    projects,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
