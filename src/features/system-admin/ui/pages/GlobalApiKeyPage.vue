<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import ApiKeyManagementArea from "@/features/system-admin/ui/components/ApiKeyManagementArea.vue";
</script>

<template>
  <PageContainer title="API 키">
    <AreaCard title="API 키 관리 (AI 에이전트용)" :grow="1" min-height="500px">
      <ApiKeyManagementArea />
    </AreaCard>
  </PageContainer>
</template>
