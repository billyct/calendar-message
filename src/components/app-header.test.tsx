import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/app-header";

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

    render(<AppHeader onNewMessage={onNewMessage} />, {
      wrapper: TestProviders,
    });

    expect(
      screen.getByRole("heading", { name: /企业微信 Webhook 定时消息/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建消息" }));

    expect(onNewMessage).toHaveBeenCalledTimes(1);
  });
});
