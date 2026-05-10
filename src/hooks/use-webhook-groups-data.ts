import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { groupsAtom } from "@/store/webhook-groups-atoms";
import type { WebhookGroup } from "@/types/webhook-group";

export function useWebhookGroupsData() {
  const [groups, setGroups] = useAtom(groupsAtom);

  const reload = useCallback(async () => {
    try {
      const rows = await invoke<WebhookGroup[]>("list_groups");
      setGroups(rows);
    } catch (e) {
      toast.error(String(e));
    }
  }, [setGroups]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { groups, reload };
}
