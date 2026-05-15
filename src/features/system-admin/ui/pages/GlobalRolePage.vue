<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import RoleManagementArea from "@/features/system-admin/ui/components/RoleManagementArea.vue";
</script>

<template>
  <PageContainer title="역할 관리">
    <AreaCard title="역할" :grow="1" min-height="500px">
      <RoleManagementArea />
    </AreaCard>
  </PageContainer>
</template>
