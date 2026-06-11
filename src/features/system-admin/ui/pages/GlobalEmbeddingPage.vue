<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import EmbeddingManagementArea from "@/features/system-admin/ui/components/EmbeddingManagementArea.vue";
</script>

<template>
  <PageContainer title="임베딩 관리">
    <AreaCard title="임베딩" :grow="1" min-height="300px">
      <EmbeddingManagementArea />
    </AreaCard>
  </PageContainer>
</template>
