import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { templatesAtom } from "@/store/message-templates-atoms";
import type { MessageTemplate } from "@/types/message-template";

export function useMessageTemplates() {
  const [templates, setTemplates] = useAtom(templatesAtom);

  const loadTemplates = useCallback(async () => {
    try {
      const result = await invoke<MessageTemplate[]>("list_templates");
      setTemplates(result);
    } catch (e) {
      toast.error(String(e));
    }
  }, [setTemplates]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const createTemplate = useCallback(
    async (
      name: string,
      msgtype: "text" | "markdown",
      content: string
    ) => {
      await invoke("create_template", {
        input: { name, msgtype, content },
      });
      await loadTemplates();
    },
    [loadTemplates],
  );

  const updateTemplate = useCallback(
    async (
      id: string,
      name: string,
      msgtype: "text" | "markdown",
      content: string
    ) => {
      await invoke("update_template", {
        input: { id, name, msgtype, content },
      });
      await loadTemplates();
    },
    [loadTemplates],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await invoke("delete_template", { id });
      await loadTemplates();
    },
    [loadTemplates],
  );

  return {
    templates,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
