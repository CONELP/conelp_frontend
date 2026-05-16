<template>
  <div ref="scrollEl" class="message-list" @scroll="handleScroll">
    <div
      ref="topSentinel"
      class="message-list__sentinel"
      aria-hidden="true"
    />

    <p v-if="isLoadingOlder" class="message-list__hint">이전 메시지를 불러오는 중…</p>
    <p v-else-if="!hasMoreOlder && messages.length > 0" class="message-list__hint">
      대화의 시작입니다
    </p>

    <template v-for="(item, index) in items" :key="item.kind + '-' + item.id">
      <div v-if="item.kind === 'divider'" class="message-list__divider">
        <span>{{ item.label }}</span>
      </div>

      <SystemMessageBanner
        v-else-if="item.kind === 'system'"
        :text="item.message.text"
        :created-at="item.message.createdAt"
      />

      <MessageBubble
        v-else
        :message="item.message"
        :current-user-id="currentUserId"
      />
    </template>

    <p
      v-if="messages.length === 0 && !isLoadingThread && typingParticipants.length === 0"
      class="message-list__empty"
    >
      메시지를 보내 대화를 시작하세요
    </p>

    <TypingIndicator
      v-for="entry in typingParticipants"
      :key="`${entry.participantType}:${entry.participantId}`"
      :entry="entry"
    />

    <button
      v-if="!isPinnedToBottom && messages.length > 0"
      class="message-list__scroll-bottom"
      type="button"
      aria-label="가장 최근 메시지로 이동"
      @click="scrollToBottom(true)"
    >
      ↓
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

import {
  formatDayDivider,
  isSameDay,
} from "@/features/ai-agent/services/ai-agent.service";
import type {
  Message,
  TypingEntry,
} from "@/features/ai-agent/model/ai-agent.types";
import MessageBubble from "@/features/ai-agent/ui/components/MessageBubble.vue";
import SystemMessageBanner from "@/features/ai-agent/ui/components/SystemMessageBanner.vue";
import TypingIndicator from "@/features/ai-agent/ui/components/TypingIndicator.vue";

interface DividerItem {
  kind: "divider";
  id: string;
  label: string;
}
interface MessageItem {
  kind: "message" | "system";
  id: number;
  message: Message;
}
type ListItem = DividerItem | MessageItem;

const props = defineProps<{
  messages: Message[];
  typingParticipants: TypingEntry[];
  currentUserId: string | null;
  hasMoreOlder: boolean;
  isLoadingOlder: boolean;
  isLoadingThread: boolean;
}>();

const emit = defineEmits<{
  loadOlder: [];
}>();

const scrollEl = ref<HTMLDivElement | null>(null);
const topSentinel = ref<HTMLDivElement | null>(null);
const isPinnedToBottom = ref(true);
let observer: IntersectionObserver | null = null;
let preserveScrollHeight: number | null = null;

const items = computed<ListItem[]>(() => {
  const out: ListItem[] = [];
  let lastDate: string | null = null;
  for (const message of props.messages) {
    if (!lastDate || !isSameDay(lastDate, message.createdAt)) {
      out.push({
        kind: "divider",
        id: `d-${message.createdAt}`,
        label: formatDayDivider(message.createdAt),
      });
      lastDate = message.createdAt;
    }
    out.push({
      kind: message.senderType === "SYSTEM" ? "system" : "message",
      id: message.id,
      message,
    });
  }
  return out;
});

function handleScroll() {
  const el = scrollEl.value;
  if (!el) return;
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  isPinnedToBottom.value = distanceFromBottom < 80;
}

function scrollToBottom(force = false) {
  const el = scrollEl.value;
  if (!el) return;
  if (!force && !isPinnedToBottom.value) return;
  el.scrollTop = el.scrollHeight;
  isPinnedToBottom.value = true;
}

watch(
  () => props.messages.length,
  async (next, prev) => {
    await nextTick();
    if (preserveScrollHeight !== null) {
      const el = scrollEl.value;
      if (el) {
        const delta = el.scrollHeight - preserveScrollHeight;
        el.scrollTop += delta;
      }
      preserveScrollHeight = null;
      return;
    }
    if (next > prev) {
      scrollToBottom();
    }
  },
);

watch(
  () => props.typingParticipants.length,
  async (next, prev) => {
    if (next > prev) {
      await nextTick();
      scrollToBottom();
    }
  },
);

onMounted(async () => {
  await nextTick();
  scrollToBottom(true);

  if (topSentinel.value && scrollEl.value && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            props.hasMoreOlder &&
            !props.isLoadingOlder &&
            props.messages.length > 0
          ) {
            const el = scrollEl.value;
            preserveScrollHeight = el ? el.scrollHeight : null;
            emit("loadOlder");
          }
        }
      },
      { root: scrollEl.value, threshold: 0.1 },
    );
    observer.observe(topSentinel.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});

defineExpose({ scrollToBottom });
</script>

<style scoped src="../styles/MessageList.css"></style>
