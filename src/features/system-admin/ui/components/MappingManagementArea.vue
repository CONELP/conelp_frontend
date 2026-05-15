<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import editIcon from "@fluentui/svg-icons/icons/edit_16_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import AdminSelect from "@/shared/ui/admin/Select.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import { useMappingManagement } from "@/features/system-admin/state/useMappingManagement";
import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type {
  CompanyToProject,
  CreateCompanyToProjectPayload,
  CreateUserToProjectPayload,
  UpdateCompanyToProjectPayload,
  UpdateUserToProjectPayload,
  UserToProject,
} from "@/features/system-admin/model/system-admin.types";

const {
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
  createCompanyToProject,
  updateCompanyToProject,
  deleteCompanyToProject,
  userToProjectList,
  isLoadingUserToProject,
  isCreatingUserToProject,
  isDeletingUserToProject,
  isUpdatingUserToProject,
  userToProjectFilter,
  createUserToProject,
  updateUserToProject,
  deleteUserToProject,
  loadAll,
} = useMappingManagement();

const allProjectOption = { value: "__all__", label: "전체" };
const projectFilterOptions = computed(() => [
  allProjectOption,
  ...projects.value.map((p) => ({ value: p.id, label: p.projectName })),
]);
const companyFilterOptions = computed(() => [
  allProjectOption,
  ...companies.value.map((c) => ({ value: c.id, label: c.companyName })),
]);
const projectOptions = computed(() =>
  projects.value.map((p) => ({ value: p.id, label: p.projectName })),
);
const companyOptions = computed(() =>
  companies.value.map((c) => ({ value: c.id, label: c.companyName })),
);
const companyRoleOptions = computed(() =>
  companyRoles.value.map((r) => ({ value: r.id, label: r.name })),
);
const systemRoleOptions = computed(() =>
  systemRoles.value.map((r) => ({ value: r.id, label: r.name })),
);
const workTypeOptions = computed(() =>
  workTypes.value.map((w) => ({ value: w.id, label: w.name })),
);
const userOptions = computed(() =>
  users.value.map((u) => ({ value: u.id, label: `${u.userName} (${u.phoneNumber})` })),
);

const isCompanyToProjectDialogOpen = ref(false);
const companyToProjectForm = ref<CreateCompanyToProjectPayload>({
  companyId: "",
  projectId: "",
  roleId: 0,
  workTypeId: undefined,
});

function resetCompanyToProjectForm() {
  companyToProjectForm.value = {
    companyId: "",
    projectId: "",
    roleId: 0,
    workTypeId: undefined,
  };
}

watch(
  () => companyToProjectForm.value.projectId,
  (projectId) => {
    companyToProjectForm.value.workTypeId = undefined;
    if (projectId) void loadWorkTypes(projectId);
  },
);

async function handleCreateCompanyToProject() {
  if (
    !companyToProjectForm.value.companyId ||
    !companyToProjectForm.value.projectId ||
    !companyToProjectForm.value.roleId
  ) {
    alert("회사, 프로젝트, 역할을 선택해주세요.");
    return;
  }
  const ok = await createCompanyToProject(companyToProjectForm.value);
  if (ok) {
    isCompanyToProjectDialogOpen.value = false;
    resetCompanyToProjectForm();
  }
}

const isEditCompanyToProjectDialogOpen = ref(false);
const editingCompanyToProject = ref<CompanyToProject | null>(null);
const editCompanyToProjectForm = ref<UpdateCompanyToProjectPayload>({
  roleId: 0,
  workTypeId: undefined,
});

function openEditCompanyToProjectDialog(mapping: CompanyToProject) {
  editingCompanyToProject.value = mapping;
  editCompanyToProjectForm.value = {
    roleId: mapping.roleId,
    workTypeId: mapping.workTypeId ?? undefined,
  };
  void loadWorkTypes(mapping.projectId);
  isEditCompanyToProjectDialogOpen.value = true;
}

async function handleUpdateCompanyToProject() {
  if (!editingCompanyToProject.value) return;
  if (!editCompanyToProjectForm.value.roleId) {
    alert("역할을 선택해주세요.");
    return;
  }
  const ok = await updateCompanyToProject(
    editingCompanyToProject.value.id,
    editCompanyToProjectForm.value,
  );
  if (ok) {
    isEditCompanyToProjectDialogOpen.value = false;
    editingCompanyToProject.value = null;
  }
}

const isUserToProjectDialogOpen = ref(false);
const userToProjectForm = ref<CreateUserToProjectPayload>({
  userId: "",
  projectId: "",
  companyToProjectId: 0,
  projectRole: "",
  systemRoleId: 0,
});

