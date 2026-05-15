<script setup lang="ts">
import { onMounted, ref } from "vue";

import editIcon from "@fluentui/svg-icons/icons/edit_16_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import { useCompanyManagement } from "@/features/system-admin/state/useCompanyManagement";
import type {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from "@/features/system-admin/model/system-admin.types";

const {
  companies,
  isLoading,
  isCreating,
  isUpdating,
  isDeleting,
  loadCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} = useCompanyManagement();

const isCreateOpen = ref(false);
const form = ref<CreateCompanyPayload>({
  name: "",
  address: "",
  registrationNumber: "",
  phoneNumber: "",
  bankingAccount: "",
  displayName: "",
});

function resetForm() {
  form.value = {
    name: "",
    address: "",
    registrationNumber: "",
    phoneNumber: "",
    bankingAccount: "",
    displayName: "",
  };
}

function openCreate() {
  resetForm();
  isCreateOpen.value = true;
}

async function handleCreate() {
  if (!form.value.name.trim()) {
    alert("회사명을 입력해주세요.");
    return;
  }
  const ok = await createCompany(form.value);
  if (ok) {
    isCreateOpen.value = false;
    resetForm();
  }
}

const isEditOpen = ref(false);
const editingCompany = ref<Company | null>(null);
const editForm = ref<UpdateCompanyPayload>({
  name: "",
  address: "",
  registrationNumber: "",
  phoneNumber: "",
  bankingAccount: "",
  displayName: "",
});

function openEdit(company: Company) {
  editingCompany.value = company;
  editForm.value = {
    name: company.companyName,
    address: company.companyAddress || "",
    registrationNumber: company.registrationNumber || "",
    phoneNumber: company.phoneNumber || "",
    bankingAccount: company.bankingAccount || "",
    displayName: company.displayName || "",
  };
  isEditOpen.value = true;
}

async function handleUpdate() {
  if (!editingCompany.value) return;
  if (!editForm.value.name.trim()) {
    alert("회사명을 입력해주세요.");
    return;
  }
  const ok = await updateCompany(editingCompany.value.id, editForm.value);
  if (ok) {
    isEditOpen.value = false;
    editingCompany.value = null;
  }
}

const showDeleteDialog = ref(false);
const deleteTargetId = ref<string | null>(null);
const deleteTargetName = ref("");

function openDelete(company: Company) {
  deleteTargetId.value = company.id;
  deleteTargetName.value = company.companyName;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value) await deleteCompany(deleteTargetId.value);
}

onMounted(() => {
  void loadCompanies();
});
</script>

