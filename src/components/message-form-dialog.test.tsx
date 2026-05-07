import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ThemeProvider } from "@/components/theme-provider";
import { MessageFormDialog } from "@/components/message-form-dialog";
import type { WebhookGroup } from "@/types/webhook-group";

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}

const baseGroup: WebhookGroup = {
  id: "g1",
  name: "测试群",
  webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x",
  color: "#3b82f6",
  createdAt: 1,
  updatedAt: 1,
};

function renderDialog(
  overrides: Partial<ComponentProps<typeof MessageFormDialog>> = {},
) {
  const onGroupSelect = vi.fn();
  const props: ComponentProps<typeof MessageFormDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    editingId: null,
    groups: [],
    selectedGroupId: null,
    onGroupSelect,
    webhookUrl: "",
    onWebhookUrlChange: vi.fn(),
    msgtype: "text",
    onMsgtypeChange: vi.fn(),
    content: "",
    onContentChange: vi.fn(),
    scheduledAtDate: new Date("2026-01-15T10:00:00"),
    onScheduledAtDateChange: vi.fn(),
    scheduleDateOpen: false,
    onScheduleDateOpenChange: vi.fn(),
    onSave: vi.fn(),
    onDeleteClick: vi.fn(),
    onSendTest: vi.fn(),
    onSendSavedNow: vi.fn(),
    ...overrides,
  };
  render(<MessageFormDialog {...props} />, { wrapper: TestProviders });
  return { onGroupSelect };
}

describe("MessageFormDialog", () => {
  it("clears selected group when it no longer exists in the list", () => {
    const { onGroupSelect } = renderDialog({
      groups: [],
      selectedGroupId: "deleted-id",
      webhookUrl: "https://example.com/hook",
    });

    expect(onGroupSelect).toHaveBeenCalledWith(null);
  });

  it("does not clear selection when the group is still present", () => {
    const { onGroupSelect } = renderDialog({
      groups: [baseGroup],
      selectedGroupId: "g1",
      webhookUrl: baseGroup.webhookUrl,
    });

    expect(onGroupSelect).not.toHaveBeenCalled();
  });

  it("shows webhook URL field when no group is selected", () => {
    renderDialog({
      groups: [baseGroup],
      selectedGroupId: null,
      webhookUrl: "https://manual.example/hook",
    });

    expect(screen.getByLabelText(/Webhook URL/i)).toHaveValue(
      "https://manual.example/hook",
    );
  });
});