function resetUserToProjectForm() {
  userToProjectForm.value = {
    userId: "",
    projectId: "",
    companyToProjectId: 0,
    projectRole: "",
    systemRoleId: 0,
  };
}

const dialogCompanyToProjectList = ref<CompanyToProject[]>([]);
const isLoadingDialogCompanyToProject = ref(false);

async function loadDialogCompanyToProjectList(projectId: string) {
  if (!projectId) {
    dialogCompanyToProjectList.value = [];
    return;
  }
  isLoadingDialogCompanyToProject.value = true;
  try {
    dialogCompanyToProjectList.value = await systemAdminApi.getCompanyToProjectList({ projectId });
  } catch (error) {
    console.error("회사-프로젝트 매핑 (다이얼로그용) 로드 실패:", error);
    dialogCompanyToProjectList.value = [];
  } finally {
    isLoadingDialogCompanyToProject.value = false;
  }
}

const selectedUserCompanyId = computed(() => {
  const u = users.value.find((x) => x.id === userToProjectForm.value.userId);
  return u?.companyId;
});

const editingUserToProject = ref<UserToProject | null>(null);
const editingUserCompanyId = computed(() => {
  const u = editingUserToProject.value
    ? users.value.find((x) => x.id === editingUserToProject.value!.userId)
    : undefined;
  return u?.companyId;
});

const filteredCompanyToProjectForCreate = computed(() =>
  dialogCompanyToProjectList.value.filter(
    (m) => m.projectId === userToProjectForm.value.projectId,
  ),
);

const filteredCompanyToProjectForEdit = computed(() =>
  dialogCompanyToProjectList.value.filter(
    (m) => m.projectId === editingUserToProject.value?.projectId,
  ),
);

const createCompanyToProjectOptions = computed(() =>
  filteredCompanyToProjectForCreate.value.map((m) => ({
    value: m.id,
    label:
      m.companyName + (selectedUserCompanyId.value === m.companyId ? " (사용자 회사)" : ""),
  })),
);
const editCompanyToProjectOptions = computed(() =>
  filteredCompanyToProjectForEdit.value.map((m) => ({
    value: m.id,
    label:
      m.companyName + (editingUserCompanyId.value === m.companyId ? " (사용자 회사)" : ""),
  })),
);

watch(
  () => userToProjectForm.value.projectId,
  async (projectId) => {
    userToProjectForm.value.companyToProjectId = 0;
    if (projectId) {
      await loadDialogCompanyToProjectList(projectId);
      const match = dialogCompanyToProjectList.value.find(
        (m) => m.companyId === selectedUserCompanyId.value,
      );
      if (match) userToProjectForm.value.companyToProjectId = match.id;
    }
  },
);

watch(
  () => userToProjectForm.value.userId,
  () => {
    if (!userToProjectForm.value.projectId) return;
    const match = dialogCompanyToProjectList.value.find(
      (m) => m.companyId === selectedUserCompanyId.value,
    );
    if (match) userToProjectForm.value.companyToProjectId = match.id;
  },
);

async function handleCreateUserToProject() {
  if (
    !userToProjectForm.value.userId ||
    !userToProjectForm.value.projectId ||
    !userToProjectForm.value.companyToProjectId ||
    !userToProjectForm.value.systemRoleId
  ) {
    alert("모든 필수 항목을 입력해주세요.");
    return;
  }
  const ok = await createUserToProject(userToProjectForm.value);
  if (ok) {
    isUserToProjectDialogOpen.value = false;
    resetUserToProjectForm();
  }
}

const isEditUserToProjectDialogOpen = ref(false);
const editUserToProjectForm = ref<UpdateUserToProjectPayload>({
  companyToProjectId: 0,
  projectRole: "",
  systemRoleId: 0,
});

async function openEditUserToProjectDialog(mapping: UserToProject) {
  editingUserToProject.value = mapping;
  editUserToProjectForm.value = {
    companyToProjectId: mapping.companyToProjectId,
    projectRole: mapping.projectRole || "",
    systemRoleId: mapping.systemRoleId,
  };
  await loadDialogCompanyToProjectList(mapping.projectId);
  isEditUserToProjectDialogOpen.value = true;
}

async function handleUpdateUserToProject() {
  if (!editingUserToProject.value) return;
  if (
    !editUserToProjectForm.value.companyToProjectId ||
    !editUserToProjectForm.value.systemRoleId
  ) {
    alert("소속과 시스템 역할을 선택해주세요.");
    return;
  }
  const ok = await updateUserToProject(
    editingUserToProject.value.id,
    editUserToProjectForm.value,
  );
  if (ok) {
    isEditUserToProjectDialogOpen.value = false;
    editingUserToProject.value = null;
  }
}

