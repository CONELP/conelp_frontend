import { axiosClient } from "@/shared/network/axios-client";
import type { Message } from "@/features/ai-agent/model/ai-agent.types";

export const chatMessageApi = {
  async send(threadId: number, text: string): Promise<Message> {
    const { data } = await axiosClient.post<Message>(
      "/chatMessage/sendMessage",
      { threadId, text },
    );
    return data;
  },

  async list(
    threadId: number,
    before?: number,
    limit = 50,
  ): Promise<Message[]> {
    const params: Record<string, string | number> = { threadId, limit };
    if (typeof before === "number") {
      params.before = before;
    }
    const { data } = await axiosClient.get<Message[]>(
      "/chatMessage/getMessageList",
      { params },
    );
    return data;
  },

  async remove(messageId: number): Promise<void> {
    await axiosClient.delete(`/chatMessage/deleteMessage/${messageId}`);
  },
};
