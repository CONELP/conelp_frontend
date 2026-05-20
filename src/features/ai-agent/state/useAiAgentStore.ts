import { computed, ref } from "vue";
import { defineStore } from "pinia";

import {
  materializeAttachments,
  normalizeThread,
  revokeAttachmentBlobs,
} from "@/features/ai-agent/services/ai-agent.service";
import type {
  ConnectionStatus,
  Message,
  MessageCreatedPayload,
  MessageDeletedPayload,
  Participant,
  ParticipantChangedPayload,
  RawAttachment,
  Thread,
  ThreadDeletedPayload,
  ThreadSnapshotPayload,
  ThreadUpdatedPayload,
  TypingEntry,
  TypingStartedPayload,
  TypingStoppedPayload,
  WsEnvelope,
} from "@/features/ai-agent/model/ai-agent.types";

const TYPING_TTL_MS = 60_000;

function participantKey(type: string, id: string): string {
  return `${type}:${id}`;
}

const typingTimers = new Map<string, number>();

function cancelTypingTimer(timerKey: string): void {
  const handle = typingTimers.get(timerKey);
  if (handle !== undefined) {
    window.clearTimeout(handle);
    typingTimers.delete(timerKey);
  }
}

function cancelAllTypingTimers(): void {
  for (const handle of typingTimers.values()) {
    window.clearTimeout(handle);
  }
  typingTimers.clear();
}

interface RawMessageLike {
  id: number;
  threadId: number;
  senderType: Message["senderType"];
  senderId: string;
  senderName: string;
  text?: string;
  createdAt: string;
  attachments?: RawAttachment[];
  replyToMessageId?: number | null;
  mentions?: Message["mentions"];
}

function normalizeMessageRaw(raw: RawMessageLike): Message {
  return {
    id: raw.id,
    threadId: raw.threadId,
    senderType: raw.senderType,
    senderId: raw.senderId,
    senderName: raw.senderName,
    text: raw.text ?? "",
    createdAt: raw.createdAt,
    attachments: materializeAttachments(raw.attachments),
    replyToMessageId: raw.replyToMessageId ?? null,
    mentions: raw.mentions ?? [],
  };
}

interface PendingSend {
  sentAt: number;
}

interface ErrorEntry {
  id: string;
  message: string;
}

