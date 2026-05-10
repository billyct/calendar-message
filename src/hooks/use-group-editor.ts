import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import type { WebhookGroup } from "@/types/webhook-group";

export type GroupEditorForm = {
  name: string;
  webhookUrl: string;
  color: string;
};

const emptyForm = (): GroupEditorForm => ({
  name: "",
  webhookUrl: "",
  color: "#3b82f6",
});

export function useGroupEditor(id?: string) {
  const [form, setForm] = useState<GroupEditorForm>(emptyForm);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [original, setOriginal] = useState<WebhookGroup | null>(null);
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
    invoke<WebhookGroup | null>("get_webhook_group", { id })
      .then((row) => {
        if (cancelled) return;
        if (!row) { setNotFound(true); return; }
        setOriginal(row);
        setForm({ name: row.name, webhookUrl: row.webhookUrl, color: row.color });
      })
      .catch((e) => { if (!cancelled) toast.error(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const update = useCallback(
    <K extends keyof GroupEditorForm>(key: K, value: GroupEditorForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const save = useCallback(async (): Promise<string> => {
    const name = form.name.trim();
    const webhookUrl = form.webhookUrl.trim();
    if (id) {
      await invoke("update_group", {
        input: { id, name, webhookUrl, color: form.color },
      });
      return id;
    }
    const created = await invoke<WebhookGroup>("create_group", {
      input: { name, webhookUrl, color: form.color },
    });
    return created.id;
  }, [form, id]);

  const remove = useCallback(async () => {
    if (!id) return;
    await invoke("delete_group", { id });
  }, [id]);

  return { form, update, loading, notFound, original, save, remove };
}
