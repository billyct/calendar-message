import { vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";

import type { ScheduledMessage } from "@/types/scheduled-message";
import type { MessageTemplate } from "@/types/message-template";
import type { WebhookGroup } from "@/types/webhook-group";

export type InvokeRouterState = {
  listMessages: () => Promise<ScheduledMessage[]>;
  listTemplates: () => Promise<MessageTemplate[]>;
  listGroups: () => Promise<WebhookGroup[]>;
  getMessage: (id: string) => Promise<ScheduledMessage | null>;
  getGroup: (id: string) => Promise<WebhookGroup | null>;
  getTemplate: (id: string) => Promise<MessageTemplate | null>;
  mutateResult: unknown;
  /** Per-command throw overrides for mutation / preview commands */
  throwOn: Partial<Record<string, Error>>;
};

export function createInvokeRouter() {
  const state: InvokeRouterState = {
    listMessages: async () => [],
    listTemplates: async () => [],
    listGroups: async () => [],
    getMessage: async () => null,
    getGroup: async () => null,
    getTemplate: async () => null,
    mutateResult: undefined,
    throwOn: {},
  };

  const invokeImpl = vi.fn(async (cmd: string, payload?: unknown) => {
    const err = state.throwOn[cmd];
    if (err) throw err;
    const id = (payload as { id?: string } | undefined)?.id ?? "";
    switch (cmd) {
      case "list_messages":
        return state.listMessages();
      case "list_templates":
        return state.listTemplates();
      case "list_groups":
        return state.listGroups();
      case "get_message":
        return state.getMessage(id);
      case "get_webhook_group":
        return state.getGroup(id);
      case "get_message_template":
        return state.getTemplate(id);
      case "create_message":
      case "update_message":
      case "delete_message":
      case "send_preview":
      case "send_saved_now":
      case "create_template":
      case "update_template":
      case "delete_template":
      case "create_group":
      case "update_group":
      case "delete_group":
        return state.mutateResult;
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
