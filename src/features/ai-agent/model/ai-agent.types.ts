export type ParticipantType = "USER" | "BOT";
export type SenderType = "USER" | "BOT" | "SYSTEM";
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed";

export interface Participant {
  participantType: ParticipantType;
  participantId: string;
  joinedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl?: string;
}

export interface MessageMention {
  participantType: ParticipantType;
  participantId: string;
}

export interface Message {
  id: number;
  threadId: number;
  senderType: SenderType;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  attachments: MessageAttachment[];
  replyToMessageId: number | null;
  mentions: MessageMention[];
}

export interface SendMessageInput {
  threadId: number;
  text?: string;
  files?: File[];
  replyToMessageId?: number;
  mentions?: MessageMention[];
}

export interface Thread {
  threadId: number;
  title: string;
  ownerUserId: string;
  createdAt: string;
  participants: Participant[];
  recentMessages: Message[];
}

export interface WsEnvelope<T = unknown> {
  type: string;
  event_id: string;
  ts: string;
  payload: T;
}

export interface ThreadSnapshotPayload {
  threads: Thread[];
}

export interface RawAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
}

export interface MessageCreatedPayload {
  id: number;
  threadId: number;
  senderType: SenderType;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: RawAttachment[];
  replyToMessageId?: number | null;
  mentions?: MessageMention[];
}

export interface MessageDeletedPayload {
  threadId: number;
  messageId: number;
}

export interface ParticipantChangedPayload {
  threadId: number;
  participantType: ParticipantType;
  participantId: string;
  action: "added" | "removed";
}

export interface ThreadUpdatedPayload {
  threadId: number;
  action: "updated";
  title: string;
}

export interface ThreadDeletedPayload {
  threadId: number;
  action: "deleted";
}

export interface TypingStartedPayload {
  threadId: number;
  participantType: ParticipantType;
  participantId: string;
  participantName?: string;
}

export interface TypingStoppedPayload {
  threadId: number;
  participantType: ParticipantType;
  participantId: string;
}

export interface TypingEntry {
  participantType: ParticipantType;
  participantId: string;
  participantName?: string;
  startedAt: number;
}
