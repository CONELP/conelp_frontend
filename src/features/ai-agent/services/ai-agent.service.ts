import type { Message, Thread } from "@/features/ai-agent/model/ai-agent.types";

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
