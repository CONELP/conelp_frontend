<script setup lang="ts">
import { onMounted } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import { useRoleManagement } from "@/features/system-admin/state/useRoleManagement";

const {
  systemRoles,
  isLoadingSystemRoles,
  isCreatingSystemRole,
  newSystemRoleName,
  createSystemRole,
  companyRoles,
  isLoadingCompanyRoles,
  isCreatingCompanyRole,
  newCompanyRoleName,
  createCompanyRole,
  loadAllRoles,
} = useRoleManagement();

onMounted(() => {
  void loadAllRoles();
});

function onSystemEnter(e: KeyboardEvent) {
  if (!e.isComposing) void createSystemRole();
}
function onCompanyEnter(e: KeyboardEvent) {
  if (!e.isComposing) void createCompanyRole();
}
</script>

<template>
  <div class="role-area">
    <section class="role-area__section">
      <h4 class="role-area__title">시스템 역할</h4>
      <p class="role-area__desc">프로젝트 내 사용자의 권한을 정의합니다. (예: GC, SC, Viewer)</p>
      <div class="role-area__form">
        <AdminInput
          v-model="newSystemRoleName"
          placeholder="새 시스템 역할명"
          class="role-area__input"
          @keydown="onSystemEnter"
        />
        <AdminButton
          :disabled="!newSystemRoleName.trim() || isCreatingSystemRole"
          @click="createSystemRole"
        >
          추가
        </AdminButton>
      </div>
      <div class="role-area__chips">
        <span v-if="isLoadingSystemRoles" class="role-area__empty">로딩 중...</span>
        <span v-else-if="systemRoles.length === 0" class="role-area__empty">
          등록된 시스템 역할이 없습니다.
        </span>
        <span
          v-for="role in systemRoles"
          :key="role.id"
          class="role-area__chip role-area__chip--primary"
        >
          {{ role.name }}
        </span>
      </div>
    </section>

    <hr class="role-area__divider" />

    <section class="role-area__section">
      <h4 class="role-area__title">회사 역할</h4>
      <p class="role-area__desc">
        프로젝트에서 회사의 역할을 정의합니다. (예: 시공사, 감리사, 발주처)
      </p>
      <div class="role-area__form">
        <AdminInput
          v-model="newCompanyRoleName"
          placeholder="새 회사 역할명"
          class="role-area__input"
          @keydown="onCompanyEnter"
        />
        <AdminButton
          :disabled="!newCompanyRoleName.trim() || isCreatingCompanyRole"
          @click="createCompanyRole"
        >
          추가
        </AdminButton>
      </div>
      <div class="role-area__chips">
        <span v-if="isLoadingCompanyRoles" class="role-area__empty">로딩 중...</span>
        <span v-else-if="companyRoles.length === 0" class="role-area__empty">
          등록된 회사 역할이 없습니다.
        </span>
        <span
          v-for="role in companyRoles"
          :key="role.id"
          class="role-area__chip role-area__chip--secondary"
        >
          {{ role.name }}
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.role-area {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.role-area__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.role-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.role-area__desc {
  margin: 0;
  font-size: 12px;
  color: var(--ink-muted);
}
.role-area__form {
  display: flex;
  gap: 8px;
  align-items: center;
}
.role-area__input {
  max-width: 320px;
}
.role-area__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.role-area__chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
}
.role-area__chip--primary {
  background: var(--primary-soft);
  color: var(--primary);
}
.role-area__chip--secondary {
  background: var(--surface-3);
  color: var(--ink);
}
.role-area__empty {
  font-size: 13px;
  color: var(--ink-faint);
}
.role-area__divider {
  border: 0;
  border-top: 1px solid var(--outline-soft);
  margin: 0;
}
</style>
