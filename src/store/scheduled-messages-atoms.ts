import { atom } from "jotai";

import { statusLabel } from "@/lib/message-status";
import type { CalendarEvent, ScheduledMessage } from "@/types/scheduled-message";

export type DateRange = { start: Date; end: Date };

const monthRange = (anchor: Date): DateRange => {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 2);
  return { start, end };
};

export const currentRangeAtom = atom<DateRange>(monthRange(new Date()));

export const messagesAtom = atom<ScheduledMessage[]>([]);

export const loadingAtom = atom(false);

export const eventsAtom = atom((get): CalendarEvent[] => {
  const messages = get(messagesAtom);
  return messages.map((m) => {
    const start = new Date(m.scheduledAt);
    const end = new Date(m.scheduledAt + 30 * 60 * 1000);
    const preview =
      m.content.length > 42 ? `${m.content.slice(0, 42)}…` : m.content;
    return {
      id: m.id,
      title: `[${statusLabel(m.status)}] ${preview || "(空内容)"}`,
      start,
      end,
      resource: m,
    };
  });
});

const offsetDays = (d: number) => {
  const r = new Date();
  r.setDate(r.getDate() + d);
  return r;
};

export const messagesRangeAtom = atom<DateRange>({
  start: offsetDays(-30),
  end: offsetDays(30),
});

export const messageListAtom = atom<ScheduledMessage[]>([]);

export const todayMessagesAtom = atom((get) => {
  const all = get(messagesAtom);
  const today = new Date();
  const y = today.getFullYear(),
    m = today.getMonth(),
    d = today.getDate();
  return all.filter((msg) => {
    const t = new Date(msg.scheduledAt);
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  });
});

export const monthStatsAtom = atom((get) => {
  const all = get(messagesAtom);
  const counts = { total: all.length, pending: 0, sent: 0, failed: 0 };
  for (const m of all) {
    if (m.status === "pending" || m.status === "processing") counts.pending++;
    else if (m.status === "sent") counts.sent++;
    else if (m.status === "failed") counts.failed++;
  }
  return counts;
});
