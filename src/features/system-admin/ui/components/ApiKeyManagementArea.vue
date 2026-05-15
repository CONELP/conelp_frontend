<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";

import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import AdminSelect from "@/shared/ui/admin/Select.vue";
import AdminCheckbox from "@/shared/ui/admin/Checkbox.vue";
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import { useCompanyManagement } from "@/features/system-admin/state/useCompanyManagement";
import { useApiKeyManagement } from "@/features/system-admin/state/useApiKeyManagement";
import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type {
  ApiKeyMasked,
  ApiKeyScope,
  CompanyToProject,
  CreateApiKeyPayload,
} from "@/features/system-admin/model/system-admin.types";

const { companies, loadCompanies } = useCompanyManagement();
const {
  apiKeys,
  isLoading,
  isCreating,
  isDeleting,
  issuedKey,
  loadApiKeys,
  createApiKey,
  deleteApiKey,
  clearIssuedKey,
} = useApiKeyManagement();

const selectedCompanyId = ref<string>("");
const companyOptions = computed(() =>
  companies.value.map((c) => ({ value: c.id, label: c.companyName })),
);

const companyProjects = ref<CompanyToProject[]>([]);
const isLoadingProjects = ref(false);

watch(selectedCompanyId, async (comId) => {
  if (!comId) {
    apiKeys.value = [];
    companyProjects.value = [];
    return;
  }
  await Promise.all([loadApiKeys(comId), loadCompanyProjects(comId)]);
});

async function loadCompanyProjects(comId: string) {
  isLoadingProjects.value = true;
  try {
    companyProjects.value = await systemAdminApi.getCompanyToProjectList({ companyId: comId });
  } catch (error) {
    console.error("회사-프로젝트 매핑 조회 실패:", error);
    companyProjects.value = [];
  } finally {
    isLoadingProjects.value = false;
  }
}

const uniqueProjects = computed(() => {
  const seen = new Map<string, { projectId: string; projectName: string }>();
  for (const cp of companyProjects.value) {
    if (!seen.has(cp.projectId)) {
      seen.set(cp.projectId, { projectId: cp.projectId, projectName: cp.projectName });
    }
  }
  return Array.from(seen.values());
});

const isCreateOpen = ref(false);
const form = ref<{
  name: string;
  projectIds: string[];
  scope: ApiKeyScope;
  expiresAt: string;
  allowedIps: string;
  rateLimit: string;
}>({
  name: "",
  projectIds: [],
  scope: "READ_ONLY",
  expiresAt: "",
  allowedIps: "",
  rateLimit: "60",
});

function resetForm() {
  form.value = {
    name: "",
    projectIds: [],
    scope: "READ_ONLY",
    expiresAt: "",
    allowedIps: "",
    rateLimit: "60",
  };
}

function openCreate() {
  if (!selectedCompanyId.value) {
    alert("회사를 먼저 선택해주세요.");
    return;
  }
  resetForm();
  isCreateOpen.value = true;
}

function toggleProjectId(id: string) {
  form.value.projectIds = form.value.projectIds.includes(id)
    ? form.value.projectIds.filter((v) => v !== id)
    : [...form.value.projectIds, id];
}

const scopeOptions: { value: ApiKeyScope; label: string }[] = [
  { value: "READ_ONLY", label: "READ_ONLY (조회만)" },
  { value: "READ_WRITE", label: "READ_WRITE (조회+쓰기)" },
];

