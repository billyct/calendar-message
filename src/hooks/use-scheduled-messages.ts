import { useCallback, useEffect, useMemo, useState } from "react";
import type { View } from "react-big-calendar";
import { endOfMonth, startOfMonth } from "date-fns";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { statusLabel } from "@/lib/message-status";
import type { CalendarEvent, ScheduledMessage } from "@/types/scheduled-message";

export function useScheduledMessages() {
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

  const openCreate = useCallback(() => {
    setEditingId(null);
    setWebhookUrl("");
    setMsgtype("text");
    setContent("");
    setScheduledAtDate(new Date());
    setScheduleDateOpen(false);
    setModalOpen(true);
  }, []);

  const openCreateFromSlot = useCallback(
    (slotStart: Date) => {
      setEditingId(null);
      setWebhookUrl("");
      setMsgtype("text");
      setContent("");
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

  const openEdit = useCallback((m: ScheduledMessage) => {
    setEditingId(m.id);
    setWebhookUrl(m.webhookUrl);
    setMsgtype(m.msgtype === "markdown" ? "markdown" : "text");
    setContent(m.content);
    setScheduledAtDate(new Date(m.scheduledAt));
    setModalOpen(true);
  }, []);

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
    openCreate,
    saveMessage,
    confirmDelete,
    sendTestFromForm,
    sendSavedNow,
  };
}
