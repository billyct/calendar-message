import { useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { toast } from "sonner";

import {
  currentRangeAtom,
  eventsAtom,
  loadingAtom,
  messagesAtom,
  type DateRange,
} from "@/store/scheduled-messages-atoms";
import type { ScheduledMessage } from "@/types/scheduled-message";

const MESSAGES_CHANGED_EVENT = "messages-changed";

export function useScheduledMessagesData() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [range, setRange] = useAtom(currentRangeAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const events = useAtomValue(eventsAtom);

  const load = useCallback(
    async (r: DateRange) => {
      setLoading(true);
      try {
        const rows = await invoke<ScheduledMessage[]>("list_messages", {
          startMs: r.start.getTime(),
          endMs: r.end.getTime(),
        });
        setMessages(rows);
      } catch (e) {
        setMessages([]);
        toast.error(String(e));
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setMessages],
  );

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const rangeRef = useRef(range);
  const loadRef = useRef(load);
  useEffect(() => { rangeRef.current = range; }, [range]);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;
    void listen(MESSAGES_CHANGED_EVENT, () => {
      void loadRef.current(rangeRef.current);
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return {
    messages,
    events,
    range,
    setRange,
    loading,
    reload: () => load(range),
  };
}
