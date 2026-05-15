<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import UserManagementArea from "@/features/system-admin/ui/components/UserManagementArea.vue";
import CompanyManagementArea from "@/features/system-admin/ui/components/CompanyManagementArea.vue";
</script>

<template>
  <PageContainer title="사용자/회사 관리">
    <AreaCard title="사용자" :grow="1" min-height="400px">
      <UserManagementArea />
    </AreaCard>
    <AreaCard title="회사" :grow="1" min-height="400px">
      <CompanyManagementArea />
    </AreaCard>
  </PageContainer>
</template>
