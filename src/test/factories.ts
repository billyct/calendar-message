import type { ScheduledMessage } from "@/types/scheduled-message";

export function createScheduledMessage(
  overrides: Partial<ScheduledMessage> = {},
): ScheduledMessage {
  const now = Date.now();
  return {
    id: "msg-1",
    webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test",
    msgtype: "text",
    content: "hello",
    scheduledAt: now,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    lastAttemptAt: null,
    lastError: null,
    ...overrides,
  };
}
