import type {
  Message,
  MessageAttachment,
  RawAttachment,
  Thread,
} from "@/features/ai-agent/model/ai-agent.types";

export const MAX_ATTACHMENTS_PER_MESSAGE = 10;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const BLOCKED_ATTACHMENT_EXTENSIONS = [
  "exe", "bat", "cmd", "sh", "ps1", "jar", "com", "scr", "msi",
];

export interface AttachmentValidationError {
  kind: "tooMany" | "tooLarge" | "blockedExt";
  fileName?: string;
}

export function validateAttachments(
  files: File[],
): AttachmentValidationError | null {
  if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return { kind: "tooMany" };
  }
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return { kind: "tooLarge", fileName: file.name };
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext && BLOCKED_ATTACHMENT_EXTENSIONS.includes(ext)) {
      return { kind: "blockedExt", fileName: file.name };
    }
  }
  return null;
}

function base64ToBlob(base64: string, mimeType: string): Blob | null {
  try {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType || "application/octet-stream" });
  } catch {
    return null;
  }
}

export function materializeAttachment(raw: RawAttachment): MessageAttachment {
  const base: MessageAttachment = {
    id: raw.id,
    fileName: raw.fileName,
    mimeType: raw.mimeType,
    sizeBytes: raw.sizeBytes,
  };
  if (raw.contentBase64) {
    const blob = base64ToBlob(raw.contentBase64, raw.mimeType);
    if (blob) base.blobUrl = URL.createObjectURL(blob);
  }
  return base;
}

export function materializeAttachments(
  raws: RawAttachment[] | undefined,
): MessageAttachment[] {
  if (!raws || raws.length === 0) return [];
  return raws.map(materializeAttachment);
}

export function revokeAttachmentBlobs(messages: Message[] | undefined): void {
  if (!messages) return;
  for (const message of messages) {
    for (const attachment of message.attachments) {
      if (attachment.blobUrl) {
        URL.revokeObjectURL(attachment.blobUrl);
      }
    }
  }
}

export function isImageAttachment(attachment: MessageAttachment): boolean {
  return attachment.mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RawThread {
  id?: number;
  threadId?: number;
  title?: string;
  ownerUserId?: string;
  createdAt?: string;
  participants?: Thread["participants"];
  recentMessages?: Thread["recentMessages"];
}

export function normalizeThread(raw: RawThread): Thread | null {
  const threadId = raw.threadId ?? raw.id;
  if (typeof threadId !== "number") return null;
  return {
    threadId,
    title: raw.title ?? "",
    ownerUserId: raw.ownerUserId ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    participants: raw.participants ?? [],
    recentMessages: raw.recentMessages ?? [],
  };
}

const ONE_MIN_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MIN_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

const timeFmt = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
});

const dayFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
});

const dayWithYearFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  const diff = now.getTime() - target.getTime();

  if (diff < 0) return timeFmt.format(target);
  if (diff < ONE_MIN_MS) return "방금 전";
  if (diff < ONE_HOUR_MS) return `${Math.floor(diff / ONE_MIN_MS)}분 전`;
  if (diff < ONE_DAY_MS) return timeFmt.format(target);
  if (diff < ONE_WEEK_MS) return `${Math.floor(diff / ONE_DAY_MS)}일 전`;

  return now.getFullYear() === target.getFullYear()
    ? dayFmt.format(target)
    : dayWithYearFmt.format(target);
}

export function formatBubbleTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDayDivider(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  const targetDay = startOfDay(target);
  const todayStart = startOfDay(now);
  const dayDiff = Math.round((todayStart - targetDay) / ONE_DAY_MS);

  if (dayDiff === 0) return "오늘";
  if (dayDiff === 1) return "어제";

  return now.getFullYear() === target.getFullYear()
    ? dayFmt.format(target)
    : dayWithYearFmt.format(target);
}

export function isSameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function previewMessageText(message: Message | undefined): string {
  if (!message) return "";
  const single = message.text.replace(/\s+/g, " ").trim();
  if (single.length <= 60) return single;
  return `${single.slice(0, 60)}…`;
}
