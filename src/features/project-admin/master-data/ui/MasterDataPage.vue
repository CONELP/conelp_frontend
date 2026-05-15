<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import LocationMasterArea from "@/features/project-admin/master-data/ui/components/LocationMasterArea.vue";
import ComponentCodeArea from "@/features/project-admin/master-data/ui/components/ComponentCodeArea.vue";
import MaterialMasterArea from "@/features/project-admin/master-data/ui/components/MaterialMasterArea.vue";
</script>

<template>
  <PageContainer title="기준정보 관리">
    <AreaCard title="작업관련" :grow="1" min-height="600px">
      <div class="master-data-page__stack">
        <LocationMasterArea />
        <hr class="master-data-page__divider" />
        <ComponentCodeArea />
        <hr class="master-data-page__divider" />
        <MaterialMasterArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>

<style scoped>
.master-data-page__stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.master-data-page__divider {
  border: 0;
  border-top: 1px solid var(--outline-soft);
  margin: 0;
}
</style>
