import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/app-header";
import type { MessageTemplate } from "@/types/message-template";

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}

describe("AppHeader", () => {
  it("renders title and triggers new message", async () => {
    const user = userEvent.setup();
    const onNewMessage = vi.fn();

    render(
      <AppHeader
        onNewMessage={onNewMessage}
        groups={[]}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        templates={[]}
        onCreateTemplate={vi.fn()}
        onUpdateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />,
      {
        wrapper: TestProviders,
      },
    );

    expect(
      screen.getByRole("heading", { name: /企业微信 Webhook 定时消息/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建消息" }));

    expect(onNewMessage).toHaveBeenCalledTimes(1);
  });

  it("renders one markdown template in the template list dropdown", async () => {
    const user = userEvent.setup();
    const templates: MessageTemplate[] = [
      {
        id: "tpl-1",
        name: "My Template",
        msgtype: "markdown",
        content: "# Hello",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const { container } = render(
      <AppHeader
        onNewMessage={vi.fn()}
        groups={[]}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        templates={templates}
        onCreateTemplate={vi.fn()}
        onUpdateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />,
      {
        wrapper: TestProviders,
      },
    );

    // Find buttons with aria-label="模板列表" and aria-haspopup="menu"
    const templateListButtons = container.querySelectorAll('button[aria-label="模板列表"][aria-haspopup="menu"]');
    expect(templateListButtons.length).toBe(1);
    
    await user.click(templateListButtons[0] as HTMLElement);

    // Wait for dropdown to open and check content
    await waitFor(() => {
      expect(screen.getByText("My Template")).toBeInTheDocument();
    });
    
    expect(screen.getByText("markdown")).toBeInTheDocument();
  });
});
