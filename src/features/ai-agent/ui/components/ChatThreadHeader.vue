<template>
  <header class="chat-header">
    <button
      class="chat-header__back"
      type="button"
      aria-label="대화 목록으로 돌아가기"
      @click="emit('back')"
    >
      <span aria-hidden="true">←</span>
    </button>

    <div class="chat-header__title-block">
      <input
        v-if="editing"
        ref="inputRef"
        v-model="draft"
        class="chat-header__title-input"
        type="text"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="cancel"
        @blur="commit"
      />
      <h1
        v-else
        class="chat-header__title"
        :title="title"
        @click="startEditing"
      >
        {{ title }}
      </h1>

      <div v-if="participantChips.length > 0" class="chat-header__chips">
        <span
          v-for="chip in participantChips"
          :key="chip.key"
          class="chat-header__chip"
          :class="`chat-header__chip--${chip.kind}`"
        >
          <span class="chat-header__chip-dot" aria-hidden="true" />
          {{ chip.label }}
        </span>
      </div>
    </div>

    <div class="chat-header__actions">
      <ConnectionBadge
        :status="connectionStatus"
        :attempts="reconnectAttempts"
        @reconnect="emit('reconnect')"
      />
      <button
        class="chat-header__delete"
        type="button"
        aria-label="대화 삭제"
        @click="handleDelete"
      >
        삭제
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import type {
  ConnectionStatus,
  Participant,
} from "@/features/ai-agent/model/ai-agent.types";
import ConnectionBadge from "@/features/ai-agent/ui/components/ConnectionBadge.vue";

const props = defineProps<{
  title: string;
  participants: Participant[];
  participantNamesById: Map<string, string>;
  currentUserId: string | null;
  connectionStatus: ConnectionStatus;
  reconnectAttempts: number;
}>();

const emit = defineEmits<{
  back: [];
  rename: [title: string];
  delete: [];
  reconnect: [];
}>();

const editing = ref(false);
const draft = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

const participantChips = computed(() => {
  return props.participants.map((p) => {
    const isMe =
      p.participantType === "USER" && p.participantId === props.currentUserId;
    const kind = p.participantType === "BOT" ? "bot" : isMe ? "me" : "user";
    const knownName = props.participantNamesById.get(p.participantId);
    const label = isMe
      ? "나"
      : knownName ??
        (p.participantType === "BOT"
          ? aiAgentCopy.participants.bot
          : "참여자");
    return {
      key: `${p.participantType}-${p.participantId}`,
      label,
      kind,
    };
  });
});

async function startEditing() {
  draft.value = props.title;
  editing.value = true;
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
}

function commit() {
  if (!editing.value) return;
  const next = draft.value.trim();
  editing.value = false;
  if (next && next !== props.title) {
    emit("rename", next);
  }
}

function cancel() {
  editing.value = false;
  draft.value = props.title;
}

function handleDelete() {
  if (window.confirm("이 대화를 삭제할까요? 되돌릴 수 없어요.")) {
    emit("delete");
  }
}
</script>

<style scoped src="../styles/ChatThreadHeader.css"></style>