const showDeleteDialog = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref("");
const deleteAction = ref<((id: number) => Promise<void>) | null>(null);

function openDeleteDialog(id: number, name: string, fn: (id: number) => Promise<void>) {
  deleteTargetId.value = id;
  deleteTargetName.value = name;
  deleteAction.value = fn;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value != null && deleteAction.value) {
    await deleteAction.value(deleteTargetId.value);
  }
}

onMounted(() => {
  void loadAll();
});
</script>

<template>
  <div class="map-area">
    <!-- 사용자-프로젝트 매핑 -->
    <section class="map-area__section">
      <header class="map-area__section-head">
        <h4 class="map-area__title">사용자-프로젝트 매핑</h4>
        <AdminButton @click="isUserToProjectDialogOpen = true">매핑 추가</AdminButton>
      </header>

      <div class="map-area__filters">
        <AdminSelect
          v-model="userToProjectFilter.projectId"
          :options="projectFilterOptions"
          placeholder="프로젝트 필터"
          class="map-area__filter"
        />
      </div>

      <div class="map-area__table-wrap">
        <table class="map-area__table">
          <thead>
            <tr>
              <th class="map-area__th">프로젝트</th>
              <th class="map-area__th">사용자</th>
              <th class="map-area__th">이메일</th>
              <th class="map-area__th">소속회사</th>
              <th class="map-area__th">프로젝트 직책</th>
              <th class="map-area__th">시스템 역할</th>
              <th class="map-area__th map-area__th--actions">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoadingUserToProject">
              <td class="map-area__td map-area__td--empty" colspan="7">로딩 중...</td>
            </tr>
            <tr v-else-if="userToProjectList.length === 0">
              <td class="map-area__td map-area__td--empty" colspan="7">매핑이 없습니다.</td>
            </tr>
            <tr v-for="m in userToProjectList" :key="m.id">
              <td class="map-area__td">{{ m.projectName }}</td>
              <td class="map-area__td">{{ m.userName }}</td>
              <td class="map-area__td">{{ m.userEmail }}</td>
              <td class="map-area__td">{{ m.companyName }}</td>
              <td class="map-area__td">{{ m.projectRole || "-" }}</td>
              <td class="map-area__td">{{ m.systemRoleName }}</td>
              <td class="map-area__td map-area__td--actions">
                <button
                  type="button"
                  class="map-area__icon-btn"
                  aria-label="수정"
                  @click.stop="openEditUserToProjectDialog(m)"
                >
                  <img :src="editIcon" alt="" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="map-area__icon-btn map-area__icon-btn--danger"
                  :disabled="isDeletingUserToProject"
                  aria-label="삭제"
                  @click.stop="
                    openDeleteDialog(
                      m.id,
                      `${m.userName} - ${m.projectName}`,
                      deleteUserToProject,
                    )
                  "
                >
                  <img :src="dismissIcon" alt="" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <hr class="map-area__divider" />

    <!-- 회사-프로젝트 매핑 -->
    <section class="map-area__section">
      <header class="map-area__section-head">
        <h4 class="map-area__title">회사-프로젝트 매핑</h4>
        <AdminButton @click="isCompanyToProjectDialogOpen = true">매핑 추가</AdminButton>
      </header>

      <div class="map-area__filters">
        <AdminSelect
          v-model="companyToProjectFilter.projectId"
          :options="projectFilterOptions"
          placeholder="프로젝트 필터"
          class="map-area__filter"
        />
        <AdminSelect
          v-model="companyToProjectFilter.companyId"
          :options="companyFilterOptions"
          placeholder="회사 필터"
          class="map-area__filter"
        />
      </div>

      <div class="map-area__table-wrap">
        <table class="map-area__table">
          <thead>
            <tr>
              <th class="map-area__th">프로젝트</th>
              <th class="map-area__th">회사</th>
              <th class="map-area__th">역할</th>
              <th class="map-area__th">공종</th>
              <th class="map-area__th map-area__th--actions">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoadingCompanyToProject">
              <td class="map-area__td map-area__td--empty" colspan="5">로딩 중...</td>
            </tr>
            <tr v-else-if="companyToProjectList.length === 0">
              <td class="map-area__td map-area__td--empty" colspan="5">매핑이 없습니다.</td>
            </tr>
            <tr v-for="m in companyToProjectList" :key="m.id">
              <td class="map-area__td">{{ m.projectName }}</td>
              <td class="map-area__td">{{ m.companyName }}</td>
              <td class="map-area__td">{{ m.roleName }}</td>
              <td class="map-area__td">{{ m.workTypeName || "-" }}</td>
              <td class="map-area__td map-area__td--actions">
                <button
                  type="button"
                  class="map-area__icon-btn"
                  aria-label="수정"
                  @click.stop="openEditCompanyToProjectDialog(m)"
                >
                  <img :src="editIcon" alt="" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="map-area__icon-btn map-area__icon-btn--danger"
                  :disabled="isDeletingCompanyToProject"
                  aria-label="삭제"
                  @click.stop="
                    openDeleteDialog(
                      m.id,
                      `${m.companyName} - ${m.projectName}`,
                      deleteCompanyToProject,
                    )
                  "
                >
                  <img :src="dismissIcon" alt="" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 회사-프로젝트 매핑 추가 -->
    <AdminDialog
      :open="isCompanyToProjectDialogOpen"
      title="회사-프로젝트 매핑 추가"
      width="md"
      :close-on-backdrop="false"
      @update:open="isCompanyToProjectDialogOpen = $event"
    >
      <div class="map-area__form">
        <div class="map-area__field">
          <AdminLabel>프로젝트 *</AdminLabel>
          <AdminSelect
            v-model="companyToProjectForm.projectId"
            :options="projectOptions"
            placeholder="프로젝트 선택"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>회사 *</AdminLabel>
          <AdminSelect
            v-model="companyToProjectForm.companyId"
            :options="companyOptions"
            placeholder="회사 선택"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>회사 역할 *</AdminLabel>
          <AdminSelect
            v-model="companyToProjectForm.roleId"
            :options="companyRoleOptions"
            placeholder="역할 선택"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>공종</AdminLabel>
          <AdminSelect
            v-model="companyToProjectForm.workTypeId"
            :options="workTypeOptions"
            :placeholder="isLoadingWorkTypes ? '로딩 중...' : '공종 선택 (선택사항)'"
            :disabled="!companyToProjectForm.projectId || isLoadingWorkTypes"
          />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isCompanyToProjectDialogOpen = false">
          취소
        </AdminButton>
        <AdminButton :disabled="isCreatingCompanyToProject" @click="handleCreateCompanyToProject">
          {{ isCreatingCompanyToProject ? "생성 중..." : "추가" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <!-- 회사-프로젝트 매핑 수정 -->
    <AdminDialog
      :open="isEditCompanyToProjectDialogOpen"
      title="회사-프로젝트 매핑 수정"
      width="md"
      :close-on-backdrop="false"
      @update:open="isEditCompanyToProjectDialogOpen = $event"
    >
      <div class="map-area__form">
        <div class="map-area__field">
          <AdminLabel>프로젝트</AdminLabel>
          <AdminInput :model-value="editingCompanyToProject?.projectName ?? ''" disabled />
        </div>
        <div class="map-area__field">
          <AdminLabel>회사</AdminLabel>
          <AdminInput :model-value="editingCompanyToProject?.companyName ?? ''" disabled />
        </div>
        <div class="map-area__field">
          <AdminLabel>회사 역할 *</AdminLabel>
          <AdminSelect
            v-model="editCompanyToProjectForm.roleId"
            :options="companyRoleOptions"
            placeholder="역할 선택"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>공종</AdminLabel>
          <AdminSelect
            v-model="editCompanyToProjectForm.workTypeId"
            :options="workTypeOptions"
            :placeholder="isLoadingWorkTypes ? '로딩 중...' : '공종 선택 (선택사항)'"
            :disabled="isLoadingWorkTypes"
          />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isEditCompanyToProjectDialogOpen = false">
          취소
        </AdminButton>
        <AdminButton :disabled="isUpdatingCompanyToProject" @click="handleUpdateCompanyToProject">
          {{ isUpdatingCompanyToProject ? "저장 중..." : "저장" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <!-- 사용자-프로젝트 매핑 추가 -->
    <AdminDialog
      :open="isUserToProjectDialogOpen"
      title="사용자-프로젝트 매핑 추가"
      width="md"
      :close-on-backdrop="false"
      @update:open="isUserToProjectDialogOpen = $event"
    >
      <div class="map-area__form">
        <div class="map-area__field">
          <AdminLabel>사용자 *</AdminLabel>
          <AdminSelect
            v-model="userToProjectForm.userId"
            :options="userOptions"
            placeholder="사용자 선택"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>프로젝트 *</AdminLabel>
          <AdminSelect
            v-model="userToProjectForm.projectId"
            :options="projectOptions"
            placeholder="프로젝트 선택"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>소속회사 *</AdminLabel>
          <AdminSelect
            v-model="userToProjectForm.companyToProjectId"
            :options="createCompanyToProjectOptions"
            :placeholder="
              isLoadingDialogCompanyToProject
                ? '로딩 중...'
                : filteredCompanyToProjectForCreate.length === 0
                ? '이 프로젝트에 매핑된 회사 없음'
                : '소속회사 선택'
            "
            :disabled="!userToProjectForm.projectId || isLoadingDialogCompanyToProject"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>프로젝트 직책</AdminLabel>
          <AdminInput v-model="userToProjectForm.projectRole" placeholder="예: 현장소장" />
        </div>
        <div class="map-area__field">
          <AdminLabel>시스템 역할 *</AdminLabel>
          <AdminSelect
            v-model="userToProjectForm.systemRoleId"
            :options="systemRoleOptions"
            placeholder="시스템 역할 선택"
          />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isUserToProjectDialogOpen = false">
          취소
        </AdminButton>
        <AdminButton :disabled="isCreatingUserToProject" @click="handleCreateUserToProject">
          {{ isCreatingUserToProject ? "생성 중..." : "추가" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <!-- 사용자-프로젝트 매핑 수정 -->
    <AdminDialog
      :open="isEditUserToProjectDialogOpen"
      title="사용자-프로젝트 매핑 수정"
      width="md"
      :close-on-backdrop="false"
      @update:open="isEditUserToProjectDialogOpen = $event"
    >
      <div class="map-area__form">
        <div class="map-area__field">
          <AdminLabel>사용자</AdminLabel>
          <AdminInput
            :model-value="
              editingUserToProject
                ? `${editingUserToProject.userName} (${editingUserToProject.userEmail})`
                : ''
            "
            disabled
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>프로젝트</AdminLabel>
          <AdminInput :model-value="editingUserToProject?.projectName ?? ''" disabled />
        </div>
        <div class="map-area__field">
          <AdminLabel>소속회사 *</AdminLabel>
          <AdminSelect
            v-model="editUserToProjectForm.companyToProjectId"
            :options="editCompanyToProjectOptions"
            :placeholder="
              isLoadingDialogCompanyToProject
                ? '로딩 중...'
                : filteredCompanyToProjectForEdit.length === 0
                ? '이 프로젝트에 매핑된 회사 없음'
                : '소속회사 선택'
            "
            :disabled="isLoadingDialogCompanyToProject"
          />
        </div>
        <div class="map-area__field">
          <AdminLabel>프로젝트 직책</AdminLabel>
          <AdminInput v-model="editUserToProjectForm.projectRole" placeholder="예: 현장소장" />
        </div>
        <div class="map-area__field">
          <AdminLabel>시스템 역할 *</AdminLabel>
          <AdminSelect
            v-model="editUserToProjectForm.systemRoleId"
            :options="systemRoleOptions"
            placeholder="시스템 역할 선택"
          />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isEditUserToProjectDialogOpen = false">
          취소
        </AdminButton>
        <AdminButton :disabled="isUpdatingUserToProject" @click="handleUpdateUserToProject">
          {{ isUpdatingUserToProject ? "저장 중..." : "저장" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <ConfirmDialog
      :open="showDeleteDialog"
      title="삭제 확인"
      :message="`'${deleteTargetName}' 항목을 삭제하시겠습니까?`"
      confirm-label="삭제"
      destructive
      @update:open="showDeleteDialog = $event"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.map-area {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.map-area__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.map-area__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.map-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.map-area__filters {
  display: flex;
  gap: 12px;
}
.map-area__filter {
  width: 200px;
}
.map-area__divider {
  border: 0;
  border-top: 1px solid var(--outline-soft);
  margin: 0;
}
.map-area__table-wrap {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.map-area__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.map-area__th {
  text-align: left;
  font-weight: 600;
  padding: 10px 14px;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
  color: var(--ink-muted);
}
.map-area__th--actions {
  width: 80px;
  text-align: center;
}
.map-area__td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--outline-soft);
}
.map-area__td--actions {
  text-align: center;
}
.map-area__td--empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 24px 14px;
}
.map-area__table tbody tr:last-child .map-area__td {
  border-bottom: none;
}
.map-area__table tbody tr:hover {
  background: var(--surface-3);
}
.map-area__icon-btn {
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted);
}
.map-area__icon-btn:hover {
  background: var(--primary-soft);
  color: var(--primary);
}
.map-area__icon-btn--danger:hover {
  background: rgba(185, 28, 28, 0.1);
  color: #b91c1c;
}
.map-area__icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.map-area__icon-btn img {
  width: 14px;
  height: 14px;
}
.map-area__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.map-area__field {
  display: flex;
  flex-direction: column;
}
</style>
