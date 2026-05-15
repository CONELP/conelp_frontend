<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import editIcon from "@fluentui/svg-icons/icons/edit_16_regular.svg";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import AdminSelect from "@/shared/ui/admin/Select.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import { useUserManagement } from "@/features/system-admin/state/useUserManagement";
import type {
  UpdateUserPayload,
  User,
} from "@/features/system-admin/model/system-admin.types";

const {
  users,
  companies,
  isLoading,
  isUpdating,
  loadUsers,
  loadCompanies,
  updateUser,
} = useUserManagement();

const isEditOpen = ref(false);
const editingUser = ref<User | null>(null);
const editForm = ref({
  userName: "",
  phoneNumber: "",
  jobTitle: "",
  companyId: "" as string,
});

const originalForm = ref({
  userName: "",
  phoneNumber: "",
  jobTitle: "",
  companyId: "" as string,
});

const companyOptions = computed(() =>
  companies.value.map((c) => ({ value: c.id, label: c.companyName })),
);

function openEdit(user: User) {
  editingUser.value = user;
  const matched = companies.value.find((c) => c.companyName === user.companyName);
  const initial = {
    userName: user.userName,
    phoneNumber: user.phoneNumber,
    jobTitle: user.jobTitle || "",
    companyId: matched?.id || "",
  };
  editForm.value = { ...initial };
  originalForm.value = { ...initial };
  isEditOpen.value = true;
}

async function handleUpdate() {
  if (!editingUser.value) return;
  const payload: UpdateUserPayload = {};
  if (editForm.value.userName !== originalForm.value.userName) {
    payload.userName = editForm.value.userName || null;
  }
  if (editForm.value.phoneNumber !== originalForm.value.phoneNumber) {
    payload.phoneNumber = editForm.value.phoneNumber || null;
  }
  if (editForm.value.jobTitle !== originalForm.value.jobTitle) {
    payload.jobTitle = editForm.value.jobTitle || null;
  }
  if (editForm.value.companyId !== originalForm.value.companyId) {
    payload.companyId = editForm.value.companyId || null;
  }
  if (Object.keys(payload).length === 0) {
    isEditOpen.value = false;
    return;
  }
  const ok = await updateUser(editingUser.value.id, payload);
  if (ok) {
    isEditOpen.value = false;
    editingUser.value = null;
  }
}

function clearCompany() {
  editForm.value.companyId = "";
}

onMounted(() => {
  void Promise.all([loadUsers(), loadCompanies()]);
});
</script>

<template>
  <div class="user-area">
    <div class="user-area__table-wrap">
      <table class="user-area__table">
        <thead>
          <tr>
            <th class="user-area__th">이메일</th>
            <th class="user-area__th">이름</th>
            <th class="user-area__th">전화번호</th>
            <th class="user-area__th">직책</th>
            <th class="user-area__th">소속회사</th>
            <th class="user-area__th">역할</th>
            <th class="user-area__th">상태</th>
            <th class="user-area__th user-area__th--actions">작업</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td class="user-area__td user-area__td--empty" colspan="8">로딩 중...</td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td class="user-area__td user-area__td--empty" colspan="8">
              등록된 사용자가 없습니다.
            </td>
          </tr>
          <tr v-for="u in users" :key="u.id">
            <td class="user-area__td">{{ u.userEmail }}</td>
            <td class="user-area__td user-area__td--name">{{ u.userName }}</td>
            <td class="user-area__td">{{ u.phoneNumber || "-" }}</td>
            <td class="user-area__td">{{ u.jobTitle || "-" }}</td>
            <td class="user-area__td">{{ u.companyName || "-" }}</td>
            <td class="user-area__td">{{ u.systemRole }}</td>
            <td class="user-area__td">{{ u.currentStatus }}</td>
            <td class="user-area__td user-area__td--actions">
              <button
                type="button"
                class="user-area__icon-btn"
                aria-label="수정"
                @click.stop="openEdit(u)"
              >
                <img :src="editIcon" alt="" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminDialog
      :open="isEditOpen"
      title="사용자 정보 수정"
      width="md"
      @update:open="isEditOpen = $event"
    >
      <div class="user-area__form">
        <div class="user-area__field">
          <AdminLabel>이메일</AdminLabel>
          <AdminInput :model-value="editingUser?.userEmail ?? ''" disabled />
        </div>
        <div class="user-area__field">
          <AdminLabel for="user-name">이름</AdminLabel>
          <AdminInput id="user-name" v-model="editForm.userName" placeholder="이름" />
        </div>
        <div class="user-area__field">
          <AdminLabel for="user-phone">전화번호</AdminLabel>
          <AdminInput id="user-phone" v-model="editForm.phoneNumber" placeholder="01012345678" />
        </div>
        <div class="user-area__field">
          <AdminLabel for="user-job">직책</AdminLabel>
          <AdminInput id="user-job" v-model="editForm.jobTitle" placeholder="예: 현장소장" />
        </div>
        <div class="user-area__field">
          <AdminLabel>소속 회사</AdminLabel>
          <div class="user-area__row">
            <AdminSelect
              v-model="editForm.companyId"
              :options="companyOptions"
              placeholder="회사 선택"
            />
            <AdminButton variant="outline" size="sm" @click="clearCompany">해제</AdminButton>
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
  </div>
</template>

<style scoped>
.user-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.user-area__table-wrap {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.user-area__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.user-area__th {
  text-align: left;
  font-weight: 600;
  padding: 10px 14px;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
  color: var(--ink-muted);
}
.user-area__th--actions {
  width: 60px;
  text-align: center;
}
.user-area__td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--outline-soft);
}
.user-area__td--name {
  font-weight: 600;
}
.user-area__td--actions {
  text-align: center;
}
.user-area__td--empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 24px 14px;
}
.user-area__table tbody tr:last-child .user-area__td {
  border-bottom: none;
}
.user-area__table tbody tr:hover {
  background: var(--surface-3);
}
.user-area__icon-btn {
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
.user-area__icon-btn:hover {
  background: var(--primary-soft);
  color: var(--primary);
}
.user-area__icon-btn img {
  width: 14px;
  height: 14px;
}
.user-area__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.user-area__field {
  display: flex;
  flex-direction: column;
}
.user-area__row {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
