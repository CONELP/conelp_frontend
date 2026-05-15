import { axiosClient } from "@/shared/network/axios-client";
import { materializeAttachments } from "@/features/ai-agent/services/ai-agent.service";
import type {
  Message,
  MessageMention,
  RawAttachment,
  SendMessageInput,
} from "@/features/ai-agent/model/ai-agent.types";

interface RawMessage {
  id: number;
  threadId: number;
  senderType: Message["senderType"];
  senderId: string;
  senderName: string;
  text?: string;
  createdAt: string;
  attachments?: RawAttachment[];
  replyToMessageId?: number | null;
  mentions?: MessageMention[];
}

function normalizeMessage(raw: RawMessage): Message {
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

export const chatMessageApi = {
  async send(input: SendMessageInput): Promise<Message> {
    const { threadId, text, files, replyToMessageId, mentions } = input;

    const requestPayload: Record<string, unknown> = { threadId };
    if (text && text.length > 0) requestPayload.text = text;
    if (typeof replyToMessageId === "number") {
      requestPayload.replyToMessageId = replyToMessageId;
    }
    if (mentions && mentions.length > 0) requestPayload.mentions = mentions;

    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(requestPayload)], { type: "application/json" }),
    );
    if (files) {
      for (const file of files) {
        formData.append("files", file, file.name);
      }
    }

    const { data } = await axiosClient.post<RawMessage>(
      "/chatMessage/sendMessage",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return normalizeMessage(data);
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
    const { data } = await axiosClient.get<RawMessage[]>(
      "/chatMessage/getMessageList",
      { params },
    );
    return data.map(normalizeMessage);
  },

  async remove(messageId: number): Promise<void> {
    await axiosClient.delete(`/chatMessage/deleteMessage/${messageId}`);
  },
};
