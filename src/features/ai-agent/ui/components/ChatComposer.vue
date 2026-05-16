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

      <div class="chat-composer__textarea-wrap">
        <textarea
          ref="textareaRef"
          v-model="text"
          class="chat-composer__textarea"
          :placeholder="copy.placeholder"
          :disabled="disabled"
          rows="1"
          @keydown="handleKeydown"
          @input="handleInput"
          @click="updateMentionState"
          @keyup="updateMentionState"
        />

        <ul
          v-if="isMentionOpen && filteredCandidates.length > 0"
          class="chat-composer__mention-list"
          role="listbox"
          aria-label="멘션 후보"
        >
          <li
            v-for="(candidate, index) in filteredCandidates"
            :key="`${candidate.participantType}:${candidate.participantId}`"
            class="chat-composer__mention-item"
            :class="{
              'chat-composer__mention-item--active': index === activeMentionIndex,
              'chat-composer__mention-item--bot': candidate.participantType === 'BOT',
            }"
            role="option"
            :aria-selected="index === activeMentionIndex"
            @mousedown.prevent="selectMention(candidate)"
            @mouseenter="activeMentionIndex = index"
          >
            <span
              class="chat-composer__mention-avatar"
              aria-hidden="true"
            >
              <img
                v-if="candidate.profileImageUrl"
                :src="candidate.profileImageUrl"
                alt=""
              />
              <span v-else>{{ initialOf(candidate.displayName) }}</span>
            </span>
            <span class="chat-composer__mention-info">
              <span class="chat-composer__mention-name">
                @{{ candidate.displayName }}
              </span>
              <span
                v-if="candidate.sublabel"
                class="chat-composer__mention-sub"
              >
                {{ candidate.sublabel }}
              </span>
            </span>
          </li>
        </ul>
      </div>

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
import type { MessageMention } from "@/features/ai-agent/model/ai-agent.types";
import type { MentionCandidate } from "@/features/ai-agent/state/useChatViewModel";

const props = defineProps<{
  disabled: boolean;
  mentionCandidates?: MentionCandidate[];
}>();

const emit = defineEmits<{
  send: [text: string, files: File[], mentions: MessageMention[]];
  validationError: [message: string];
}>();

const copy = aiAgentCopy.composer;
const validationCopy = aiAgentCopy.validation;
const maxFiles = MAX_ATTACHMENTS_PER_MESSAGE;
const text = ref("");
const pendingFiles = ref<File[]>([]);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const mentionTokens = ref<Map<string, MentionCandidate>>(new Map());
const isMentionOpen = ref(false);
const mentionAnchor = ref<number>(-1);
const mentionQuery = ref<string>("");
const activeMentionIndex = ref(0);

const canSend = computed(
  () =>
    !props.disabled &&
    (text.value.trim().length > 0 || pendingFiles.value.length > 0),
);

const filteredCandidates = computed<MentionCandidate[]>(() => {
  const all = props.mentionCandidates ?? [];
  const q = mentionQuery.value.trim().toLowerCase();
  if (!q) return all;
  return all.filter((c) => c.displayName.toLowerCase().includes(q));
});

watch(filteredCandidates, (next) => {
  if (activeMentionIndex.value >= next.length) {
    activeMentionIndex.value = 0;
  }
});

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

function handleInput() {
  autoResize();
  updateMentionState();
}

function updateMentionState() {
  const el = textareaRef.value;
  if (!el) {
    isMentionOpen.value = false;
    return;
  }
  const value = text.value;
  const caret = el.selectionStart ?? value.length;
  let i = caret - 1;
  while (i >= 0) {
    const ch = value[i];
    if (ch === "@") break;
    if (/\s/.test(ch)) {
      i = -1;
      break;
    }
    i--;
  }
  if (i < 0) {
    isMentionOpen.value = false;
    mentionAnchor.value = -1;
    mentionQuery.value = "";
    return;
  }
  const isBoundary = i === 0 || /\s/.test(value[i - 1]);
  if (!isBoundary) {
    isMentionOpen.value = false;
    return;
  }
  mentionAnchor.value = i;
  mentionQuery.value = value.slice(i + 1, caret);
  isMentionOpen.value = true;
}

function closeMentionMenu() {
  isMentionOpen.value = false;
  mentionAnchor.value = -1;
  mentionQuery.value = "";
}

async function selectMention(candidate: MentionCandidate) {
  const el = textareaRef.value;
  if (!el) return;
  const anchor = mentionAnchor.value;
  if (anchor < 0) return;

  const caret = el.selectionStart ?? text.value.length;
  const before = text.value.slice(0, anchor);
  const after = text.value.slice(caret);
  const insertion = `@${candidate.displayName} `;
  text.value = before + insertion + after;
  mentionTokens.value.set(
    `${candidate.participantType}:${candidate.participantId}`,
    candidate,
  );
  closeMentionMenu();
  await nextTick();
  autoResize();
  el.focus();
  const newCaret = before.length + insertion.length;
  el.setSelectionRange(newCaret, newCaret);
}

function handleKeydown(event: KeyboardEvent) {
  if (isMentionOpen.value && filteredCandidates.value.length > 0) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeMentionIndex.value =
        (activeMentionIndex.value + 1) % filteredCandidates.value.length;
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeMentionIndex.value =
        (activeMentionIndex.value - 1 + filteredCandidates.value.length) %
        filteredCandidates.value.length;
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const candidate = filteredCandidates.value[activeMentionIndex.value];
      if (candidate) void selectMention(candidate);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMentionMenu();
      return;
    }
  }

  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    handleSubmit();
  }
}

function buildMentions(value: string): MessageMention[] {
  const out: MessageMention[] = [];
  for (const token of mentionTokens.value.values()) {
    if (value.includes(`@${token.displayName}`)) {
      out.push({
        participantType: token.participantType,
        participantId: token.participantId,
      });
    }
  }
  return out;
}

async function handleSubmit() {
  if (!canSend.value) return;
  const value = text.value.trim();
  const files = [...pendingFiles.value];
  const mentions = buildMentions(value);
  emit("send", value, files, mentions);
  text.value = "";
  pendingFiles.value = [];
  mentionTokens.value.clear();
  closeMentionMenu();
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

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
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
