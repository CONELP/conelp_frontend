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

export interface Message {
  id: number;
  threadId: number;
  senderType: SenderType;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
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

export type MessageCreatedPayload = Message;

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
