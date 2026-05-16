import { computed } from "vue";

import { chatThreadApi } from "@/features/ai-agent/api/chat-thread.api";
import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";

export function useThreadListViewModel() {
  const store = useAiAgentStore();

  const threads = computed(() => store.threadsSorted);
  const connectionStatus = computed(() => store.connectionStatus);
  const errors = computed(() => store.errors);

  function lastMessageOf(threadId: number) {
    return store.lastMessageOf(threadId);
  }

  function botNameOf(threadId: number): string | null {
    const list = store.messagesOf(threadId);
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.senderType === "BOT" && m.senderName) return m.senderName;
    }
    return null;
  }

  async function createThread(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return null;

    try {
      const thread = await chatThreadApi.create(trimmed);
      store.upsertThread(thread);
      return thread;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.createThreadFailed;
      store.pushError(message);
      return null;
    }
  }

  async function deleteThread(threadId: number) {
    try {
      await chatThreadApi.remove(threadId);
      store.removeThread(threadId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.deleteThreadFailed;
      store.pushError(message);
    }
  }

  async function refreshThreads() {
    try {
      const list = await chatThreadApi.list();
      for (const thread of list) {
        store.upsertThread(thread);
      }
    } catch {
      // best-effort hydration; WS snapshot is source of truth
    }
  }

  return {
    threads,
    connectionStatus,
    errors,
    lastMessageOf,
    botNameOf,
    createThread,
    deleteThread,
    refreshThreads,
    dismissError: store.dismissError,
  };
}
