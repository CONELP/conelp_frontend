<template>
  <Teleport to="body">
    <div v-if="open" class="new-thread-dialog__backdrop" @click.self="handleClose">
      <div
        class="new-thread-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="copy.title"
      >
        <header class="new-thread-dialog__header">
          <h2 class="new-thread-dialog__title">{{ copy.title }}</h2>
          <p class="new-thread-dialog__description">{{ copy.description }}</p>
        </header>

        <form class="new-thread-dialog__form" @submit.prevent="handleSubmit">
          <input
            ref="inputRef"
            v-model="title"
            class="new-thread-dialog__input"
            type="text"
            :placeholder="copy.placeholder"
            :disabled="busy"
            maxlength="80"
          />

          <div class="new-thread-dialog__actions">
            <button
              class="new-thread-dialog__cancel"
              type="button"
              :disabled="busy"
              @click="handleClose"
            >
              {{ copy.cancel }}
            </button>
            <button
              class="new-thread-dialog__submit"
              type="submit"
              :disabled="busy || !title.trim()"
            >
              {{ busy ? "생성 중…" : copy.submit }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";

const props = defineProps<{
  open: boolean;
  busy?: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [title: string];
}>();

const copy = aiAgentCopy.newThreadDialog;
const title = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      title.value = "";
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

function handleClose() {
  if (props.busy) return;
  emit("update:open", false);
}

function handleSubmit() {
  const trimmed = title.value.trim();
  if (!trimmed) return;
  emit("submit", trimmed);
}
</script>

<style scoped src="../styles/NewThreadDialog.css"></style>
