import { computed, ref } from "vue";

import { chatMessageApi } from "@/features/ai-agent/api/chat-message.api";
import { chatThreadApi } from "@/features/ai-agent/api/chat-thread.api";
import { userProjectApi } from "@/features/ai-agent/api/user-project.api";
import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";
import type {
  Message,
  MessageMention,
  ProjectMember,
  TypingEntry,
} from "@/features/ai-agent/model/ai-agent.types";
import { useAuthStore } from "@/features/auth/state/useAuthStore";

export interface MentionCandidate {
  participantType: "USER" | "BOT";
  participantId: string;
  displayName: string;
  sublabel?: string;
  profileImageUrl?: string | null;
}

const BOT_DISPLAY_NAME = "Hermes";

const ECHO_TIMEOUT_MS = 10_000;

export function useChatViewModel(threadIdRef: () => number) {
  const store = useAiAgentStore();
  const authStore = useAuthStore();

  const isLoadingOlder = ref(false);
  const hasMoreOlder = ref(true);
  const isLoadingThread = ref(false);
  const projectMembers = ref<ProjectMember[]>([]);
  const isLoadingMembers = ref(false);

  const thread = computed(() => store.threads.get(threadIdRef()));
  const messages = computed<Message[]>(() => store.messagesOf(threadIdRef()));
  const participants = computed(() => thread.value?.participants ?? []);
  const connectionStatus = computed(() => store.connectionStatus);
  const isAwaitingEcho = computed(() => store.isPendingSend(threadIdRef()));
  const currentUserId = computed(() => authStore.user?.id ?? null);
  const typingParticipants = computed<TypingEntry[]>(() => {
    const entries = store.typingByThread.get(threadIdRef());
    if (!entries) return [];
    return Array.from(entries.values()).filter(
      (e) =>
        !(e.participantType === "USER" && e.participantId === currentUserId.value),
    );
  });

  const projectMembersByUserId = computed<Map<string, ProjectMember>>(() => {
    const map = new Map<string, ProjectMember>();
    for (const member of projectMembers.value) {
      map.set(member.userId, member);
    }
    return map;
  });

  const participantNamesById = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const member of projectMembers.value) {
      if (member.userName) {
        map.set(member.userId, member.userName);
      }
    }
    for (const m of messages.value) {
      if (m.senderName && !map.has(m.senderId)) {
        map.set(m.senderId, m.senderName);
      }
    }
    for (const t of typingParticipants.value) {
      if (t.participantName && !map.has(t.participantId)) {
        map.set(t.participantId, t.participantName);
      }
    }
    for (const p of participants.value) {
      if (p.participantType === "BOT" && !map.has(p.participantId)) {
        map.set(p.participantId, BOT_DISPLAY_NAME);
      }
    }
    return map;
  });

  const mentionCandidates = computed<MentionCandidate[]>(() => {
    const out: MentionCandidate[] = [];
    for (const p of participants.value) {
      if (p.participantType === "USER") {
        if (p.participantId === currentUserId.value) continue;
        const member = projectMembersByUserId.value.get(p.participantId);
        const displayName =
          member?.userName ??
          participantNamesById.value.get(p.participantId) ??
          "알 수 없는 사용자";
        out.push({
          participantType: "USER",
          participantId: p.participantId,
          displayName,
          sublabel: member?.jobTitle ?? member?.companyName ?? undefined,
          profileImageUrl: member?.profileImageUrl ?? null,
        });
      } else {
        out.push({
          participantType: "BOT",
          participantId: p.participantId,
          displayName: BOT_DISPLAY_NAME,
          sublabel: aiAgentCopy.participants.botBadge,
        });
      }
    }
    return out;
  });

  async function ensureLoaded() {
    const id = threadIdRef();
    if (!id) return;

    isLoadingOlder.value = false;
    hasMoreOlder.value = true;

    isLoadingThread.value = true;
    try {
      if (!thread.value) {
        const fetched = await chatThreadApi.get(id);
        store.upsertThread(fetched);
      }
      const existing = store.messagesOf(id);
      if (existing.length < 50) {
        const recentList = await chatMessageApi.list(id, undefined, 50);
        store.prependOlderMessages(id, recentList);
        if (recentList.length < 50) {
          hasMoreOlder.value = false;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.threadLoadFailed;
      store.pushError(message);
    } finally {
      isLoadingThread.value = false;
    }
  }

  async function ensureProjectMembersLoaded() {
    if (projectMembers.value.length > 0) return;
    if (isLoadingMembers.value) return;
    isLoadingMembers.value = true;
    try {
      projectMembers.value = await userProjectApi.listMembers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.loadMembersFailed;
      store.pushError(message);
    } finally {
      isLoadingMembers.value = false;
    }
  }

  async function send(
    text: string,
    files: File[] = [],
    mentions: MessageMention[] = [],
  ) {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return false;

    const id = threadIdRef();
    if (!id) return false;

    if (store.isPendingSend(id)) return false;

    store.markPendingSend(id);

    let timer: number | null = null;
    let response: Message | null = null;
    let echoArrived = false;

    try {
      const promise = chatMessageApi.send({
        threadId: id,
        text: trimmed.length > 0 ? trimmed : undefined,
        files: files.length > 0 ? files : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      const safetyPromise = new Promise<void>((resolve) => {
        timer = window.setTimeout(() => {
          if (response && !messages.value.some((m) => m.id === response!.id)) {
            store.appendMessage(response);
            store.pushError(aiAgentCopy.errors.echoTimeout);
          }
          resolve();
        }, ECHO_TIMEOUT_MS);
      });

      response = await promise;
      echoArrived = messages.value.some((m) => m.id === response!.id);

      await Promise.race([
        new Promise<void>((resolve) => {
          const unwatch = watchForEcho(response!.id, () => {
            echoArrived = true;
            unwatch();
            resolve();
          });
        }),
        safetyPromise,
      ]);

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.sendFailed;
      store.pushError(message);
      return false;
    } finally {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      store.clearPendingSend(id);
    }
  }

  function watchForEcho(messageId: number, onArrive: () => void): () => void {
    if (messages.value.some((m) => m.id === messageId)) {
      onArrive();
      return () => {};
    }

    let stopped = false;
    const interval = window.setInterval(() => {
      if (stopped) return;
      if (messages.value.some((m) => m.id === messageId)) {
        stopped = true;
        window.clearInterval(interval);
        onArrive();
      }
    }, 100);

    return () => {
      if (stopped) return;
      stopped = true;
      window.clearInterval(interval);
    };
  }

  async function loadOlder() {
    if (isLoadingOlder.value || !hasMoreOlder.value) return;
    const id = threadIdRef();
    if (!id) return;

    const oldest = messages.value[0];
    isLoadingOlder.value = true;
    try {
      const older = await chatMessageApi.list(id, oldest?.id, 30);
      if (older.length === 0) {
        hasMoreOlder.value = false;
        return;
      }
      store.prependOlderMessages(id, older);
      if (older.length < 30) hasMoreOlder.value = false;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.loadOlderFailed;
      store.pushError(message);
    } finally {
      isLoadingOlder.value = false;
    }
  }

  async function rename(title: string) {
    const trimmed = title.trim();
    const id = threadIdRef();
    if (!trimmed || !id) return;
    const current = thread.value;
    if (current && current.title === trimmed) return;

    try {
      const updated = await chatThreadApi.updateTitle(id, trimmed);
      store.upsertThread(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "제목 변경에 실패했어요.";
      store.pushError(message);
    }
  }

  async function loadInvitableMembers(): Promise<ProjectMember[]> {
    try {
      const members = await userProjectApi.listMembers();
      projectMembers.value = members;
      const joined = new Set(
        (thread.value?.participants ?? [])
          .filter((p) => p.participantType === "USER")
          .map((p) => p.participantId),
      );
      return members.filter((m) => !joined.has(m.userId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.loadMembersFailed;
      store.pushError(message);
      return [];
    }
  }

  async function inviteUser(userId: string): Promise<boolean> {
    const id = threadIdRef();
    if (!id) return false;
    try {
      const updated = await chatThreadApi.addParticipant(id, "USER", userId);
      store.upsertThread(updated);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.inviteFailed;
      store.pushError(message);
      return false;
    }
  }

  async function deleteThread() {
    const id = threadIdRef();
    if (!id) return false;
    try {
      await chatThreadApi.remove(id);
      store.removeThread(id);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : aiAgentCopy.errors.deleteThreadFailed;
      store.pushError(message);
      return false;
    }
  }

  return {
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
    mentionCandidates,
    ensureLoaded,
    ensureProjectMembersLoaded,
    send,
    loadOlder,
    rename,
    deleteThread,
    loadInvitableMembers,
    inviteUser,
  };
}
