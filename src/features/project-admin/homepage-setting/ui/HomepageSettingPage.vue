<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import DailyReportCredentialArea from "@/features/project-admin/homepage-setting/ui/components/DailyReportCredentialArea.vue";
</script>

<template>
  <PageContainer title="홈페이지 입력정보">
    <AreaCard
      :grow="1"
      min-height="600px"
      :has-tabs="true"
      :tabs="[{ value: 'daily-report', label: '작업일보' }]"
      default-tab="daily-report"
    >
      <template #tab-daily-report>
        <DailyReportCredentialArea />
      </template>
    </AreaCard>
  </PageContainer>
</template>
