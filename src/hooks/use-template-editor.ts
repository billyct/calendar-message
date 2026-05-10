import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import type { MessageTemplate } from "@/types/message-template";

export type TemplateEditorForm = {
  name: string;
  msgtype: "text" | "markdown";
  content: string;
};

const emptyForm = (): TemplateEditorForm => ({
  name: "",
  msgtype: "text",
  content: "",
});

export function useTemplateEditor(id?: string) {
  const [form, setForm] = useState<TemplateEditorForm>(emptyForm);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [original, setOriginal] = useState<MessageTemplate | null>(null);
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
    invoke<MessageTemplate | null>("get_message_template", { id })
      .then((row) => {
        if (cancelled) return;
        if (!row) { setNotFound(true); return; }
        setOriginal(row);
        setForm({ name: row.name, msgtype: row.msgtype, content: row.content });
      })
      .catch((e) => { if (!cancelled) toast.error(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const update = useCallback(
    <K extends keyof TemplateEditorForm>(key: K, value: TemplateEditorForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const save = useCallback(async (): Promise<string> => {
    const name = form.name.trim();
    if (id) {
      await invoke("update_template", {
        input: { id, name, msgtype: form.msgtype, content: form.content },
      });
      return id;
    }
    const created = await invoke<MessageTemplate>("create_template", {
      input: { name, msgtype: form.msgtype, content: form.content },
    });
    return created.id;
  }, [form, id]);

  const remove = useCallback(async () => {
    if (!id) return;
    await invoke("delete_template", { id });
  }, [id]);

  return { form, update, loading, notFound, original, save, remove };
}
