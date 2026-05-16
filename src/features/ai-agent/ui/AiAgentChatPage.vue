<template>
  <div class="ai-agent-chat-frame">
    <DesktopAppHeader />

    <main class="ai-agent-chat">
      <ChatThreadHeader
        :title="thread?.title ?? '대화'"
        :participants="participants"
        :participant-names-by-id="participantNamesById"
        :current-user-id="currentUserId"
        :owner-user-id="thread?.ownerUserId ?? null"
        :connection-status="connectionStatus"
        :reconnect-attempts="reconnectAttempts"
        @back="handleBack"
        @rename="handleRename"
        @delete="handleDelete"
        @reconnect="handleReconnect"
        @invite="handleOpenInvite"
      />

      <MessageList
        :messages="messages"
        :typing-participants="typingParticipants"
        :current-user-id="currentUserId"
        :has-more-older="hasMoreOlder"
        :is-loading-older="isLoadingOlder"
        :is-loading-thread="isLoadingThread"
        @load-older="loadOlder"
      />

      <ChatComposer
        :disabled="isAwaitingEcho || !isConnected"
        @send="handleSend"
        @validation-error="handleValidationError"
      />
    </main>

    <InviteParticipantDialog
      :open="isInviteOpen"
      :members="invitableMembers"
      :loading="isLoadingMembers"
      :inviting-id="invitingUserId"
      @update:open="handleInviteOpenChange"
      @invite="handleInviteUser"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import type { ProjectMember } from "@/features/ai-agent/model/ai-agent.types";
import { aiAgentWsClient } from "@/features/ai-agent/services/ai-agent-ws-client";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";
import { useChatViewModel } from "@/features/ai-agent/state/useChatViewModel";
import ChatComposer from "@/features/ai-agent/ui/components/ChatComposer.vue";
import ChatThreadHeader from "@/features/ai-agent/ui/components/ChatThreadHeader.vue";
import InviteParticipantDialog from "@/features/ai-agent/ui/components/InviteParticipantDialog.vue";
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
  typingParticipants,
  participantNamesById,
  ensureLoaded,
  send,
  loadOlder,
  rename,
  deleteThread,
  loadInvitableMembers,
  inviteUser,
} = useChatViewModel(() => props.threadId);

const isInviteOpen = ref(false);
const invitableMembers = ref<ProjectMember[]>([]);
const isLoadingMembers = ref(false);
const invitingUserId = ref<string | null>(null);

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

async function handleSend(text: string, files: File[]) {
  await send(text, files);
}

function handleValidationError(message: string) {
  store.pushError(message);
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

async function refreshInvitableMembers() {
  isLoadingMembers.value = true;
  try {
    invitableMembers.value = await loadInvitableMembers();
  } finally {
    isLoadingMembers.value = false;
  }
}

async function handleOpenInvite() {
  isInviteOpen.value = true;
  await refreshInvitableMembers();
}

function handleInviteOpenChange(open: boolean) {
  isInviteOpen.value = open;
  if (!open) {
    invitableMembers.value = [];
  }
}

async function handleInviteUser(userId: string) {
  if (invitingUserId.value !== null) return;
  invitingUserId.value = userId;
  try {
    const ok = await inviteUser(userId);
    if (ok) {
      invitableMembers.value = invitableMembers.value.filter(
        (m) => m.userId !== userId,
      );
    }
  } finally {
    invitingUserId.value = null;
  }
}
</script>

<style scoped src="./styles/AiAgentChatPage.css"></style>
