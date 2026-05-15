<script setup lang="ts">
import PageContainer from "@/features/project-admin/_shared/ui/components/PageContainer.vue";
import AreaCard from "@/features/project-admin/_shared/ui/components/AreaCard.vue";
import WorkClassificationArea from "@/features/system-admin/ui/components/standard/WorkClassificationArea.vue";
import ComponentTypeArea from "@/features/system-admin/ui/components/standard/ComponentTypeArea.vue";
import WorkStepArea from "@/features/system-admin/ui/components/standard/WorkStepArea.vue";
import EquipmentMasterArea from "@/features/system-admin/ui/components/standard/EquipmentMasterArea.vue";
import LaborTypeArea from "@/features/system-admin/ui/components/standard/LaborTypeArea.vue";
</script>

<template>
  <PageContainer title="표준 데이터">
    <AreaCard title="공종분류" :grow="1" min-height="320px">
      <WorkClassificationArea />
    </AreaCard>
    <AreaCard title="부재타입" :grow="1" min-height="240px">
      <ComponentTypeArea />
    </AreaCard>
    <AreaCard title="작업절차" :grow="1" min-height="320px">
      <WorkStepArea />
    </AreaCard>
    <AreaCard title="장비" :grow="1" min-height="320px">
      <EquipmentMasterArea />
    </AreaCard>
    <AreaCard title="직종" :grow="1" min-height="320px">
      <LaborTypeArea />
    </AreaCard>
  </PageContainer>
</template>
