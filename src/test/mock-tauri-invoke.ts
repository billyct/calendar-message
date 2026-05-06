import { vi } from "vitest";

import type { ScheduledMessage } from "@/types/scheduled-message";

export type InvokeRouterState = {
  listMessages: () => Promise<ScheduledMessage[]>;
  mutateResult: unknown;
  /** Per-command throw overrides for mutation / preview commands */
  throwOn: Partial<Record<string, Error>>;
};

export function createInvokeRouter() {
  const state: InvokeRouterState = {
    listMessages: async () => [],
    mutateResult: undefined,
    throwOn: {},
  };

  const invokeImpl = vi.fn(async (cmd: string, _payload?: unknown) => {
    switch (cmd) {
      case "list_messages":
        return state.listMessages();
      case "create_message":
      case "update_message":
      case "delete_message":
      case "send_preview":
      case "send_saved_now": {
        const err = state.throwOn[cmd];
        if (err) throw err;
        return state.mutateResult;
      }
      default:
        throw new Error(`Unexpected invoke command: ${cmd}`);
    }
  });

  return { invokeImpl, state };
}