async function handleCreate() {
  if (!form.value.name.trim()) {
    alert("키 이름을 입력해주세요.");
    return;
  }
  if (form.value.name.length > 100) {
    alert("키 이름은 100자 이하여야 합니다.");
    return;
  }
  if (form.value.projectIds.length === 0) {
    alert("프로젝트를 1개 이상 선택해주세요.");
    return;
  }
  let expiresAt: string | null = null;
  if (form.value.expiresAt) {
    const dt = new Date(form.value.expiresAt);
    if (Number.isNaN(dt.getTime())) {
      alert("유효한 만료 일시를 입력해주세요.");
      return;
    }
    if (dt.getTime() <= Date.now()) {
      alert("만료 일시는 미래 시점이어야 합니다.");
      return;
    }
    expiresAt = dt.toISOString();
  }
  const allowedIps = form.value.allowedIps.trim()
    ? form.value.allowedIps
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
  const rateLimit = form.value.rateLimit.trim() ? Number(form.value.rateLimit) : null;
  if (rateLimit != null && (Number.isNaN(rateLimit) || rateLimit <= 0)) {
    alert("Rate limit 값이 유효하지 않습니다.");
    return;
  }

  const payload: CreateApiKeyPayload = {
    name: form.value.name.trim(),
    comId: selectedCompanyId.value,
    projectIds: form.value.projectIds,
    scope: form.value.scope,
    expiresAt,
    allowedIps,
    rateLimit,
  };
  const ok = await createApiKey(payload);
  if (ok) {
    isCreateOpen.value = false;
    resetForm();
  }
}

async function copyPlaintextKey() {
  if (!issuedKey.value) return;
  try {
    await navigator.clipboard.writeText(issuedKey.value.plaintextKey);
    alert("키가 복사되었습니다.");
  } catch {
    alert("복사에 실패했습니다. 직접 선택해 복사해주세요.");
  }
}

const showRevokeDialog = ref(false);
const revokeTarget = ref<ApiKeyMasked | null>(null);

function openRevokeDialog(key: ApiKeyMasked) {
  revokeTarget.value = key;
  showRevokeDialog.value = true;
}

async function confirmRevoke() {
  if (revokeTarget.value && selectedCompanyId.value) {
    await deleteApiKey(revokeTarget.value.apiKeyId, selectedCompanyId.value);
  }
  revokeTarget.value = null;
}

