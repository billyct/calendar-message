import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { View } from "react-big-calendar";
import { endOfMonth, startOfMonth } from "date-fns";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { toast } from "sonner";

import { statusLabel } from "@/lib/message-status";
import type { CalendarEvent, ScheduledMessage } from "@/types/scheduled-message";
import type { WebhookGroup } from "@/types/webhook-group";

const MESSAGES_CHANGED_EVENT = "messages-changed";

function matchingGroupId(webhookUrl: string, groups: WebhookGroup[]): string | null {
  const t = webhookUrl.trim();
  if (!t) return null;
  const g = groups.find((x) => x.webhookUrl.trim() === t);
  return g?.id ?? null;
}

export function useScheduledMessages(groups: WebhookGroup[] = []) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [msgtype, setMsgtype] = useState<"text" | "markdown">("text");
  const [content, setContent] = useState("");
  const [scheduledAtDate, setScheduledAtDate] = useState(() => new Date());
  const [scheduleDateOpen, setScheduleDateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  /** 打开编辑时群聊列表尚未加载完成，待列表就绪后再按 URL 匹配一次 */
  const pendingGroupMatchRef = useRef(false);

  const setGroupSelection = useCallback((id: string | null) => {
    if (id === null) pendingGroupMatchRef.current = false;
    setSelectedGroupId(id);
  }, []);

  const loadRange = useCallback(async (anchor: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(anchor);
      const end = endOfMonth(anchor);
      const start_ms = start.getTime();
      const end_ms = end.getTime() + 24 * 60 * 60 * 1000;
      const rows = await invoke<ScheduledMessage[]>("list_messages", {
        startMs: start_ms,
        endMs: end_ms,
      });
      setMessages(rows);
    } catch (e) {
      setMessages([]);
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRange(currentDate);
  }, [currentDate, loadRange]);

  const currentDateRef = useRef(currentDate);
  const loadRangeRef = useRef(loadRange);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);
  useEffect(() => {
    loadRangeRef.current = loadRange;
  }, [loadRange]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;
    void listen(MESSAGES_CHANGED_EVENT, () => {
      void loadRangeRef.current(currentDateRef.current);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const events: CalendarEvent[] = useMemo(() => {
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
  }, [messages]);

  useEffect(() => {
    if (!modalOpen) pendingGroupMatchRef.current = false;
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || !editingId || !pendingGroupMatchRef.current) return;
    if (groups.length === 0) return;
    pendingGroupMatchRef.current = false;
    const next = matchingGroupId(webhookUrl, groups);
    if (next) setSelectedGroupId(next);
  }, [groups, modalOpen, editingId, webhookUrl]);

  const openCreate = useCallback(() => {
    pendingGroupMatchRef.current = false;
    setEditingId(null);
    setWebhookUrl("");
    setMsgtype("text");
    setContent("");
    setScheduledAtDate(new Date());
    setScheduleDateOpen(false);
    setSelectedGroupId(null);
    setModalOpen(true);
  }, []);

  const openCreateFromSlot = useCallback(
    (slotStart: Date) => {
      pendingGroupMatchRef.current = false;
      setEditingId(null);
      setWebhookUrl("");
      setMsgtype("text");
      setContent("");
      setSelectedGroupId(null);
      let at: Date;
      if (currentView === "month") {
        at = new Date(slotStart);
        const now = new Date();
        at.setHours(now.getHours(), now.getMinutes(), 0, 0);
      } else {
        at = new Date(slotStart);
      }
      setScheduledAtDate(at);
      setModalOpen(true);
    },
    [currentView],
  );

  const openEdit = useCallback(
    (m: ScheduledMessage) => {
      const gid = matchingGroupId(m.webhookUrl, groups);
      setEditingId(m.id);
      setWebhookUrl(m.webhookUrl);
      setMsgtype(m.msgtype === "markdown" ? "markdown" : "text");
      setContent(m.content);
      setScheduledAtDate(new Date(m.scheduledAt));
      setSelectedGroupId(gid);
      pendingGroupMatchRef.current =
        gid === null && groups.length === 0 && m.webhookUrl.trim() !== "";
      setModalOpen(true);
    },
    [groups],
  );

  const closeModal = useCallback(() => setModalOpen(false), []);

  const saveMessage = useCallback(async () => {
    const scheduled_at = scheduledAtDate.getTime();
    try {
      if (editingId) {
        await invoke("update_message", {
          input: {
            id: editingId,
            webhookUrl,
            msgtype,
            content,
            scheduledAt: scheduled_at,
          },
        });
        toast.success("已保存修改");
      } else {
        await invoke("create_message", {
          input: {
            webhookUrl,
            msgtype,
            content,
            scheduledAt: scheduled_at,
          },
        });
        toast.success("已创建定时消息");
      }
      closeModal();
      await loadRange(currentDate);
    } catch (e) {
      toast.error(String(e));
    }
  }, [
    closeModal,
    content,
    currentDate,
    editingId,
    loadRange,
    msgtype,
    scheduledAtDate,
    webhookUrl,
  ]);

  const confirmDelete = useCallback(async () => {
    if (!editingId) return;
    try {
      await invoke("delete_message", { id: editingId });
      toast.success("已删除");
      setDeleteOpen(false);
      closeModal();
      await loadRange(currentDate);
    } catch (e) {
      toast.error(String(e));
    }
  }, [closeModal, currentDate, editingId, loadRange]);

  const sendTestFromForm = useCallback(async () => {
    try {
      await invoke("send_preview", {
        webhookUrl,
        msgtype,
        content,
      });
      toast.success("测试发送成功");
      if (editingId) await loadRange(currentDate);
    } catch (e) {
      toast.error(String(e));
    }
  }, [content, currentDate, editingId, loadRange, msgtype, webhookUrl]);

  const sendSavedNow = useCallback(
    async (id: string) => {
      try {
        await invoke("send_saved_now", { id });
        toast.success("立即发送成功");
        await loadRange(currentDate);
      } catch (e) {
        toast.error(String(e));
      }
    },
    [currentDate, loadRange],
  );

  const onNavigate = useCallback((d: Date) => setCurrentDate(d), []);
  const onViewChange = useCallback((v: View) => setCurrentView(v), []);

  const onSelectSlot = useCallback(
    (slotStart: Date) => {
      openCreateFromSlot(slotStart);
    },
    [openCreateFromSlot],
  );

  const onSelectEvent = useCallback(
    (ev: CalendarEvent) => {
      openEdit(ev.resource);
    },
    [openEdit],
  );

  return {
    loading,
    events,
    currentDate,
    currentView,
    onNavigate,
    onViewChange,
    onSelectSlot,
    onSelectEvent,
    modalOpen,
    setModalOpen,
    deleteOpen,
    setDeleteOpen,
    editingId,
    webhookUrl,
    setWebhookUrl,
    msgtype,
    setMsgtype,
    content,
    setContent,
    scheduledAtDate,
    setScheduledAtDate,
    scheduleDateOpen,
    setScheduleDateOpen,
    selectedGroupId,
    setSelectedGroupId: setGroupSelection,
    openCreate,
    saveMessage,
    confirmDelete,
    sendTestFromForm,
    sendSavedNow,
  };
}
