<template>
  <button class="new-thread-card" type="button" @click="$emit('click')">
    <span class="new-thread-card__plus" aria-hidden="true">+</span>
    <span class="new-thread-card__title">{{ copy.title }}</span>
    <span class="new-thread-card__description">{{ copy.description }}</span>
  </button>
</template>

<script setup lang="ts">
import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";

defineEmits<{
  click: [];
}>();

const copy = aiAgentCopy.newThreadCard;
</script>

<style scoped src="../styles/NewThreadCard.css"></style>
