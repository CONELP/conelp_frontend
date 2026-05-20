<script setup lang="ts">
import { computed, onMounted, watch } from "vue";

import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import { useScheduleValidationRule } from "@/features/project-admin/schedule-validation/state/useScheduleValidationRule";
import { useSelectedProjectId } from "@/features/project-admin/_shared/state/useSelectedProjectId";

const { selectedProjectId } = useSelectedProjectId();
const state = useScheduleValidationRule();

const groupedOptions = computed(() => {
  const groups = new Map<
    number,
    { divisionId: number; divisionName: string; workTypes: typeof state.workTypeOptions.value }
  >();
  state.workTypeOptions.value.forEach((option) => {
    let group = groups.get(option.divisionId);
    if (!group) {
      group = {
        divisionId: option.divisionId,
        divisionName: option.divisionName,
        workTypes: [],
      };
      groups.set(option.divisionId, group);
    }
    group.workTypes.push(option);
  });
  return Array.from(groups.values());
});

onMounted(() => {
  if (selectedProjectId.value) void state.load();
});

watch(selectedProjectId, (pid) => {
  if (pid) void state.load();
});

function handleSelectWorkType(workTypeId: number) {
  state.selectWorkType(workTypeId);
}
</script>

<template>
  <PageContainer title="AI 공정표 검증">
    <AreaCard :grow="1" min-height="600px">
      <div v-if="!selectedProjectId" class="schedule-validation__notice">
        프로젝트를 먼저 선택해주세요.
      </div>

      <template v-else>
        <div class="schedule-validation__warning">
          ⚠️ 현재 검증 규칙은 서버 메모리에 저장되며, 서버 재기동 시 사라집니다.
        </div>

        <div class="schedule-validation__layout">
          <aside class="schedule-validation__list" aria-label="공종 목록">
            <div class="schedule-validation__list-title">공종 선택</div>
            <div v-if="state.isLoading.value" class="schedule-validation__list-empty">
              불러오는 중…
            </div>
            <div
              v-else-if="state.workTypeOptions.value.length === 0"
              class="schedule-validation__list-empty"
            >
              등록된 공종이 없습니다.
            </div>
            <div v-else class="schedule-validation__groups">
              <section
                v-for="group in groupedOptions"
                :key="group.divisionId"
                class="schedule-validation__group"
              >
                <header class="schedule-validation__group-label">
                  {{ group.divisionName || "(공정 미지정)" }}
                </header>
                <ul class="schedule-validation__work-types">
                  <li v-for="option in group.workTypes" :key="option.workTypeId">
                    <button
                      type="button"
                      class="schedule-validation__work-type"
                      :class="{
                        'schedule-validation__work-type--active':
                          state.selectedWorkTypeId.value === option.workTypeId,
                        'schedule-validation__work-type--has-rule':
                          state.ruleByWorkTypeId.value.has(option.workTypeId),
                      }"
                      @click="handleSelectWorkType(option.workTypeId)"
                    >
                      <span class="schedule-validation__work-type-name">
                        {{ option.workTypeName }}
                      </span>
                      <span
                        v-if="state.ruleByWorkTypeId.value.has(option.workTypeId)"
                        class="schedule-validation__work-type-badge"
                        >규칙</span
                      >
                    </button>
                  </li>
                </ul>
              </section>
            </div>
          </aside>

          <section class="schedule-validation__editor" aria-label="검증 규칙 편집">
            <div v-if="state.selectedWorkTypeId.value === null" class="schedule-validation__empty">
              좌측에서 공종을 선택하면 규칙을 입력할 수 있어요.
            </div>
            <div v-else class="schedule-validation__form">
              <div class="schedule-validation__field">
                <label class="schedule-validation__label" for="schedule-validation-site-rule">
                  현장 규정 (siteRule)
                </label>
                <textarea
                  id="schedule-validation-site-rule"
                  class="schedule-validation__textarea"
                  rows="6"
                  :value="state.siteRuleDraft.value"
                  placeholder="현장에서 적용할 검증 규정을 자유롭게 입력하세요."
                  @input="
                    (event) =>
                      state.setSiteRuleDraft((event.target as HTMLTextAreaElement).value)
                  "
                />
              </div>

              <div class="schedule-validation__field">
                <label class="schedule-validation__label" for="schedule-validation-company-rule">
                  회사 규정 (companyRule)
                </label>
                <textarea
                  id="schedule-validation-company-rule"
                  class="schedule-validation__textarea"
                  rows="6"
                  :value="state.companyRuleDraft.value"
                  placeholder="회사 차원에서 적용할 검증 규정을 입력하세요."
                  @input="
                    (event) =>
                      state.setCompanyRuleDraft(
                        (event.target as HTMLTextAreaElement).value,
                      )
                  "
                />
              </div>

              <div v-if="state.errorMessage.value" class="schedule-validation__error">
                {{ state.errorMessage.value }}
              </div>

              <div class="schedule-validation__actions">
                <button
                  type="button"
                  class="schedule-validation__button schedule-validation__button--ghost"
                  :disabled="!state.isDirty.value || state.isSaving.value"
                  @click="state.resetDraft"
                >
                  되돌리기
                </button>
                <button
                  type="button"
                  class="schedule-validation__button schedule-validation__button--primary"
                  :disabled="!state.canSave.value"
                  @click="state.saveSelected"
                >
                  {{ state.isSaving.value ? "저장 중…" : "저장" }}
                </button>
              </div>
            </div>
          </section>
        </div>

        <Transition name="schedule-validation-toast">
          <div v-if="state.toastMessage.value" class="schedule-validation__toast" role="status">
            {{ state.toastMessage.value }}
          </div>
        </Transition>
      </template>
    </AreaCard>
  </PageContainer>
