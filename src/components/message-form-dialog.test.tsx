import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider } from "@/components/theme-provider";
import { MessageFormDialog } from "@/components/message-form-dialog";
import type { WebhookGroup } from "@/types/webhook-group";
import type { MessageTemplate } from "@/types/message-template";

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

const baseTemplate: MessageTemplate = {
  id: "t1",
  name: "周报模板",
  msgtype: "markdown",
  content: "# 本周工作总结\n\n请填写内容",
  createdAt: 1,
  updatedAt: 1,
};

function renderDialog(
  overrides: Partial<ComponentProps<typeof MessageFormDialog>> = {},
) {
  const onGroupSelect = vi.fn();
  const onMsgtypeChange = vi.fn();
  const onContentChange = vi.fn();
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
    onMsgtypeChange,
    content: "",
    onContentChange,
    scheduledAtDate: new Date("2026-01-15T10:00:00"),
    onScheduledAtDateChange: vi.fn(),
    scheduleDateOpen: false,
    onScheduleDateOpenChange: vi.fn(),
    onSave: vi.fn(),
    onDeleteClick: vi.fn(),
    onSendTest: vi.fn(),
    onSendSavedNow: vi.fn(),
    templates: [],
    ...overrides,
  };
  render(<MessageFormDialog {...props} />, { wrapper: TestProviders });
  return { onGroupSelect, onMsgtypeChange, onContentChange };
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

  it("does not show template selector when templates is empty", () => {
    renderDialog({
      templates: [],
      content: "",
    });

    expect(screen.queryByRole("combobox", { name: /插入模板/i })).not.toBeInTheDocument();
  });

  it("shows template selector when templates exist", async () => {
    renderDialog({
      templates: [baseTemplate],
      content: "",
    });

    expect(screen.getByText("插入模板")).toBeInTheDocument();
    const selector = screen.getByRole("combobox", { name: "插入模板" });
    expect(selector).toBeInTheDocument();
  });

  it("selecting a template appends content with newline and switches msgtype", async () => {
    const user = userEvent.setup();
    const { onMsgtypeChange, onContentChange } = renderDialog({
      templates: [baseTemplate],
      content: "已有内容",
      msgtype: "text",
    });

    const selector = screen.getByRole("combobox", { name: "插入模板" });
    await user.click(selector);

    const templateOption = await screen.findByRole("option", { name: baseTemplate.name });
    await user.click(templateOption);

    expect(onMsgtypeChange).toHaveBeenCalledWith("markdown");
    expect(onContentChange).toHaveBeenCalledWith("已有内容\n# 本周工作总结\n\n请填写内容");
  });

  it("selecting a template appends content without extra newline when existing content ends with newline", async () => {
    const user = userEvent.setup();
    const { onContentChange } = renderDialog({
      templates: [baseTemplate],
      content: "已有内容\n",
      msgtype: "text",
    });

    const selector = screen.getByRole("combobox", { name: "插入模板" });
    await user.click(selector);

    const templateOption = await screen.findByRole("option", { name: baseTemplate.name });
    await user.click(templateOption);

    expect(onContentChange).toHaveBeenCalledWith("已有内容\n# 本周工作总结\n\n请填写内容");
  });

  it("selecting a template inserts content directly when content is empty", async () => {
    const user = userEvent.setup();
    const { onContentChange } = renderDialog({
      templates: [baseTemplate],
      content: "",
      msgtype: "text",
    });

    const selector = screen.getByRole("combobox", { name: "插入模板" });
    await user.click(selector);

    const templateOption = await screen.findByRole("option", { name: baseTemplate.name });
    await user.click(templateOption);

    expect(onContentChange).toHaveBeenCalledWith("# 本周工作总结\n\n请填写内容");
  });
});
