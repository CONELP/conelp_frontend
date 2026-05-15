<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import ProjectManagementArea from "@/features/system-admin/ui/components/ProjectManagementArea.vue";
import MappingManagementArea from "@/features/system-admin/ui/components/MappingManagementArea.vue";
</script>

<template>
  <PageContainer title="프로젝트 관리">
    <AreaCard title="프로젝트" :grow="1" min-height="400px">
      <ProjectManagementArea />
    </AreaCard>
    <AreaCard title="매핑" :grow="1" min-height="400px">
      <MappingManagementArea />
    </AreaCard>
  </PageContainer>
</template>