function projectNamesOf(key: ApiKeyMasked): string {
  if (key.projectIds.length === 0) return "-";
  const names = key.projectIds.map((pid) => {
    const match = companyProjects.value.find((cp) => cp.projectId === pid);
    return match?.projectName ?? pid.slice(0, 8);
  });
  return names.join(", ");
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

onMounted(() => {
  void loadCompanies();
});
</script>

<template>
  <div class="apikey-area">
    <div class="apikey-area__head">
      <div class="apikey-area__company">
        <AdminLabel>회사</AdminLabel>
        <AdminSelect
          v-model="selectedCompanyId"
          :options="companyOptions"
          placeholder="회사 선택"
        />
      </div>
      <AdminButton :disabled="!selectedCompanyId" @click="openCreate">API 키 발급</AdminButton>
    </div>

    <div class="apikey-area__table-wrap">
      <table class="apikey-area__table">
        <thead>
          <tr>
            <th class="apikey-area__th">이름</th>
            <th class="apikey-area__th">키 (마스킹)</th>
            <th class="apikey-area__th">Scope</th>
            <th class="apikey-area__th">프로젝트</th>
            <th class="apikey-area__th">만료</th>
            <th class="apikey-area__th">마지막 사용</th>
            <th class="apikey-area__th">상태</th>
            <th class="apikey-area__th apikey-area__th--actions">작업</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!selectedCompanyId">
            <td class="apikey-area__td apikey-area__td--empty" colspan="8">
              회사를 선택해주세요.
            </td>
          </tr>
          <tr v-else-if="isLoading">
            <td class="apikey-area__td apikey-area__td--empty" colspan="8">로딩 중...</td>
          </tr>
          <tr v-else-if="apiKeys.length === 0">
            <td class="apikey-area__td apikey-area__td--empty" colspan="8">
              발급된 API 키가 없습니다.
            </td>
          </tr>
          <tr
            v-for="key in apiKeys"
            :key="key.apiKeyId"
            :class="{ 'apikey-area__row--revoked': !!key.revokedAt }"
          >
            <td class="apikey-area__td apikey-area__td--name">{{ key.name }}</td>
            <td class="apikey-area__td apikey-area__td--mono">
              {{ key.keyPrefix }}****{{ key.keyLast4 }}
            </td>
            <td class="apikey-area__td">
              <span
                class="apikey-area__chip"
                :class="key.scope === 'READ_WRITE' ? 'apikey-area__chip--warn' : 'apikey-area__chip--neutral'"
              >
                {{ key.scope }}
              </span>
            </td>
            <td class="apikey-area__td apikey-area__td--projects">{{ projectNamesOf(key) }}</td>
            <td class="apikey-area__td apikey-area__td--small">
              {{ key.expiresAt ? formatDateTime(key.expiresAt) : "영구" }}
            </td>
            <td class="apikey-area__td apikey-area__td--small">
              {{ formatDateTime(key.lastUsedAt) }}
            </td>
            <td class="apikey-area__td">
              <span
                v-if="key.revokedAt"
                class="apikey-area__chip apikey-area__chip--danger"
              >
                폐기됨
              </span>
              <span v-else class="apikey-area__chip apikey-area__chip--success">활성</span>
            </td>
            <td class="apikey-area__td apikey-area__td--actions">
              <button
                v-if="!key.revokedAt"
                type="button"
                class="apikey-area__icon-btn apikey-area__icon-btn--danger"
                :disabled="isDeleting"
                aria-label="폐기"
                @click.stop="openRevokeDialog(key)"
              >
                <img :src="dismissIcon" alt="" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 발급 Dialog -->
    <AdminDialog
      :open="isCreateOpen"
      title="API 키 발급"
      width="md"
      @update:open="isCreateOpen = $event"
    >
      <div class="apikey-area__form">
        <div class="apikey-area__field">
          <AdminLabel for="apikey-name">이름 *</AdminLabel>
          <AdminInput id="apikey-name" v-model="form.name" placeholder="예: ai-agent-prod" />
        </div>

        <div class="apikey-area__field">
          <AdminLabel>프로젝트 *</AdminLabel>
          <p class="apikey-area__field-hint">이 회사가 매핑된 프로젝트만 노출됩니다.</p>
          <div class="apikey-area__check-list">
            <p v-if="isLoadingProjects" class="apikey-area__hint">로딩 중...</p>
            <p v-else-if="uniqueProjects.length === 0" class="apikey-area__hint">
              매핑된 프로젝트가 없습니다.
            </p>
            <label
              v-for="proj in uniqueProjects"
              :key="proj.projectId"
              class="apikey-area__check"
            >
              <AdminCheckbox
                :model-value="form.projectIds.includes(proj.projectId)"
                @update:model-value="toggleProjectId(proj.projectId)"
              />
              <span>{{ proj.projectName }}</span>
            </label>
          </div>
        </div>

        <div class="apikey-area__field">
          <AdminLabel for="apikey-scope">Scope *</AdminLabel>
          <AdminSelect
            :model-value="form.scope"
            :options="scopeOptions"
            @update:model-value="form.scope = $event as ApiKeyScope"
          />
        </div>

        <div class="apikey-area__field">
          <AdminLabel for="apikey-expires">만료 일시</AdminLabel>
          <AdminInput id="apikey-expires" v-model="form.expiresAt" type="datetime-local" />
          <p class="apikey-area__field-hint">비워두면 영구 유효.</p>
        </div>

        <div class="apikey-area__field">
          <AdminLabel for="apikey-ips">허용 IP</AdminLabel>
          <AdminInput
            id="apikey-ips"
            v-model="form.allowedIps"
            placeholder="예: 1.2.3.4, 5.6.7.8"
          />
          <p class="apikey-area__field-hint">쉼표로 구분. 비워두면 전체 허용.</p>
        </div>

        <div class="apikey-area__field">
          <AdminLabel for="apikey-rate">Rate Limit (분당)</AdminLabel>
          <AdminInput id="apikey-rate" v-model="form.rateLimit" type="number" placeholder="60" />
        </div>
      </div>
      <template #footer>
        <AdminButton variant="outline" @click="isCreateOpen = false">취소</AdminButton>
        <AdminButton :disabled="isCreating" @click="handleCreate">
          {{ isCreating ? "발급 중..." : "발급" }}
        </AdminButton>
      </template>
    </AdminDialog>

    <!-- 평문 키 1회 노출 -->
    <AdminDialog
      :open="issuedKey != null"
      title="API 키 발급 완료"
      width="md"
      @update:open="(open) => { if (!open) clearIssuedKey() }"
    >
      <div v-if="issuedKey" class="apikey-area__issued">
        <div class="apikey-area__warning">
          <p class="apikey-area__warning-title">⚠ 이 키는 지금 한 번만 표시됩니다.</p>
          <p class="apikey-area__warning-desc">
            지금 안전한 보관소에 복사해두세요. 분실 시 새 키를 발급해야 합니다.
          </p>
        </div>
        <div class="apikey-area__field">
          <AdminLabel>이름</AdminLabel>
          <AdminInput :model-value="issuedKey.name" readonly />
        </div>
        <div class="apikey-area__field">
          <AdminLabel>Scope</AdminLabel>
          <AdminInput :model-value="issuedKey.scope" readonly />
        </div>
        <div class="apikey-area__field">
          <AdminLabel>평문 키</AdminLabel>
          <div class="apikey-area__copy-row">
            <AdminInput :model-value="issuedKey.plaintextKey" readonly class="apikey-area__mono" />
            <AdminButton variant="outline" @click="copyPlaintextKey">복사</AdminButton>
          </div>
        </div>
      </div>
      <template #footer>
        <AdminButton @click="clearIssuedKey">확인</AdminButton>
      </template>
    </AdminDialog>

    <ConfirmDialog
      :open="showRevokeDialog"
      title="API 키 폐기"
      :message="`'${revokeTarget?.name ?? ''}' 키를 폐기하시겠습니까? 폐기 후 즉시 인증이 차단됩니다.`"
      confirm-label="폐기"
      destructive
      @update:open="showRevokeDialog = $event"
      @confirm="confirmRevoke"
    />
  </div>
</template>

<style scoped>
.apikey-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.apikey-area__head {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.apikey-area__company {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 260px;
}
.apikey-area__table-wrap {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.apikey-area__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.apikey-area__th {
  text-align: left;
  font-weight: 600;
  padding: 10px 14px;
  background: var(--surface-3);
  border-bottom: 1px solid var(--outline-soft);
  color: var(--ink-muted);
}
.apikey-area__th--actions {
  width: 60px;
  text-align: center;
}
.apikey-area__td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--outline-soft);
}
.apikey-area__td--name {
  font-weight: 600;
}
.apikey-area__td--mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
}
.apikey-area__td--projects {
  max-width: 240px;
  font-size: 12px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.apikey-area__td--small {
  font-size: 12px;
}
.apikey-area__td--actions {
  text-align: center;
}
.apikey-area__td--empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 24px 14px;
}
.apikey-area__table tbody tr:last-child .apikey-area__td {
  border-bottom: none;
}
.apikey-area__table tbody tr:hover {
  background: var(--surface-3);
}
.apikey-area__row--revoked {
  opacity: 0.5;
}

