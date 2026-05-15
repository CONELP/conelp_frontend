<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import BulkDeploymentArea from "@/features/project-admin/bulk-deployment/ui/components/BulkDeploymentArea.vue";
</script>

<template>
  <PageContainer title="일괄 배포">
    <AreaCard :grow="1" min-height="600px">
      <BulkDeploymentArea />
    </AreaCard>
  </PageContainer>
</template>
