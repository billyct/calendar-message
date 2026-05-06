import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import type { WebhookGroup } from "@/types/webhook-group";

export function useWebhookGroups() {
  const [groups, setGroups] = useState<WebhookGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await invoke<WebhookGroup[]>("list_groups");
      setGroups(rows);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const createGroup = useCallback(
    async (name: string, webhookUrl: string, color: string) => {
      await invoke<WebhookGroup>("create_group", {
        input: { name, webhookUrl, color },
      });
      await loadGroups();
    },
    [loadGroups],
  );

  const updateGroup = useCallback(
    async (id: string, name: string, webhookUrl: string, color: string) => {
      await invoke<WebhookGroup>("update_group", {
        input: { id, name, webhookUrl, color },
      });
      await loadGroups();
    },
    [loadGroups],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      await invoke("delete_group", { id });
      await loadGroups();
    },
    [loadGroups],
  );

  return {
    groups,
    loading,
    loadGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}
