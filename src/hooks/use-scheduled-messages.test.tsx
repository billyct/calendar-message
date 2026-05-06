import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { useScheduledMessages } from "@/hooks/use-scheduled-messages";
import { createScheduledMessage } from "@/test/factories";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedInvoke = vi.mocked(invoke);

describe("useScheduledMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedInvoke.mockResolvedValue([]);
  });

  it("loads messages for current month on mount", async () => {
    const row = createScheduledMessage({ id: "a" });
    mockedInvoke.mockResolvedValueOnce([row]);

    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith(
        "list_messages",
        expect.objectContaining({
          startMs: expect.any(Number),
          endMs: expect.any(Number),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1);
    });

    expect(result.current.events[0]?.title).toContain("待发送");
    expect(result.current.events[0]?.resource.id).toBe("a");
  });

  it("openCreate resets draft fields and opens modal", async () => {
    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editingId).toBeNull();
    expect(result.current.webhookUrl).toBe("");
    expect(result.current.msgtype).toBe("text");
    expect(result.current.content).toBe("");
  });

  it("openEdit hydrates form state", async () => {
    const msg = createScheduledMessage({
      id: "edit-1",
      webhookUrl: "https://w",
      msgtype: "markdown",
      content: "body",
      scheduledAt: 1_700_000_000_000,
    });
    mockedInvoke.mockResolvedValueOnce([msg]);

    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.onSelectEvent(result.current.events[0]!);
    });

    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editingId).toBe("edit-1");
    expect(result.current.webhookUrl).toBe("https://w");
    expect(result.current.msgtype).toBe("markdown");
    expect(result.current.content).toBe("body");
    expect(result.current.scheduledAtDate.getTime()).toBe(1_700_000_000_000);
  });

  it("saveMessage invokes create_message when not editing", async () => {
    mockedInvoke.mockResolvedValue([]);
    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(mockedInvoke).toHaveBeenCalled());

    act(() => {
      result.current.openCreate();
      result.current.setWebhookUrl("https://hook");
      result.current.setContent("hi");
    });

    mockedInvoke.mockResolvedValueOnce(undefined);
    mockedInvoke.mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.saveMessage();
    });

    expect(mockedInvoke).toHaveBeenCalledWith(
      "create_message",
      expect.objectContaining({
        input: expect.objectContaining({
          webhookUrl: "https://hook",
          msgtype: "text",
          content: "hi",
        }),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("已创建定时消息");
    expect(result.current.modalOpen).toBe(false);
  });

  it("saveMessage invokes update_message when editingId is set", async () => {
    const msg = createScheduledMessage({ id: "u1" });
    mockedInvoke.mockResolvedValueOnce([msg]);

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.onSelectEvent(result.current.events[0]!);
      result.current.setContent("updated");
    });

    mockedInvoke.mockResolvedValueOnce(undefined);
    mockedInvoke.mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.saveMessage();
    });

    expect(mockedInvoke).toHaveBeenCalledWith(
      "update_message",
      expect.objectContaining({
        input: expect.objectContaining({
          id: "u1",
          content: "updated",
        }),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("已保存修改");
  });

  it("confirmDelete invokes delete_message", async () => {
    const msg = createScheduledMessage({ id: "d1" });
    mockedInvoke.mockResolvedValueOnce([msg]);

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.onSelectEvent(result.current.events[0]!);
    });

    mockedInvoke.mockResolvedValueOnce(undefined);
    mockedInvoke.mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(mockedInvoke).toHaveBeenCalledWith("delete_message", { id: "d1" });
    expect(toast.success).toHaveBeenCalledWith("已删除");
    expect(result.current.deleteOpen).toBe(false);
    expect(result.current.modalOpen).toBe(false);
  });

  it("truncates long content in event title preview", async () => {
    const long = "a".repeat(50);
    mockedInvoke.mockResolvedValueOnce([
      createScheduledMessage({ content: long }),
    ]);

    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.events).toHaveLength(1));

    const title = result.current.events[0]!.title;
    expect(title.length).toBeLessThan(long.length + 20);
    expect(title).toContain("…");
  });
});
