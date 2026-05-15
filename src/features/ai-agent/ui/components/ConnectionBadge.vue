<template>
  <button
    class="connection-badge"
    :class="`connection-badge--${status}`"
    type="button"
    :aria-label="ariaLabel"
    :disabled="status !== 'closed'"
    @click="handleClick"
  >
    <span class="connection-badge__dot" aria-hidden="true" />
    <span class="connection-badge__label">{{ label }}</span>
    <span
      v-if="status === 'reconnecting' && (attempts ?? 0) > 0"
      class="connection-badge__attempts"
    >
      {{ attempts }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import type { ConnectionStatus } from "@/features/ai-agent/model/ai-agent.types";

const props = defineProps<{
  status: ConnectionStatus;
  attempts?: number;
}>();

const emit = defineEmits<{
  reconnect: [];
}>();

const label = computed(() => {
  switch (props.status) {
    case "open":
      return aiAgentCopy.connection.open;
    case "connecting":
      return aiAgentCopy.connection.connecting;
    case "reconnecting":
      return aiAgentCopy.connection.reconnecting;
    case "closed":
      return aiAgentCopy.connection.reconnect;
    case "idle":
    default:
      return aiAgentCopy.connection.idle;
  }
});

const ariaLabel = computed(() => `WebSocket 상태: ${label.value}`);

function handleClick() {
  if (props.status === "closed") {
    emit("reconnect");
  }
}
</script>

<style scoped src="../styles/ConnectionBadge.css"></style>
