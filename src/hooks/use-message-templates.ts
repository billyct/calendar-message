import { useEffect } from "react";
import { useAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { templatesAtom } from "@/store/message-templates-atoms";
import type { MessageTemplate } from "@/types/message-template";

export function useMessageTemplates() {
  const [templates, setTemplates] = useAtom(templatesAtom);

  const loadTemplates = async () => {
    try {
      const result = await invoke<MessageTemplate[]>("list_templates");
      setTemplates(result);
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast.error("加载模板失败");
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const createTemplate = async (
    name: string,
    msgtype: "text" | "markdown",
    content: string
  ) => {
    await invoke("create_template", {
      input: { name, msgtype, content },
    });
    await loadTemplates();
  };

  const updateTemplate = async (
    id: string,
    name: string,
    msgtype: "text" | "markdown",
    content: string
  ) => {
    await invoke("update_template", {
      id,
      input: { name, msgtype, content },
    });
    await loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    await invoke("delete_template", { id });
    await loadTemplates();
  };

  return {
    templates,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