.apikey-area__chip {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.apikey-area__chip--warn {
  background: #fef3c7;
  color: #92400e;
}
.apikey-area__chip--neutral {
  background: var(--surface-3);
  color: var(--ink-muted);
}
.apikey-area__chip--danger {
  background: #fee2e2;
  color: #b91c1c;
}
.apikey-area__chip--success {
  background: #d1fae5;
  color: #065f46;
}

.apikey-area__icon-btn {
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--ink-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.apikey-area__icon-btn--danger:hover {
  background: rgba(185, 28, 28, 0.1);
  color: #b91c1c;
}
.apikey-area__icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.apikey-area__icon-btn img {
  width: 14px;
  height: 14px;
}

.apikey-area__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.apikey-area__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.apikey-area__field-hint {
  margin: 0;
  font-size: 11px;
  color: var(--ink-faint);
}
.apikey-area__check-list {
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}
.apikey-area__check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.apikey-area__hint {
  margin: 0;
  font-size: 12px;
  color: var(--ink-faint);
}

.apikey-area__issued {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.apikey-area__warning {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 10px 14px;
}
.apikey-area__warning-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}
.apikey-area__warning-desc {
  margin: 0;
  font-size: 12px;
  color: #92400e;
}
.apikey-area__copy-row {
  display: flex;
  gap: 6px;
}
.apikey-area__mono :deep(.admin-input) {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
}
</style>
