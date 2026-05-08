import { atom } from "jotai";
import type { View } from "react-big-calendar";

import { statusLabel } from "@/lib/message-status";
import type { CalendarEvent, ScheduledMessage } from "@/types/scheduled-message";

export const messagesAtom = atom<ScheduledMessage[]>([]);

export const loadingAtom = atom(false);

export const currentDateAtom = atom(new Date());

export const currentViewAtom = atom<View>("month");

export const modalOpenAtom = atom(false);

export const deleteOpenAtom = atom(false);

export const editingIdAtom = atom<string | null>(null);

export const webhookUrlAtom = atom("");

export const msgtypeAtom = atom<"text" | "markdown">("text");

export const contentAtom = atom("");

export const scheduledAtDateAtom = atom(new Date());

export const scheduleDateOpenAtom = atom(false);

export const selectedGroupIdAtom = atom<string | null>(null);

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
