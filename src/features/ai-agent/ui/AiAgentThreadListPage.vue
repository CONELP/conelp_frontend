<template>
  <div class="ai-agent-list-frame">
    <DesktopAppHeader />

    <main class="ai-agent-list">
      <header class="ai-agent-list__hero">
        <div class="ai-agent-list__hero-text">
          <h1 class="ai-agent-list__title">{{ copy.pageTitle }}</h1>
        </div>

      </header>

      <section class="ai-agent-list__grid" aria-label="대화 목록">
        <NewThreadCard @click="dialogOpen = true" />

        <ThreadCard
          v-for="thread in threads"
          :key="thread.threadId"
          :thread="thread"
          :last-message="lastMessageOf(thread.threadId)"
          :bot-name="botNameOf(thread.threadId)"
          @click="openThread(thread.threadId)"
          @delete="handleDelete(thread.threadId)"
        />
      </section>

      <p v-if="threads.length === 0" class="ai-agent-list__empty">
        <strong>{{ copy.emptyState.title }}</strong>
        <span>{{ copy.emptyState.description }}</span>
      </p>
    </main>

    <NewThreadDialog
      v-model:open="dialogOpen"
      :busy="creating"
      @submit="handleCreate"
    />

    <div class="ai-agent-list__toasts" aria-live="polite">
      <div
        v-for="error in errors"
        :key="error.id"
        class="ai-agent-list__toast"
        role="status"
      >
        <span>{{ error.message }}</span>
        <button
          class="ai-agent-list__toast-close"
          type="button"
          aria-label="닫기"
          @click="dismissError(error.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import { useThreadListViewModel } from "@/features/ai-agent/state/useThreadListViewModel";
import NewThreadCard from "@/features/ai-agent/ui/components/NewThreadCard.vue";
import NewThreadDialog from "@/features/ai-agent/ui/components/NewThreadDialog.vue";
import ThreadCard from "@/features/ai-agent/ui/components/ThreadCard.vue";

const copy = aiAgentCopy;
const router = useRouter();

const {
  threads,
  errors,
  lastMessageOf,
  botNameOf,
  createThread,
  deleteThread,
  refreshThreads,
  dismissError,
} = useThreadListViewModel();

const dialogOpen = ref(false);
const creating = ref(false);

onMounted(() => {
  void refreshThreads();
});

async function handleCreate(title: string) {
  if (creating.value) return;
  creating.value = true;
  try {
    const created = await createThread(title);
    if (created) {
      dialogOpen.value = false;
      void router.push({
        name: "ai-agent-chat",
        params: { threadId: created.threadId },
      });
    }
  } finally {
    creating.value = false;
  }
}

function openThread(threadId: number) {
  void router.push({ name: "ai-agent-chat", params: { threadId } });
}

async function handleDelete(threadId: number) {
  await deleteThread(threadId);
}

</script>

<style scoped src="./styles/AiAgentThreadListPage.css"></style>
