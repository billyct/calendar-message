import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { templatesAtom } from "@/store/message-templates-atoms";
import type { MessageTemplate } from "@/types/message-template";

export function useMessageTemplatesData() {
  const [templates, setTemplates] = useAtom(templatesAtom);

  const reload = useCallback(async () => {
    try {
      const rows = await invoke<MessageTemplate[]>("list_templates");
      setTemplates(rows);
    } catch (e) {
      toast.error(String(e));
    }
  }, [setTemplates]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { templates, reload };
}
