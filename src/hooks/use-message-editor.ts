import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import type { ScheduledMessage } from "@/types/scheduled-message";

export type EditorForm = {
  webhookUrl: string;
  msgtype: "text" | "markdown";
  content: string;
  scheduledAt: Date;
};

const emptyForm = (): EditorForm => ({
  webhookUrl: "",
  msgtype: "text",
  content: "",
  scheduledAt: new Date(Date.now() + 5 * 60_000),
});

export function useMessageEditor(id?: string) {
  const [form, setForm] = useState<EditorForm>(emptyForm);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [original, setOriginal] = useState<ScheduledMessage | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setForm(emptyForm());
      setOriginal(null);
      setNotFound(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    invoke<ScheduledMessage | null>("get_message", { id })
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setOriginal(row);
        setForm({
          webhookUrl: row.webhookUrl,
          msgtype: row.msgtype === "markdown" ? "markdown" : "text",
          content: row.content,
          scheduledAt: new Date(row.scheduledAt),
        });
      })
      .catch((e) => {
        if (!cancelled) toast.error(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = useCallback(
    <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const save = useCallback(async (): Promise<string | null> => {
    const scheduledAt = form.scheduledAt.getTime();
    if (id) {
      await invoke("update_message", {
        input: {
          id,
          webhookUrl: form.webhookUrl,
          msgtype: form.msgtype,
          content: form.content,
          scheduledAt,
        },
      });
      return id;
    }
    const newMessage = await invoke<ScheduledMessage>("create_message", {
      input: {
        webhookUrl: form.webhookUrl,
        msgtype: form.msgtype,
        content: form.content,
        scheduledAt,
      },
    });
    return newMessage.id;
  }, [form, id]);

  const remove = useCallback(async () => {
    if (!id) return;
    await invoke("delete_message", { id });
  }, [id]);

  const sendTest = useCallback(async () => {
    await invoke("send_preview", {
      webhookUrl: form.webhookUrl,
      msgtype: form.msgtype,
      content: form.content,
    });
  }, [form]);

  const sendNowSaved = useCallback(async () => {
    if (!id) return;
    await invoke("send_saved_now", { id });
  }, [id]);

  return {
    form,
    update,
    setForm,
    loading,
    notFound,
    original,
    save,
    remove,
    sendTest,
    sendNowSaved,
  };
}
