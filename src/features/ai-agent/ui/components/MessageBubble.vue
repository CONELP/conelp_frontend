<template>
  <div
    class="message-bubble"
    :class="[
      `message-bubble--${role}`,
      {
        'message-bubble--with-name': showSenderName,
        'message-bubble--mentions-me': mentionsMe,
      },
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
      <p v-if="message.text" class="message-bubble__text">
        <template v-for="(part, idx) in textParts" :key="idx">
          <span
            v-if="part.kind === 'mention'"
            class="message-bubble__mention"
            :class="{
              'message-bubble__mention--self': part.isSelf,
              'message-bubble__mention--bot': part.isBot,
            }"
          >{{ part.text }}</span>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>

      <ul
        v-if="message.attachments.length > 0"
        class="message-bubble__attachments"
      >
        <li
          v-for="attachment in message.attachments"
          :key="attachment.id"
          class="message-bubble__attachment"
          :class="{ 'message-bubble__attachment--stale': isStale(attachment) }"
        >
          <a
            v-if="isImage(attachment) && previewUrlOf(attachment)"
            class="message-bubble__attachment-image"
            :href="previewUrlOf(attachment) ?? ''"
            :download="attachment.fileName"
            target="_blank"
            rel="noopener"
          >
            <img
              :src="previewUrlOf(attachment) ?? ''"
              :alt="attachment.fileName"
            />
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

          <button
            v-else-if="attachment.downloadUrl"
            class="message-bubble__attachment-link message-bubble__attachment-link--button"
            type="button"
            :disabled="downloadingIds.has(attachment.id)"
            @click="handleDownload(attachment)"
          >
            <span class="message-bubble__attachment-icon" aria-hidden="true">📎</span>
            <span class="message-bubble__attachment-name">{{ attachment.fileName }}</span>
            <span class="message-bubble__attachment-size">
              {{ formatSize(attachment.sizeBytes) }}
            </span>
            <span class="message-bubble__attachment-action">
              {{
                downloadingIds.has(attachment.id)
                  ? attachmentsCopy.downloading
                  : attachmentsCopy.download
              }}
            </span>
          </button>

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
import { computed, onBeforeUnmount, reactive, watchEffect } from "vue";

import { chatMessageApi } from "@/features/ai-agent/api/chat-message.api";
import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import {
  formatBubbleTime,
  formatFileSize,
  isImageAttachment,
} from "@/features/ai-agent/services/ai-agent.service";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";
import type {
  Message,
  MessageAttachment,
} from "@/features/ai-agent/model/ai-agent.types";

const props = defineProps<{
  message: Message;
  currentUserId: string | null;
  participantNamesById?: Map<string, string>;
}>();

const BOT_DISPLAY_NAME = "Hermes";
const UNKNOWN_USER_LABEL = "알 수 없는 사용자";

interface TextPart {
  kind: "text" | "mention";
  text: string;
  isSelf?: boolean;
  isBot?: boolean;
}

const store = useAiAgentStore();
const attachmentsCopy = aiAgentCopy.attachments;

const lazyPreviewUrls = reactive(new Map<string, string>());
const downloadingIds = reactive(new Set<string>());
const lazyAttempted = new Set<string>();

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

const mentionsMe = computed(() => {
  if (!props.currentUserId) return false;
  return props.message.mentions.some(
    (m) => m.participantType === "USER" && m.participantId === props.currentUserId,
  );
});

const textParts = computed<TextPart[]>(() => {
  const text = props.message.text;
  if (!text) return [];
  const mentions = props.message.mentions;
  if (!mentions || mentions.length === 0) {
    return [{ kind: "text", text }];
  }

  const resolved = mentions.map((m) => {
    const name =
      m.participantType === "BOT"
        ? BOT_DISPLAY_NAME
        : props.participantNamesById?.get(m.participantId) ?? UNKNOWN_USER_LABEL;
    return {
      participantType: m.participantType,
      participantId: m.participantId,
      displayName: name,
      isSelf:
        m.participantType === "USER" && m.participantId === props.currentUserId,
      isBot: m.participantType === "BOT",
    };
  });

  let parts: TextPart[] = [{ kind: "text", text }];
  for (const m of resolved) {
    const pattern = `@${m.displayName}`;
    if (!pattern || pattern === "@") continue;
    const next: TextPart[] = [];
    for (const part of parts) {
      if (part.kind !== "text" || !part.text.includes(pattern)) {
        next.push(part);
        continue;
      }
      let remaining = part.text;
      let idx = remaining.indexOf(pattern);
      while (idx >= 0) {
        if (idx > 0) {
          next.push({ kind: "text", text: remaining.slice(0, idx) });
        }
        next.push({
          kind: "mention",
          text: pattern,
          isSelf: m.isSelf,
          isBot: m.isBot,
        });
        remaining = remaining.slice(idx + pattern.length);
        idx = remaining.indexOf(pattern);
      }
      if (remaining) next.push({ kind: "text", text: remaining });
    }
    parts = next;
  }
  return parts;
});

function isImage(attachment: MessageAttachment) {
  return isImageAttachment(attachment);
}

function formatSize(bytes: number) {
  return formatFileSize(bytes);
}

function previewUrlOf(attachment: MessageAttachment): string | null {
  return attachment.blobUrl ?? lazyPreviewUrls.get(attachment.id) ?? null;
}

function isStale(attachment: MessageAttachment): boolean {
  return !previewUrlOf(attachment) && !attachment.downloadUrl;
}

async function ensureImagePreview(attachment: MessageAttachment) {
  if (!isImage(attachment)) return;
  if (attachment.blobUrl) return;
  if (lazyPreviewUrls.has(attachment.id)) return;
  if (lazyAttempted.has(attachment.id)) return;
  if (!attachment.downloadUrl) return;
  lazyAttempted.add(attachment.id);
  try {
    const blob = await chatMessageApi.fetchAttachment(attachment.id);
    lazyPreviewUrls.set(attachment.id, URL.createObjectURL(blob));
  } catch {
    // 미리보기 실패 — 사용자는 다운로드 버튼으로 재시도 가능
  }
}

async function handleDownload(attachment: MessageAttachment) {
  if (downloadingIds.has(attachment.id)) return;
  if (!attachment.downloadUrl) return;
  downloadingIds.add(attachment.id);
  try {
    const blob = await chatMessageApi.fetchAttachment(attachment.id, true);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : attachmentsCopy.downloadFailed;
    store.pushError(message);
  } finally {
    downloadingIds.delete(attachment.id);
  }
}

watchEffect(() => {
  for (const attachment of props.message.attachments) {
    void ensureImagePreview(attachment);
  }
});

onBeforeUnmount(() => {
  for (const url of lazyPreviewUrls.values()) {
    URL.revokeObjectURL(url);
  }
  lazyPreviewUrls.clear();
});
</script>

<style scoped src="../styles/MessageBubble.css"></style>
