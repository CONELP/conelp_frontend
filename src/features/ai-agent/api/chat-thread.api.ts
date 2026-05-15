import { axiosClient } from "@/shared/network/axios-client";
import { normalizeThread } from "@/features/ai-agent/services/ai-agent.service";
import type {
  ParticipantType,
  Thread,
} from "@/features/ai-agent/model/ai-agent.types";

function ensureThread(raw: unknown): Thread {
  const t = normalizeThread(raw as Parameters<typeof normalizeThread>[0]);
  if (!t) throw new Error("서버 응답에 thread id가 없습니다.");
  return t;
}

export const chatThreadApi = {
  async list(): Promise<Thread[]> {
    const { data } = await axiosClient.get<unknown[]>("/chatThread/getThreadList");
    return data
      .map((r) => normalizeThread(r as Parameters<typeof normalizeThread>[0]))
      .filter((t): t is Thread => t !== null);
  },

  async get(threadId: number): Promise<Thread> {
    const { data } = await axiosClient.get(`/chatThread/getThread/${threadId}`);
    return ensureThread(data);
  },

  async create(title: string): Promise<Thread> {
    const { data } = await axiosClient.post("/chatThread/createThread", { title });
    return ensureThread(data);
  },

  async updateTitle(threadId: number, title: string): Promise<Thread> {
    const { data } = await axiosClient.put(
      `/chatThread/updateThread/${threadId}`,
      { title },
    );
    return ensureThread(data);
  },

  async remove(threadId: number): Promise<void> {
    await axiosClient.delete(`/chatThread/deleteThread/${threadId}`);
  },

  async addParticipant(
    threadId: number,
    participantType: ParticipantType,
    participantId: string,
  ): Promise<Thread> {
    const { data } = await axiosClient.post(
      `/chatThread/addParticipant/${threadId}`,
      { participantType, participantId },
    );
    return ensureThread(data);
  },

  async removeParticipant(
    threadId: number,
    participantType: ParticipantType,
    participantId: string,
  ): Promise<Thread> {
    const { data } = await axiosClient.delete(
      `/chatThread/removeParticipant/${threadId}/${participantType}/${participantId}`,
    );
    return ensureThread(data);
  },
};
