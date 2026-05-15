<script setup lang="ts">
import { ref, watch } from "vue";

interface TabDefinition {
  value: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    title?: string;
    minHeight?: string;
    grow?: number;
    hasTabs?: boolean;
    tabs?: TabDefinition[];
    defaultTab?: string;
  }>(),
  {
    minHeight: "300px",
    grow: 0.7,
    hasTabs: false,
  },
);

const activeTab = ref(props.defaultTab ?? props.tabs?.[0]?.value ?? "");

watch(
  () => props.defaultTab,
  (val) => {
    if (val) activeTab.value = val;
  },
);
</script>

<template>
  <div
    v-if="!hasTabs"
    class="area-card"
    :style="{ minHeight, flexGrow: grow, flexBasis: '0%' }"
  >
    <h3 v-if="title" class="area-card__title">{{ title }}</h3>
    <div class="area-card__body">
      <slot />
    </div>
  </div>

  <div v-else class="area-card-tabs" :style="{ flexGrow: grow, flexBasis: '0%' }">
    <div class="area-card-tabs__list">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        :class="[
          'area-card-tabs__trigger',
          { 'area-card-tabs__trigger--active': activeTab === tab.value },
        ]"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="area-card-tabs__panel" :style="{ minHeight }">
      <template v-for="tab in tabs" :key="tab.value">
        <div v-if="activeTab === tab.value" class="area-card-tabs__content">
          <slot :name="`tab-${tab.value}`" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.area-card {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.area-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}
.area-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 12px;
  min-height: 0;
}

.area-card-tabs {
  display: flex;
  flex-direction: column;
}
.area-card-tabs__list {
  display: flex;
  align-items: flex-end;
  position: relative;
  z-index: 1;
}
.area-card-tabs__trigger {
  padding: 8px 18px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
  background: var(--surface-3);
  border: 1px solid var(--outline-soft);
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  margin-bottom: -1px;
}
.area-card-tabs__trigger + .area-card-tabs__trigger {
  border-left: none;
}
.area-card-tabs__trigger:hover {
  background: #ececec;
}
.area-card-tabs__trigger--active {
  background: var(--surface-1);
  color: var(--ink);
  border-bottom-color: transparent;
}
.area-card-tabs__panel {
  flex: 1;
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: 0 var(--radius-control) var(--radius-control) var(--radius-control);
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.area-card-tabs__content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
