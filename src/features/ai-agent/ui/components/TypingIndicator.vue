<template>
  <div
    class="typing-indicator"
    role="status"
    :aria-label="ariaLabel"
  >
    <span class="typing-indicator__sender">
      <span class="typing-indicator__sender-icon" aria-hidden="true">✦</span>
      {{ displayName }}
      <span class="typing-indicator__sender-suffix">{{ suffix }}</span>
    </span>

    <div class="typing-indicator__body" aria-hidden="true">
      <span class="typing-indicator__dot" />
      <span class="typing-indicator__dot" />
      <span class="typing-indicator__dot" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import type { TypingEntry } from "@/features/ai-agent/model/ai-agent.types";

const props = defineProps<{
  entry: TypingEntry;
}>();

const suffix = aiAgentCopy.typing.suffix;

const displayName = computed(
  () => props.entry.participantName ?? aiAgentCopy.participants.bot,
);

const ariaLabel = computed(() => `${displayName.value} ${suffix}`);
</script>

<style scoped src="../styles/TypingIndicator.css"></style>
