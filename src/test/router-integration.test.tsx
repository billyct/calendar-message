import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { CalendarPage } from "@/pages/calendar-page";
import { GroupListPage } from "@/pages/group-list-page";
import { mockInvoke } from "@/test/mock-tauri-invoke";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

describe("router", () => {
  beforeEach(() => {
    mockInvoke({});
  });

  it("navigates from calendar to groups via sidebar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/calendar"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="groups" element={<GroupListPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(
      (await screen.findAllByText("日历视图")).length
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole("link", { name: /群组管理/ }));
    await waitFor(() => {
      expect(
        screen.getAllByText("群组管理").some((el) => el.tagName === "H1")
      ).toBe(true);
    });
  });
});