</template>

<style scoped>
.schedule-validation__notice {
  padding: 24px;
  color: var(--ink-muted);
  font-size: 14px;
}
.schedule-validation__warning {
  padding: 10px 14px;
  font-size: 12px;
  background: #fff5cc;
  color: #6b5400;
  border: 1px solid #f0d670;
  border-radius: var(--radius-control);
}

.schedule-validation__layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.schedule-validation__list {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  overflow-y: auto;
  padding: 12px;
}
.schedule-validation__list-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0 4px 8px;
}
.schedule-validation__list-empty {
  font-size: 13px;
  color: var(--ink-faint);
  padding: 12px 4px;
}
.schedule-validation__groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.schedule-validation__group-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-faint);
  padding: 4px;
}
.schedule-validation__work-types {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.schedule-validation__work-type {
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}
.schedule-validation__work-type:hover {
  background: var(--surface-3);
}
.schedule-validation__work-type--active {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}
.schedule-validation__work-type-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--primary);
  background: var(--surface-1);
  border: 1px solid var(--primary);
  border-radius: 999px;
  padding: 2px 6px;
}
.schedule-validation__work-type--has-rule:not(.schedule-validation__work-type--active)
  .schedule-validation__work-type-badge {
  color: var(--ink-muted);
  border-color: var(--outline-soft);
}

.schedule-validation__editor {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.schedule-validation__empty {
  margin: auto;
  color: var(--ink-faint);
  font-size: 14px;
}
.schedule-validation__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}
.schedule-validation__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.schedule-validation__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted);
}
.schedule-validation__textarea {
  font: inherit;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ink);
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  padding: 10px 12px;
  resize: vertical;
  min-height: 120px;
}
.schedule-validation__textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}
.schedule-validation__error {
  font-size: 12px;
  color: #c0392b;
}
.schedule-validation__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.schedule-validation__button {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.schedule-validation__button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.schedule-validation__button--ghost {
  background: var(--surface-3);
  color: var(--ink);
  border-color: var(--outline-soft);
}
.schedule-validation__button--primary {
  background: var(--primary);
  color: #fff;
}

.schedule-validation__toast {
  position: fixed;
  bottom: 24px;
  right: 32px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  padding: 10px 16px;
  border-radius: 8px;
  z-index: 40;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}
.schedule-validation-toast-enter-from,
.schedule-validation-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.schedule-validation-toast-enter-active,
.schedule-validation-toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
</style>
