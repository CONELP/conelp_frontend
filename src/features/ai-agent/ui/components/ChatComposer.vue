<template>
  <form class="chat-composer" @submit.prevent="handleSubmit">
    <ul v-if="pendingFiles.length > 0" class="chat-composer__files" aria-label="첨부 파일">
      <li
        v-for="(file, index) in pendingFiles"
        :key="`${file.name}-${index}`"
        class="chat-composer__file"
      >
        <span class="chat-composer__file-icon" aria-hidden="true">📎</span>
        <span class="chat-composer__file-name">{{ file.name }}</span>
        <span class="chat-composer__file-size">{{ formatFileSize(file.size) }}</span>
        <button
          class="chat-composer__file-remove"
          type="button"
          :aria-label="`${copy.removeFile}: ${file.name}`"
          @click="removeFile(index)"
        >
          ×
        </button>
      </li>
    </ul>

    <div class="chat-composer__row">
      <button
        class="chat-composer__attach"
        type="button"
        :aria-label="copy.attach"
        :disabled="disabled || pendingFiles.length >= maxFiles"
        @click="openFilePicker"
      >
        <span aria-hidden="true">📎</span>
      </button>

      <input
        ref="fileInputRef"
        class="chat-composer__file-input"
        type="file"
        multiple
        @change="handleFilesSelected"
      />

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
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import {
  formatFileSize,
  MAX_ATTACHMENTS_PER_MESSAGE,
  validateAttachments,
} from "@/features/ai-agent/services/ai-agent.service";

const props = defineProps<{
  disabled: boolean;
}>();

const emit = defineEmits<{
  send: [text: string, files: File[]];
  validationError: [message: string];
}>();

const copy = aiAgentCopy.composer;
const validationCopy = aiAgentCopy.validation;
const maxFiles = MAX_ATTACHMENTS_PER_MESSAGE;
const text = ref("");
const pendingFiles = ref<File[]>([]);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const canSend = computed(
  () =>
    !props.disabled &&
    (text.value.trim().length > 0 || pendingFiles.value.length > 0),
);

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
  const files = [...pendingFiles.value];
  emit("send", value, files);
  text.value = "";
  pendingFiles.value = [];
  await nextTick();
  autoResize();
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = input.files ? Array.from(input.files) : [];
  input.value = "";
  if (selected.length === 0) return;
  appendFiles(selected);
}

function appendFiles(files: File[]) {
  const merged = [...pendingFiles.value, ...files];
  const error = validateAttachments(merged);
  if (error) {
    if (error.kind === "tooMany") {
      emit("validationError", validationCopy.tooMany);
    } else if (error.kind === "tooLarge") {
      emit(
        "validationError",
        `${error.fileName ?? ""} — ${validationCopy.tooLarge}`.trim(),
      );
    } else if (error.kind === "blockedExt") {
      emit(
        "validationError",
        `${error.fileName ?? ""} — ${validationCopy.blockedExt}`.trim(),
      );
    }
    return;
  }
  pendingFiles.value = merged;
}

function removeFile(index: number) {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index);
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
