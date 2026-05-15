<template>
  <div
    class="message-bubble"
    :class="[
      `message-bubble--${role}`,
      { 'message-bubble--with-name': showSenderName },
    ]"
  >
    <span v-if="showSenderName" class="message-bubble__sender">
      <span
        v-if="role === 'bot'"
        class="message-bubble__sender-icon"
        aria-hidden="true"
      >
        ✦
      </span>
      {{ displayName }}
    </span>

    <div class="message-bubble__body">
      <p class="message-bubble__text">{{ message.text }}</p>
      <time class="message-bubble__time" :datetime="message.createdAt">
        {{ time }}
      </time>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import { formatBubbleTime } from "@/features/ai-agent/services/ai-agent.service";
import type { Message } from "@/features/ai-agent/model/ai-agent.types";

const props = defineProps<{
  message: Message;
  currentUserId: string | null;
}>();

const role = computed<"me" | "user" | "bot">(() => {
  if (props.message.senderType === "BOT") return "bot";
  if (
    props.message.senderType === "USER" &&
    props.message.senderId === props.currentUserId
  ) {
    return "me";
  }
  return "user";
});

const displayName = computed(() =>
  role.value === "bot" ? aiAgentCopy.participants.bot : props.message.senderName,
);

const showSenderName = computed(() => role.value !== "me");
const time = computed(() => formatBubbleTime(props.message.createdAt));
</script>

<style scoped src="../styles/MessageBubble.css"></style>
