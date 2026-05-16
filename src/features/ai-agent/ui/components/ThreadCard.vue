<template>
  <article class="thread-card" @click="emit('click')">
    <header class="thread-card__head">
      <h3 class="thread-card__title">{{ thread.title }}</h3>
      <button
        ref="menuButton"
        class="thread-card__menu"
        type="button"
        aria-label="더 보기"
        @click.stop="toggleMenu"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      <div v-if="menuOpen" class="thread-card__menu-popover" @click.stop>
        <button
          class="thread-card__menu-item thread-card__menu-item--danger"
          type="button"
          @click="handleDelete"
        >
          대화 삭제
        </button>
      </div>
    </header>

    <p class="thread-card__preview" :class="{ 'thread-card__preview--empty': !preview }">
      {{ preview || "아직 메시지가 없어요" }}
    </p>

    <footer class="thread-card__foot">
      <span class="thread-card__time">{{ relativeTime }}</span>
      <span v-if="hasBot" class="thread-card__chip">
        <span class="thread-card__chip-dot" aria-hidden="true" />
        {{ botLabel }}
      </span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import {
  formatRelativeTime,
  previewMessageText,
} from "@/features/ai-agent/services/ai-agent.service";
import type { Message, Thread } from "@/features/ai-agent/model/ai-agent.types";

const props = defineProps<{
  thread: Thread;
  lastMessage: Message | undefined;
  botName?: string | null;
}>();

const emit = defineEmits<{
  click: [];
  delete: [];
}>();

const botLabel = computed(() => props.botName || aiAgentCopy.participants.bot);
const menuOpen = ref(false);
const menuButton = ref<HTMLButtonElement | null>(null);

const preview = computed(() => previewMessageText(props.lastMessage));
const relativeTime = computed(() =>
  formatRelativeTime(props.lastMessage?.createdAt ?? props.thread.createdAt),
);
const hasBot = computed(() =>
  props.thread.participants.some((p) => p.participantType === "BOT"),
);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function handleDelete() {
  menuOpen.value = false;
  if (window.confirm("이 대화를 삭제할까요? 되돌릴 수 없어요.")) {
    emit("delete");
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) return;
  const target = event.target as Node | null;
  if (target && menuButton.value && !menuButton.value.contains(target)) {
    menuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", handleDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", handleDocumentClick));
</script>

<style scoped src="../styles/ThreadCard.css"></style>
