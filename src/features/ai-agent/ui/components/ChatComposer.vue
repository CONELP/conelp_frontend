<template>
  <form class="chat-composer" @submit.prevent="handleSubmit">
    <textarea
      ref="textareaRef"
      v-model="text"
      class="chat-composer__textarea"
      :placeholder="copy.placeholder"
      :disabled="disabled"
      rows="1"
      @keydown="handleKeydown"
      @input="autoResize"
    />

    <button
      class="chat-composer__send"
      type="submit"
      :disabled="!canSend"
      :aria-label="disabled ? copy.sending : copy.send"
    >
      <span v-if="disabled" class="chat-composer__spinner" aria-hidden="true" />
      <span v-else aria-hidden="true">→</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";

const props = defineProps<{
  disabled: boolean;
}>();

const emit = defineEmits<{
  send: [text: string];
}>();

const copy = aiAgentCopy.composer;
const text = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const canSend = computed(() => !props.disabled && text.value.trim().length > 0);

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    handleSubmit();
  }
}

async function handleSubmit() {
  if (!canSend.value) return;
  const value = text.value.trim();
  emit("send", value);
  text.value = "";
  await nextTick();
  autoResize();
}

watch(
  () => props.disabled,
  async (next) => {
    if (!next) {
      await nextTick();
      textareaRef.value?.focus();
    }
  },
);
</script>

<style scoped src="../styles/ChatComposer.css"></style>
