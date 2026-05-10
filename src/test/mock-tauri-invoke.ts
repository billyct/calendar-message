import { vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";

import type { ScheduledMessage } from "@/types/scheduled-message";
import type { MessageTemplate } from "@/types/message-template";

export type InvokeRouterState = {
  listMessages: () => Promise<ScheduledMessage[]>;
  listTemplates: () => Promise<MessageTemplate[]>;
  mutateResult: unknown;
  /** Per-command throw overrides for mutation / preview commands */
  throwOn: Partial<Record<string, Error>>;
};

export function createInvokeRouter() {
  const state: InvokeRouterState = {
    listMessages: async () => [],
    listTemplates: async () => [],
    mutateResult: undefined,
    throwOn: {},
  };

  const invokeImpl = vi.fn(async (cmd: string, _payload?: unknown) => {
    switch (cmd) {
      case "list_messages": {
        const err = state.throwOn[cmd];
        if (err) throw err;
        return state.listMessages();
      }
      case "list_templates": {
        const err = state.throwOn[cmd];
        if (err) throw err;
        return state.listTemplates();
      }
      case "create_message":
      case "update_message":
      case "delete_message":
      case "send_preview":
      case "send_saved_now":
      case "create_template":
      case "update_template":
      case "delete_template": {
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

/**
 * Simplified mock invoke helper for tests that don't need full router control.
 * Sets up invoke mock with provided state overrides.
 */
export function mockInvoke(
  overrides: Partial<InvokeRouterState> | { throwOn: string[] }
) {
  const mockedInvoke = invoke as ReturnType<typeof vi.fn>;
  const router = createInvokeRouter();

  // Handle throwOn as string array shorthand
  if ("throwOn" in overrides && Array.isArray(overrides.throwOn)) {
    const commands = overrides.throwOn as string[];
    commands.forEach((cmd) => {
      router.state.throwOn[cmd] = new Error(`Mock error for ${cmd}`);
    });
  } else {
    // Merge overrides into router state
    Object.assign(router.state, overrides);
  }

  mockedInvoke.mockImplementation(router.invokeImpl);
  return router;
}