function sortMessagesAsc(a: Message, b: Message): number {
  if (a.createdAt === b.createdAt) return a.id - b.id;
  return a.createdAt < b.createdAt ? -1 : 1;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useAiAgentStore = defineStore("ai-agent", () => {
  const threads = ref<Map<number, Thread>>(new Map());
  const messagesByThread = ref<Map<number, Message[]>>(new Map());
  const typingByThread = ref<Map<number, Map<string, TypingEntry>>>(new Map());
  const connectionStatus = ref<ConnectionStatus>("idle");
  const reconnectAttempts = ref(0);
  const pendingSendByThread = ref<Map<number, PendingSend>>(new Map());
  const errors = ref<ErrorEntry[]>([]);

  const threadsSorted = computed<Thread[]>(() => {
    const list = Array.from(threads.value.values());
    list.sort((a, b) => {
      const aLast = lastActivityAt(a);
      const bLast = lastActivityAt(b);
      if (aLast === bLast) return b.threadId - a.threadId;
      return aLast < bLast ? 1 : -1;
    });
    return list;
  });

  const isWsOpen = computed(() => connectionStatus.value === "open");

  function lastActivityAt(thread: Thread): string {
    const msgs = messagesByThread.value.get(thread.threadId);
    const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
    return lastMsg?.createdAt ?? thread.createdAt;
  }

  function messagesOf(threadId: number): Message[] {
    return messagesByThread.value.get(threadId) ?? [];
  }

  function typingOf(threadId: number): TypingEntry[] {
    const map = typingByThread.value.get(threadId);
    return map ? Array.from(map.values()) : [];
  }

  function lastMessageOf(threadId: number): Message | undefined {
    const list = messagesByThread.value.get(threadId);
    return list && list.length > 0 ? list[list.length - 1] : undefined;
  }

  function applySnapshot(payload: ThreadSnapshotPayload): void {
    for (const messages of messagesByThread.value.values()) {
      revokeAttachmentBlobs(messages);
    }

    const nextThreads = new Map<number, Thread>();
    const nextMessages = new Map<number, Message[]>();

    for (const raw of payload.threads ?? []) {
      const t = normalizeThread(raw);
      if (!t) continue;
      nextThreads.set(t.threadId, {
        ...t,
        participants: [...t.participants],
        recentMessages: [],
      });
      const sorted = (t.recentMessages as unknown as RawMessageLike[])
        .map((m) => normalizeMessageRaw(m))
        .sort(sortMessagesAsc);
      nextMessages.set(t.threadId, sorted);
    }

    threads.value = nextThreads;
    messagesByThread.value = nextMessages;
  }

  function upsertThread(thread: Thread): void {
    const normalized = normalizeThread(thread);
    if (!normalized) return;
    const existing = threads.value.get(normalized.threadId);
    threads.value.set(normalized.threadId, {
      ...normalized,
      participants: [...normalized.participants],
      recentMessages: [],
    });
    if (!existing && !messagesByThread.value.has(normalized.threadId)) {
      const sorted = [...normalized.recentMessages].sort(sortMessagesAsc);
      messagesByThread.value.set(normalized.threadId, sorted);
    }
    threads.value = new Map(threads.value);
  }

  function removeThread(threadId: number): void {
    removeThreadInternal(threadId);
    clearTypingForThread(threadId);
    if (threads.value.has(threadId)) {
      threads.value.delete(threadId);
      threads.value = new Map(threads.value);
    }
    if (messagesByThread.value.has(threadId)) {
      messagesByThread.value.delete(threadId);
      messagesByThread.value = new Map(messagesByThread.value);
    }
    if (pendingSendByThread.value.has(threadId)) {
      pendingSendByThread.value.delete(threadId);
      pendingSendByThread.value = new Map(pendingSendByThread.value);
    }
  }

  function renameThread(threadId: number, title: string): void {
    const thread = threads.value.get(threadId);
    if (!thread) return;
    threads.value.set(threadId, { ...thread, title });
    threads.value = new Map(threads.value);
  }

  function appendMessage(msg: Message): void {
    const list = messagesByThread.value.get(msg.threadId) ?? [];
    if (list.some((m) => m.id === msg.id)) {
      revokeAttachmentBlobs([msg]);
      return;
    }
    const next = [...list, msg].sort(sortMessagesAsc);
    messagesByThread.value.set(msg.threadId, next);
    messagesByThread.value = new Map(messagesByThread.value);

    if (pendingSendByThread.value.has(msg.threadId)) {
      pendingSendByThread.value.delete(msg.threadId);
      pendingSendByThread.value = new Map(pendingSendByThread.value);
    }

    threads.value = new Map(threads.value);
  }

  function prependOlderMessages(threadId: number, msgs: Message[]): void {
    const existing = messagesByThread.value.get(threadId) ?? [];
    const existingIds = new Set(existing.map((m) => m.id));
    const additions = msgs.filter((m) => !existingIds.has(m.id));
    if (additions.length === 0) return;
    const next = [...additions, ...existing].sort(sortMessagesAsc);
    messagesByThread.value.set(threadId, next);
    messagesByThread.value = new Map(messagesByThread.value);
  }

  function removeThreadInternal(threadId: number): void {
    const messages = messagesByThread.value.get(threadId);
    revokeAttachmentBlobs(messages);
  }

  function removeMessage(threadId: number, messageId: number): void {
    const list = messagesByThread.value.get(threadId);
    if (!list) return;
    const next = list.filter((m) => m.id !== messageId);
    if (next.length === list.length) return;
    messagesByThread.value.set(threadId, next);
    messagesByThread.value = new Map(messagesByThread.value);
  }

  function addParticipant(threadId: number, participant: Participant): void {
    const thread = threads.value.get(threadId);
    if (!thread) return;
    if (
      thread.participants.some(
        (p) =>
          p.participantType === participant.participantType &&
          p.participantId === participant.participantId,
      )
    ) {
      return;
    }
    threads.value.set(threadId, {
      ...thread,
      participants: [...thread.participants, participant],
    });
    threads.value = new Map(threads.value);
  }

  function removeParticipant(
    threadId: number,
    participantType: Participant["participantType"],
    participantId: string,
  ): void {
    const thread = threads.value.get(threadId);
    if (!thread) return;
    const next = thread.participants.filter(
      (p) =>
        !(p.participantType === participantType && p.participantId === participantId),
    );
    if (next.length === thread.participants.length) return;
    threads.value.set(threadId, { ...thread, participants: next });
    threads.value = new Map(threads.value);
  }

  function setConnectionStatus(status: ConnectionStatus): void {
    connectionStatus.value = status;
  }

  function incrementReconnectAttempts(): void {
    reconnectAttempts.value += 1;
  }

  function resetReconnect(): void {
    reconnectAttempts.value = 0;
  }

  function startTyping(payload: TypingStartedPayload): void {
    const key = participantKey(payload.participantType, payload.participantId);
    const timerKey = `${payload.threadId}:${key}`;
    cancelTypingTimer(timerKey);

    const existing = typingByThread.value.get(payload.threadId) ?? new Map();
    const next = new Map(existing);
    next.set(key, {
      participantType: payload.participantType,
      participantId: payload.participantId,
      participantName: payload.participantName,
      startedAt: Date.now(),
    });
    typingByThread.value.set(payload.threadId, next);
    typingByThread.value = new Map(typingByThread.value);

    const handle = window.setTimeout(() => {
      stopTyping({
        threadId: payload.threadId,
        participantType: payload.participantType,
        participantId: payload.participantId,
      });
    }, TYPING_TTL_MS);
    typingTimers.set(timerKey, handle);
  }

  function stopTyping(payload: TypingStoppedPayload): void {
    const key = participantKey(payload.participantType, payload.participantId);
    const timerKey = `${payload.threadId}:${key}`;
    cancelTypingTimer(timerKey);

    const existing = typingByThread.value.get(payload.threadId);
    if (!existing || !existing.has(key)) return;
    const next = new Map(existing);
    next.delete(key);
    if (next.size === 0) {
      typingByThread.value.delete(payload.threadId);
    } else {
      typingByThread.value.set(payload.threadId, next);
    }
    typingByThread.value = new Map(typingByThread.value);
  }

  function clearTypingForThread(threadId: number): void {
    const existing = typingByThread.value.get(threadId);
    if (!existing) return;
    for (const key of existing.keys()) {
      cancelTypingTimer(`${threadId}:${key}`);
    }
    typingByThread.value.delete(threadId);
    typingByThread.value = new Map(typingByThread.value);
  }

  function markPendingSend(threadId: number): void {
    pendingSendByThread.value.set(threadId, { sentAt: Date.now() });
    pendingSendByThread.value = new Map(pendingSendByThread.value);
  }

  function clearPendingSend(threadId: number): void {
    if (!pendingSendByThread.value.has(threadId)) return;
    pendingSendByThread.value.delete(threadId);
    pendingSendByThread.value = new Map(pendingSendByThread.value);
  }

  function isPendingSend(threadId: number): boolean {
    return pendingSendByThread.value.has(threadId);
  }

  function pushError(message: string): void {
    const id = generateId();
    errors.value = [...errors.value, { id, message }];
    setTimeout(() => dismissError(id), 5000);
  }

  function dismissError(id: string): void {
    const next = errors.value.filter((e) => e.id !== id);
    if (next.length !== errors.value.length) {
      errors.value = next;
    }
  }

  function reset(): void {
    for (const messages of messagesByThread.value.values()) {
      revokeAttachmentBlobs(messages);
    }
    cancelAllTypingTimers();
    threads.value = new Map();
    messagesByThread.value = new Map();
    typingByThread.value = new Map();
    pendingSendByThread.value = new Map();
    errors.value = [];
    connectionStatus.value = "idle";
    reconnectAttempts.value = 0;
  }

  function handleWsEvent(env: WsEnvelope): void {
    switch (env.type) {
      case "thread.snapshot":
        // REST `getThreadList` is the authoritative source for the thread list.
        // WS snapshot can include threads from other projects (backend ignores X-Project-Id
        // on the WS handshake), so it must not mutate the thread list here.
        break;
      case "message.created":
        appendMessage(
          normalizeMessageRaw(env.payload as MessageCreatedPayload),
        );
        break;
      case "message.deleted": {
        const p = env.payload as MessageDeletedPayload;
        removeMessage(p.threadId, p.messageId);
        break;
      }
      case "participant.added": {
        const p = env.payload as ParticipantChangedPayload;
        addParticipant(p.threadId, {
          participantType: p.participantType,
          participantId: p.participantId,
          joinedAt: env.ts,
        });
        break;
      }
      case "participant.removed": {
        const p = env.payload as ParticipantChangedPayload;
        removeParticipant(p.threadId, p.participantType, p.participantId);
        break;
      }
      case "thread.updated": {
        const p = env.payload as ThreadUpdatedPayload;
        renameThread(p.threadId, p.title);
        break;
      }
      case "thread.deleted": {
        const p = env.payload as ThreadDeletedPayload;
        removeThread(p.threadId);
        break;
      }
      case "typing.started":
        startTyping(env.payload as TypingStartedPayload);
        break;
      case "typing.stopped":
        stopTyping(env.payload as TypingStoppedPayload);
        break;
      default:
        // unknown event types are ignored
        break;
    }
  }

  return {
    threads,
    messagesByThread,
    typingByThread,
    connectionStatus,
    reconnectAttempts,
    pendingSendByThread,
    errors,
    threadsSorted,
    isWsOpen,
    messagesOf,
    lastMessageOf,
    typingOf,
    applySnapshot,
    upsertThread,
    removeThread,
    renameThread,
    appendMessage,
    prependOlderMessages,
    removeMessage,
    addParticipant,
    removeParticipant,
    setConnectionStatus,
    incrementReconnectAttempts,
    resetReconnect,
    markPendingSend,
    clearPendingSend,
    isPendingSend,
    startTyping,
    stopTyping,
    clearTypingForThread,
    pushError,
    dismissError,
    reset,
    handleWsEvent,
  };
});

export type AiAgentStore = ReturnType<typeof useAiAgentStore>;
