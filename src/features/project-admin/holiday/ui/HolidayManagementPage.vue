<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import HolidayCalendarArea from "@/features/project-admin/holiday/ui/components/HolidayCalendarArea.vue";
</script>

<template>
  <PageContainer title="휴일 관리">
    <AreaCard :grow="1" min-height="600px">
      <HolidayCalendarArea />
    </AreaCard>
  </PageContainer>
</template>
