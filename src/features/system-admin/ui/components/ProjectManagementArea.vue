<script setup lang="ts">
import { onMounted, ref } from "vue";

import editIcon from "@fluentui/svg-icons/icons/edit_16_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import { useProjectManagement } from "@/features/system-admin/state/useProjectManagement";
import type {
  CreateProjectPayload,
  Project,
  UpdateProjectPayload,
} from "@/features/system-admin/model/system-admin.types";

const {
  projects,
  isLoading,
  isCreating,
  isUpdating,
  isDeleting,
  loadProjects,
  createProject,
  updateProject,
  deleteProject,
} = useProjectManagement();

const isCreateOpen = ref(false);
const form = ref<CreateProjectPayload>({
  name: "",
  address: "",
  startDate: "",
  completionDate: "",
  weatherNx: undefined,
  weatherNy: undefined,
});

function resetForm() {
  form.value = {
    name: "",
    address: "",
    startDate: "",
    completionDate: "",
    weatherNx: undefined,
    weatherNy: undefined,
  };
}

function openCreate() {
  resetForm();
  isCreateOpen.value = true;
}

async function handleCreate() {
  if (!form.value.name.trim()) {
    alert("프로젝트명을 입력해주세요.");
    return;
  }
  if (!form.value.startDate || !form.value.completionDate) {
    alert("착공일과 준공일을 입력해주세요.");
    return;
  }
  const ok = await createProject(form.value);
  if (ok) {
    isCreateOpen.value = false;
    resetForm();
  }
}

const isEditOpen = ref(false);
const editingProject = ref<Project | null>(null);
const editForm = ref<UpdateProjectPayload>({
  name: "",
  address: "",
  startDate: "",
  completionDate: "",
  weatherNx: undefined,
  weatherNy: undefined,
});

function openEdit(p: Project) {
  editingProject.value = p;
  editForm.value = {
    name: p.projectName,
    address: p.siteAddress || "",
    startDate: p.startDate,
    completionDate: p.completionDate,
    weatherNx: p.weatherNx ?? undefined,
    weatherNy: p.weatherNy ?? undefined,
  };
  isEditOpen.value = true;
}

async function handleUpdate() {
  if (!editingProject.value) return;
  if (!editForm.value.name.trim()) {
    alert("프로젝트명을 입력해주세요.");
    return;
  }
  if (!editForm.value.startDate || !editForm.value.completionDate) {
    alert("착공일과 준공일을 입력해주세요.");
    return;
  }
  const ok = await updateProject(editingProject.value.id, editForm.value);
  if (ok) {
    isEditOpen.value = false;
    editingProject.value = null;
  }
}

const showDeleteDialog = ref(false);
const deleteTargetId = ref<string | null>(null);
const deleteTargetName = ref("");

function openDelete(p: Project) {
  deleteTargetId.value = p.id;
  deleteTargetName.value = p.projectName;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value) await deleteProject(deleteTargetId.value);
}

onMounted(() => {
  void loadProjects();
});
</script>