<template>
  <div class="company-area">
    <div class="company-area__actions">
      <AdminButton @click="openCreate">회사 추가</AdminButton>
    </div>

    <div class="company-area__table-wrap">
      <table class="company-area__table">
        <thead>
          <tr>
            <th class="company-area__th">회사명</th>
            <th class="company-area__th">표시명</th>
            <th class="company-area__th">사업자번호</th>
            <th class="company-area__th">전화번호</th>
            <th class="company-area__th">주소</th>
            <th class="company-area__th company-area__th--actions">작업</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td class="company-area__td company-area__td--empty" colspan="6">로딩 중...</td>
          </tr>
          <tr v-else-if="companies.length === 0">
            <td class="company-area__td company-area__td--empty" colspan="6">
              등록된 회사가 없습니다.
            </td>
          </tr>
          <tr v-for="c in companies" :key="c.id">
            <td class="company-area__td company-area__td--name">{{ c.companyName }}</td>
            <td class="company-area__td">{{ c.displayName || "-" }}</td>
            <td class="company-area__td">{{ c.registrationNumber || "-" }}</td>
            <td class="company-area__td">{{ c.phoneNumber || "-" }}</td>
            <td class="company-area__td">{{ c.companyAddress || "-" }}</td>
            <td class="company-area__td company-area__td--actions">
              <button
                type="button"
                class="company-area__icon-btn"
                aria-label="수정"
                @click.stop="openEdit(c)"
              >
                <img :src="editIcon" alt="" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="company-area__icon-btn company-area__icon-btn--danger"
                :disabled="isDeleting"
                aria-label="삭제"
                @click.stop="openDelete(c)"
              >
                <img :src="dismissIcon" alt="" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminDialog :open="isCreateOpen" title="회사 추가" width="md" @update:open="isCreateOpen = $event">
      <div class="company-area__form">
        <div class="company-area__field">
          <AdminLabel for="cmp-name">회사명 *</AdminLabel>
          <AdminInput id="cmp-name" v-model="form.name" placeholder="회사명 입력" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-display">표시명</AdminLabel>
          <AdminInput id="cmp-display" v-model="form.displayName" placeholder="표시명 입력 (선택)" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-reg">사업자번호</AdminLabel>
          <AdminInput id="cmp-reg" v-model="form.registrationNumber" placeholder="000-00-00000" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-phone">전화번호</AdminLabel>
          <AdminInput id="cmp-phone" v-model="form.phoneNumber" placeholder="02-0000-0000" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-addr">주소</AdminLabel>
          <AdminInput id="cmp-addr" v-model="form.address" placeholder="회사 주소" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-bank">계좌정보</AdminLabel>
          <AdminInput id="cmp-bank" v-model="form.bankingAccount" placeholder="은행 계좌번호" />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isCreateOpen = false">취소</AdminButton>
        <AdminButton :disabled="isCreating" @click="handleCreate">
          {{ isCreating ? "생성 중..." : "추가" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <AdminDialog :open="isEditOpen" title="회사 정보 수정" width="md" @update:open="isEditOpen = $event">
      <div class="company-area__form">
        <div class="company-area__field">
          <AdminLabel for="cmp-edit-name">회사명 *</AdminLabel>
          <AdminInput id="cmp-edit-name" v-model="editForm.name" placeholder="회사명 입력" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-edit-display">표시명</AdminLabel>
          <AdminInput id="cmp-edit-display" v-model="editForm.displayName" placeholder="표시명 입력 (선택)" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-edit-reg">사업자번호</AdminLabel>
          <AdminInput
            id="cmp-edit-reg"
            v-model="editForm.registrationNumber"
            placeholder="000-00-00000"
          />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-edit-phone">전화번호</AdminLabel>
          <AdminInput id="cmp-edit-phone" v-model="editForm.phoneNumber" placeholder="02-0000-0000" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-edit-addr">주소</AdminLabel>
          <AdminInput id="cmp-edit-addr" v-model="editForm.address" placeholder="회사 주소" />
        </div>
        <div class="company-area__field">
          <AdminLabel for="cmp-edit-bank">계좌정보</AdminLabel>
          <AdminInput
            id="cmp-edit-bank"
            v-model="editForm.bankingAccount"
            placeholder="은행 계좌번호"
          />
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
      :message="`'${deleteTargetName}' 회사를 삭제하시겠습니까?`"
      confirm-label="삭제"
      destructive
      @update:open="showDeleteDialog = $event"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.company-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.company-area__actions {
  display: flex;
  justify-content: flex-end;
}
.company-area__table-wrap {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.company-area__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.company-area__th {
  text-align: left;
  font-weight: 600;
  padding: 10px 14px;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
  color: var(--ink-muted);
}
.company-area__th--actions {
  width: 80px;
  text-align: center;
}
.company-area__td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--outline-soft);
}
.company-area__td--name {
  font-weight: 600;
}
.company-area__td--actions {
  text-align: center;
  display: inline-flex;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}
.company-area__td--empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 24px 14px;
}
.company-area__table tbody tr:last-child .company-area__td {
  border-bottom: none;
}
.company-area__table tbody tr:hover {
  background: var(--surface-3);
}

.company-area__icon-btn {
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
.company-area__icon-btn:hover {
  background: var(--primary-soft);
  color: var(--primary);
}
.company-area__icon-btn--danger:hover {
  background: rgba(185, 28, 28, 0.1);
  color: #b91c1c;
}
.company-area__icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.company-area__icon-btn img {
  width: 14px;
  height: 14px;
}

.company-area__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.company-area__field {
  display: flex;
  flex-direction: column;
}
</style>
