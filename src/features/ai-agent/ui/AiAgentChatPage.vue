<template>
  <div class="ai-agent-chat-frame">
    <DesktopAppHeader />

    <main class="ai-agent-chat">
      <ChatThreadHeader
        :title="thread?.title ?? '대화'"
        :participants="participants"
        :current-user-id="currentUserId"
        :connection-status="connectionStatus"
        :reconnect-attempts="reconnectAttempts"
        @back="handleBack"
        @rename="handleRename"
        @delete="handleDelete"
        @reconnect="handleReconnect"
      />

      <MessageList
        :messages="messages"
        :current-user-id="currentUserId"
        :has-more-older="hasMoreOlder"
        :is-loading-older="isLoadingOlder"
        :is-loading-thread="isLoadingThread"
        @load-older="loadOlder"
      />

      <ChatComposer :disabled="isAwaitingEcho || !isConnected" @send="handleSend" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { aiAgentWsClient } from "@/features/ai-agent/services/ai-agent-ws-client";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";
import { useChatViewModel } from "@/features/ai-agent/state/useChatViewModel";
import ChatComposer from "@/features/ai-agent/ui/components/ChatComposer.vue";
import ChatThreadHeader from "@/features/ai-agent/ui/components/ChatThreadHeader.vue";
import MessageList from "@/features/ai-agent/ui/components/MessageList.vue";

const props = defineProps<{
  threadId: number;
}>();

const router = useRouter();
const store = useAiAgentStore();

const {
  thread,
  messages,
  participants,
  connectionStatus,
  isAwaitingEcho,
  isLoadingOlder,
  isLoadingThread,
  hasMoreOlder,
  currentUserId,
  ensureLoaded,
  send,
  loadOlder,
  rename,
  deleteThread,
} = useChatViewModel(() => props.threadId);

const reconnectAttempts = computed(() => store.reconnectAttempts);
const isConnected = computed(() => connectionStatus.value === "open");

onMounted(() => {
  void ensureLoaded();
});

watch(
  () => props.threadId,
  () => {
    void ensureLoaded();
  },
);

async function handleSend(text: string) {
  await send(text);
}

function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push({ name: "ai-agent-threads" });
  }
}

async function handleRename(title: string) {
  await rename(title);
}

async function handleDelete() {
  const ok = await deleteThread();
  if (ok) {
    void router.push({ name: "ai-agent-threads" });
  }
}

function handleReconnect() {
  aiAgentWsClient.manualReconnect();
}
</script>

<style scoped src="./styles/AiAgentChatPage.css"></style>