<template>
  <div class="project-area">
    <div class="project-area__actions">
      <AdminButton @click="openCreate">프로젝트 추가</AdminButton>
    </div>

    <div class="project-area__table-wrap">
      <table class="project-area__table">
        <thead>
          <tr>
            <th class="project-area__th">프로젝트명</th>
            <th class="project-area__th">현장주소</th>
            <th class="project-area__th">착공일</th>
            <th class="project-area__th">준공일</th>
            <th class="project-area__th">기상청 좌표</th>
            <th class="project-area__th project-area__th--actions">작업</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td class="project-area__td project-area__td--empty" colspan="6">로딩 중...</td>
          </tr>
          <tr v-else-if="projects.length === 0">
            <td class="project-area__td project-area__td--empty" colspan="6">
              등록된 프로젝트가 없습니다.
            </td>
          </tr>
          <tr v-for="p in projects" :key="p.id">
            <td class="project-area__td project-area__td--name">{{ p.projectName }}</td>
            <td class="project-area__td">{{ p.siteAddress || "-" }}</td>
            <td class="project-area__td">{{ p.startDate }}</td>
            <td class="project-area__td">{{ p.completionDate }}</td>
            <td class="project-area__td">
              {{
                p.weatherNx && p.weatherNy ? `(${p.weatherNx}, ${p.weatherNy})` : "-"
              }}
            </td>
            <td class="project-area__td project-area__td--actions">
              <button
                type="button"
                class="project-area__icon-btn"
                aria-label="수정"
                @click.stop="openEdit(p)"
              >
                <img :src="editIcon" alt="" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="project-area__icon-btn project-area__icon-btn--danger"
                :disabled="isDeleting"
                aria-label="삭제"
                @click.stop="openDelete(p)"
              >
                <img :src="dismissIcon" alt="" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminDialog
      :open="isCreateOpen"
      title="프로젝트 추가"
      width="md"
      @update:open="isCreateOpen = $event"
    >
      <div class="project-area__form">
        <div class="project-area__field">
          <AdminLabel for="proj-name">프로젝트명 *</AdminLabel>
          <AdminInput id="proj-name" v-model="form.name" placeholder="프로젝트명 입력" />
        </div>
        <div class="project-area__field">
          <AdminLabel for="proj-addr">현장주소</AdminLabel>
          <AdminInput id="proj-addr" v-model="form.address" placeholder="현장 주소" />
        </div>
        <div class="project-area__grid-2">
          <div class="project-area__field">
            <AdminLabel for="proj-start">착공일 *</AdminLabel>
            <AdminInput id="proj-start" v-model="form.startDate" type="date" />
          </div>
          <div class="project-area__field">
            <AdminLabel for="proj-end">준공일 *</AdminLabel>
            <AdminInput id="proj-end" v-model="form.completionDate" type="date" />
          </div>
        </div>
        <div class="project-area__grid-2">
          <div class="project-area__field">
            <AdminLabel for="proj-nx">기상청 X좌표</AdminLabel>
            <AdminInput
              id="proj-nx"
              :model-value="form.weatherNx ?? ''"
              type="number"
              placeholder="NX"
              @update:model-value="form.weatherNx = $event === '' ? undefined : Number($event)"
            />
          </div>
          <div class="project-area__field">
            <AdminLabel for="proj-ny">기상청 Y좌표</AdminLabel>
            <AdminInput
              id="proj-ny"
              :model-value="form.weatherNy ?? ''"
              type="number"
              placeholder="NY"
              @update:model-value="form.weatherNy = $event === '' ? undefined : Number($event)"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isCreateOpen = false">취소</AdminButton>
        <AdminButton :disabled="isCreating" @click="handleCreate">
          {{ isCreating ? "생성 중..." : "추가" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <AdminDialog
      :open="isEditOpen"
      title="프로젝트 정보 수정"
      width="md"
      @update:open="isEditOpen = $event"
    >
      <div class="project-area__form">
        <div class="project-area__field">
          <AdminLabel for="proj-edit-name">프로젝트명 *</AdminLabel>
          <AdminInput id="proj-edit-name" v-model="editForm.name" placeholder="프로젝트명 입력" />
        </div>
        <div class="project-area__field">
          <AdminLabel for="proj-edit-addr">현장주소</AdminLabel>
          <AdminInput id="proj-edit-addr" v-model="editForm.address" placeholder="현장 주소" />
        </div>
        <div class="project-area__grid-2">
          <div class="project-area__field">
            <AdminLabel for="proj-edit-start">착공일 *</AdminLabel>
            <AdminInput id="proj-edit-start" v-model="editForm.startDate" type="date" />
          </div>
          <div class="project-area__field">
            <AdminLabel for="proj-edit-end">준공일 *</AdminLabel>
            <AdminInput id="proj-edit-end" v-model="editForm.completionDate" type="date" />
          </div>
        </div>
        <div class="project-area__grid-2">
          <div class="project-area__field">
            <AdminLabel for="proj-edit-nx">기상청 X좌표</AdminLabel>
            <AdminInput
              id="proj-edit-nx"
              :model-value="editForm.weatherNx ?? ''"
              type="number"
              placeholder="NX"
              @update:model-value="editForm.weatherNx = $event === '' ? undefined : Number($event)"
            />
          </div>
          <div class="project-area__field">
            <AdminLabel for="proj-edit-ny">기상청 Y좌표</AdminLabel>
            <AdminInput
              id="proj-edit-ny"
              :model-value="editForm.weatherNy ?? ''"
              type="number"
              placeholder="NY"
              @update:model-value="editForm.weatherNy = $event === '' ? undefined : Number($event)"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isEditOpen = false">취소</AdminButton>
        <AdminButton :disabled="isUpdating" @click="handleUpdate">
          {{ isUpdating ? "저장 중..." : "저장" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <ConfirmDialog
      :open="showDeleteDialog"
      title="삭제 확인"
      :message="`'${deleteTargetName}' 프로젝트를 삭제하시겠습니까?`"
      confirm-label="삭제"
      destructive
      @update:open="showDeleteDialog = $event"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.project-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-area__actions {
  display: flex;
  justify-content: flex-end;
}
.project-area__table-wrap {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.project-area__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.project-area__th {
  text-align: left;
  font-weight: 600;
  padding: 10px 14px;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
  color: var(--ink-muted);
}
.project-area__th--actions {
  width: 80px;
  text-align: center;
}
.project-area__td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--outline-soft);
}
.project-area__td--name {
  font-weight: 600;
}
.project-area__td--actions {
  text-align: center;
}
.project-area__td--empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 24px 14px;
}
.project-area__table tbody tr:last-child .project-area__td {
  border-bottom: none;
}
.project-area__table tbody tr:hover {
  background: var(--surface-3);
}
.project-area__icon-btn {
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
.project-area__icon-btn:hover {
  background: var(--primary-soft);
  color: var(--primary);
}
.project-area__icon-btn--danger:hover {
  background: rgba(185, 28, 28, 0.1);
  color: #b91c1c;
}
.project-area__icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.project-area__icon-btn img {
  width: 14px;
  height: 14px;
}
.project-area__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-area__field {
  display: flex;
  flex-direction: column;
}
.project-area__grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
