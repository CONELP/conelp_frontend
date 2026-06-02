<script setup lang="ts">
import { onMounted, watch } from "vue";

import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import DocTypeSettingArea from "@/features/project-admin/document-setting/ui/components/DocTypeSettingArea.vue";
import DrSettingArea from "@/features/project-admin/document-setting/ui/components/DrSettingArea.vue";
import { useDocumentSetting } from "@/features/project-admin/document-setting/state/useDocumentSetting";
import { useSelectedProjectId } from "@/features/project-admin/_shared/state/useSelectedProjectId";

const { selectedProjectId } = useSelectedProjectId();
const state = useDocumentSetting();

const tabs = [
  { value: "DR", label: "DR (작업일보)" },
  { value: "MIR", label: "MIR (자재검수요청서)" },
  { value: "MAT_INOUT", label: "MAT_INOUT (자재 수불현황표)" },
  { value: "CAT", label: "CAT" },
  { value: "CCST", label: "CCST" },
];

onMounted(() => {
  if (selectedProjectId.value) void state.load(selectedProjectId.value);
});

watch(selectedProjectId, (pid) => {
  if (pid) void state.load(pid);
});
</script>

<template>
  <PageContainer title="문서 설정">
    <AreaCard
      :grow="1"
      min-height="600px"
      :has-tabs="true"
      :tabs="tabs"
      default-tab="DR"
    >
      <template #tab-MIR>
        <DocTypeSettingArea
          doc-type="MIR"
          :selected-project-id="selectedProjectId"
          :state="state"
        />
      </template>
      <template #tab-CAT>
        <DocTypeSettingArea
          doc-type="CAT"
          :selected-project-id="selectedProjectId"
          :state="state"
        />
      </template>
      <template #tab-CCST>
        <DocTypeSettingArea
          doc-type="CCST"
          :selected-project-id="selectedProjectId"
          :state="state"
        />
      </template>
      <template #tab-MAT_INOUT>
        <DocTypeSettingArea
          doc-type="MAT_INOUT"
          :selected-project-id="selectedProjectId"
          :state="state"
        />
      </template>
      <template #tab-DR>
        <DrSettingArea :selected-project-id="selectedProjectId" :state="state" />
      </template>
    </AreaCard>
  </PageContainer>
</template>
