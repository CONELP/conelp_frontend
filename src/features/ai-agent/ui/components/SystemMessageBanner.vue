<template>
  <div class="system-banner" role="note">
    <span class="system-banner__pill">{{ text }}</span>
    <time class="system-banner__time" :datetime="createdAt">{{ time }}</time>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { formatBubbleTime } from "@/features/ai-agent/services/ai-agent.service";

const props = defineProps<{
  text: string;
  createdAt: string;
}>();

const time = computed(() => formatBubbleTime(props.createdAt));
</script>

<style scoped src="../styles/SystemMessageBanner.css"></style>
