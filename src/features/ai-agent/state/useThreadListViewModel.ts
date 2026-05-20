import { computed } from "vue";

import { chatThreadApi } from "@/features/ai-agent/api/chat-thread.api";
import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

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
      analyticsClient.trackAction("ai_agent", "create_thread", "success");
      return thread;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.createThreadFailed;
      store.pushError(message);
      analyticsClient.trackAction("ai_agent", "create_thread", "fail");
      return null;
    }
  }

  async function deleteThread(threadId: number) {
    try {
      await chatThreadApi.remove(threadId);
      store.removeThread(threadId);
      analyticsClient.trackAction("ai_agent", "delete_thread", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.deleteThreadFailed;
      store.pushError(message);
      analyticsClient.trackAction("ai_agent", "delete_thread", "fail");
    }
  }

  async function refreshThreads() {
    try {
      const list = await chatThreadApi.list();
      const apiIds = new Set(list.map((t) => t.threadId));
      for (const existing of Array.from(store.threads.values())) {
        if (!apiIds.has(existing.threadId)) {
          store.removeThread(existing.threadId);
        }
      }
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
