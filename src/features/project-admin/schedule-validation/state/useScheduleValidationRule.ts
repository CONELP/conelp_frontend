import { computed, ref } from "vue";

import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import {
  scheduleValidationApi,
  type ScheduleValidationRule,
} from "@/features/project-admin/schedule-validation/services/schedule-validation.api";

export interface ScheduleValidationWorkTypeOption {
  divisionId: number;
  divisionName: string;
  workTypeId: number;
  workTypeName: string;
}

export function useScheduleValidationRule() {
  const isLoading = ref(false);
  const isSaving = ref(false);
  const errorMessage = ref<string | null>(null);
  const toastMessage = ref<string | null>(null);

  const workTypeOptions = ref<ScheduleValidationWorkTypeOption[]>([]);
  const rules = ref<ScheduleValidationRule[]>([]);
  const selectedWorkTypeId = ref<number | null>(null);
  const siteRuleDraft = ref("");
  const companyRuleDraft = ref("");

  const ruleByWorkTypeId = computed(() => {
    const map = new Map<number, ScheduleValidationRule>();
    rules.value.forEach((rule) => map.set(rule.workTypeId, rule));
    return map;
  });

  const selectedRule = computed(() =>
    selectedWorkTypeId.value === null
      ? null
      : ruleByWorkTypeId.value.get(selectedWorkTypeId.value) ?? null,
  );

  const isDirty = computed(() => {
    const stored = selectedRule.value;
    return (
      (stored?.siteRule ?? "") !== siteRuleDraft.value ||
      (stored?.companyRule ?? "") !== companyRuleDraft.value
    );
  });

  const canSave = computed(
    () =>
      selectedWorkTypeId.value !== null &&
      (siteRuleDraft.value.trim().length > 0 ||
        companyRuleDraft.value.trim().length > 0) &&
      isDirty.value &&
      !isSaving.value,
  );

  function loadDraftFromSelected() {
    const stored = selectedRule.value;
    siteRuleDraft.value = stored?.siteRule ?? "";
    companyRuleDraft.value = stored?.companyRule ?? "";
  }

  async function load() {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const [hierarchy, ruleList] = await Promise.all([
        desktopScheduleApi.getReferenceHierarchy(),
        scheduleValidationApi.getRuleList(),
      ]);

      const seen = new Set<number>();
      const options: ScheduleValidationWorkTypeOption[] = [];
      hierarchy.forEach((item) => {
        if (!item.workTypeId || seen.has(item.workTypeId)) {
          return;
        }
        seen.add(item.workTypeId);
        options.push({
          divisionId: item.divisionId,
          divisionName: item.divisionName,
          workTypeId: item.workTypeId,
          workTypeName: item.workTypeName,
        });
      });
      workTypeOptions.value = options;
      rules.value = ruleList;

      if (
        selectedWorkTypeId.value !== null &&
        !options.some((option) => option.workTypeId === selectedWorkTypeId.value)
      ) {
        selectedWorkTypeId.value = null;
      }
      loadDraftFromSelected();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "검증 규칙을 불러오지 못했습니다.";
    } finally {
      isLoading.value = false;
    }
  }

  function selectWorkType(workTypeId: number | null) {
    selectedWorkTypeId.value = workTypeId;
    loadDraftFromSelected();
  }

  function setSiteRuleDraft(value: string) {
    siteRuleDraft.value = value;
  }

  function setCompanyRuleDraft(value: string) {
    companyRuleDraft.value = value;
  }

  function showToast(message: string) {
    toastMessage.value = message;
    window.setTimeout(() => {
      if (toastMessage.value === message) {
        toastMessage.value = null;
      }
    }, 2400);
  }

  async function saveSelected() {
    if (selectedWorkTypeId.value === null) return;
    const workTypeId = selectedWorkTypeId.value;
    const siteRule = siteRuleDraft.value.trim() === "" ? null : siteRuleDraft.value;
    const companyRule =
      companyRuleDraft.value.trim() === "" ? null : companyRuleDraft.value;

    if (!siteRule && !companyRule) {
      errorMessage.value = "현장 규정 또는 회사 규정 중 하나는 입력해야 합니다.";
      return;
    }

    isSaving.value = true;
    errorMessage.value = null;
    try {
      const exists = ruleByWorkTypeId.value.has(workTypeId);
      const saved = exists
        ? await scheduleValidationApi.updateRule(workTypeId, { siteRule, companyRule })
        : await scheduleValidationApi.createRule({ workTypeId, siteRule, companyRule });

      const next = rules.value.filter((rule) => rule.workTypeId !== workTypeId);
      next.push(saved);
      rules.value = next;
      loadDraftFromSelected();
      showToast(exists ? "규칙을 수정했습니다." : "규칙을 등록했습니다.");
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "검증 규칙 저장에 실패했습니다.";
    } finally {
      isSaving.value = false;
    }
  }

  function resetDraft() {
    loadDraftFromSelected();
  }

  return {
    isLoading,
    isSaving,
    errorMessage,
    toastMessage,
    workTypeOptions,
    rules,
    ruleByWorkTypeId,
    selectedWorkTypeId,
    selectedRule,
    siteRuleDraft,
    companyRuleDraft,
    isDirty,
    canSave,
    load,
    selectWorkType,
    setSiteRuleDraft,
    setCompanyRuleDraft,
    saveSelected,
    resetDraft,
  };
}
