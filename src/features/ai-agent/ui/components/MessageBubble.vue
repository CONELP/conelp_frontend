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
      <p v-if="message.text" class="message-bubble__text">{{ message.text }}</p>

      <ul
        v-if="message.attachments.length > 0"
        class="message-bubble__attachments"
      >
        <li
          v-for="attachment in message.attachments"
          :key="attachment.id"
          class="message-bubble__attachment"
          :class="{ 'message-bubble__attachment--stale': !attachment.blobUrl }"
        >
          <a
            v-if="isImage(attachment) && attachment.blobUrl"
            class="message-bubble__attachment-image"
            :href="attachment.blobUrl"
            :download="attachment.fileName"
            target="_blank"
            rel="noopener"
          >
            <img :src="attachment.blobUrl" :alt="attachment.fileName" />
          </a>

          <a
            v-else-if="attachment.blobUrl"
            class="message-bubble__attachment-link"
            :href="attachment.blobUrl"
            :download="attachment.fileName"
            target="_blank"
            rel="noopener"
          >
            <span class="message-bubble__attachment-icon" aria-hidden="true">📎</span>
            <span class="message-bubble__attachment-name">{{ attachment.fileName }}</span>
            <span class="message-bubble__attachment-size">
              {{ formatSize(attachment.sizeBytes) }}
            </span>
            <span class="message-bubble__attachment-action">
              {{ attachmentsCopy.download }}
            </span>
          </a>

          <div v-else class="message-bubble__attachment-stale">
            <span class="message-bubble__attachment-icon" aria-hidden="true">📎</span>
            <span class="message-bubble__attachment-name">{{ attachment.fileName }}</span>
            <span class="message-bubble__attachment-size">
              {{ formatSize(attachment.sizeBytes) }}
            </span>
            <span class="message-bubble__attachment-stale-hint">
              {{ attachmentsCopy.staleHint }}
            </span>
          </div>
        </li>
      </ul>

      <time class="message-bubble__time" :datetime="message.createdAt">
        {{ time }}
      </time>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import {
  formatBubbleTime,
  formatFileSize,
  isImageAttachment,
} from "@/features/ai-agent/services/ai-agent.service";
import type {
  Message,
  MessageAttachment,
} from "@/features/ai-agent/model/ai-agent.types";

const props = defineProps<{
  message: Message;
  currentUserId: string | null;
}>();

const attachmentsCopy = aiAgentCopy.attachments;

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

const displayName = computed(
  () => props.message.senderName || aiAgentCopy.participants.bot,
);

const showSenderName = computed(() => role.value !== "me");
const time = computed(() => formatBubbleTime(props.message.createdAt));

function isImage(attachment: MessageAttachment) {
  return isImageAttachment(attachment);
}

function formatSize(bytes: number) {
  return formatFileSize(bytes);
}
</script>

<style scoped src="../styles/MessageBubble.css"></style>
