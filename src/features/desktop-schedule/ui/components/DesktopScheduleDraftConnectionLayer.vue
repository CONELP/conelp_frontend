<template>
  <path
    v-if="path"
    :d="path"
    fill="none"
    pointer-events="none"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.9"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

type ConnectionCreationState = {
  kind: "work-connection" | "critical-path";
  sourceItemId: string;
  pathId?: number;
  colorHex?: string;
};

const props = defineProps<{
  path: string | null;
  connectionCreationState: ConnectionCreationState | null;
}>();

const strokeColor = computed(() =>
  props.connectionCreationState?.kind === "critical-path"
    ? props.connectionCreationState.colorHex ?? "#dc2626"
    : "#64748b",
);

const strokeWidth = computed(() =>
  props.connectionCreationState?.kind === "critical-path" ? 2.25 : 2,
);
</script>
