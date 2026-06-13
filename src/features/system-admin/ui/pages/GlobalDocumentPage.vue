<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import DocumentManagementArea from "@/features/system-admin/ui/components/DocumentManagementArea.vue";
</script>

<template>
  <PageContainer title="문서 관리">
    <AreaCard title="전 프로젝트 문서" :grow="1" min-height="600px">
      <DocumentManagementArea />
    </AreaCard>
  </PageContainer>
</template>
