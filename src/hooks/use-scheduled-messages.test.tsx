import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { useScheduledMessages } from "@/hooks/use-scheduled-messages";
import { createScheduledMessage } from "@/test/factories";
import { createInvokeRouter } from "@/test/mock-tauri-invoke";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

type EventCallback = (event: { event: string; payload: unknown }) => void;
const eventListeners = new Map<string, Set<EventCallback>>();

function emitTauriEvent(name: string, payload: unknown = null): void {
  const subs = eventListeners.get(name);
  if (!subs) return;
  for (const cb of subs) {
    cb({ event: name, payload });
  }
}

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, cb: EventCallback) => {
    let bucket = eventListeners.get(name);
    if (!bucket) {
      bucket = new Set();
      eventListeners.set(name, bucket);
    }
    bucket.add(cb);
    return () => {
      bucket?.delete(cb);
    };
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedInvoke = vi.mocked(invoke);

describe("useScheduledMessages", () => {
  let invokeRouter: ReturnType<typeof createInvokeRouter>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedInvoke.mockReset();
    eventListeners.clear();
    invokeRouter = createInvokeRouter();
    mockedInvoke.mockImplementation(invokeRouter.invokeImpl);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads messages for current month on mount", async () => {
    const row = createScheduledMessage({ id: "a" });
    invokeRouter.state.listMessages = async () => [row];

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

  it("clears stale events when list_messages fails", async () => {
    const stale = createScheduledMessage({ id: "stale" });
    let n = 0;
    invokeRouter.state.listMessages = async () => {
      n += 1;
      if (n === 1) return [stale];
      throw new Error("network");
    };

    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.events).toHaveLength(1));

    await act(async () => {
      result.current.onNavigate(new Date(2030, 3, 15));
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(result.current.events).toHaveLength(0);
  });

  it("openCreate resets draft fields, closes date popover state, and opens modal", async () => {
    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setScheduleDateOpen(true);
      result.current.openCreate();
    });

    expect(result.current.modalOpen).toBe(true);
    expect(result.current.scheduleDateOpen).toBe(false);
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
    invokeRouter.state.listMessages = async () => [msg];

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

  it("month view slot keeps slot date but uses wall-clock hours", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2024, 5, 15, 14, 35, 0));

    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.onSelectSlot(new Date(2024, 5, 10, 9, 0, 0));
    });

    expect(result.current.scheduledAtDate.getFullYear()).toBe(2024);
    expect(result.current.scheduledAtDate.getMonth()).toBe(5);
    expect(result.current.scheduledAtDate.getDate()).toBe(10);
    expect(result.current.scheduledAtDate.getHours()).toBe(14);
    expect(result.current.scheduledAtDate.getMinutes()).toBe(35);
  });

  it("week/day slot uses the slot start instant as scheduled time", async () => {
    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.onViewChange("week");
    });

    const slot = new Date(2024, 5, 10, 9, 15, 0);

    act(() => {
      result.current.onSelectSlot(slot);
    });

    expect(result.current.scheduledAtDate.getTime()).toBe(slot.getTime());
  });

  it("saveMessage invokes create_message when not editing", async () => {
    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(mockedInvoke).toHaveBeenCalled());

    act(() => {
      result.current.openCreate();
      result.current.setWebhookUrl("https://hook");
      result.current.setContent("hi");
    });

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

  it("saveMessage keeps modal open and toasts on create failure", async () => {
    invokeRouter.state.throwOn.create_message = new Error("bad-create");

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openCreate();
      result.current.setWebhookUrl("https://hook");
      result.current.setContent("hi");
    });

    await act(async () => {
      await result.current.saveMessage();
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("bad-create"));
    expect(result.current.modalOpen).toBe(true);
  });

  it("saveMessage invokes update_message when editingId is set", async () => {
    const msg = createScheduledMessage({ id: "u1" });
    invokeRouter.state.listMessages = async () => [msg];

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.onSelectEvent(result.current.events[0]!);
      result.current.setContent("updated");
    });

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

  it("saveMessage keeps modal open on update failure", async () => {
    const msg = createScheduledMessage({ id: "u1" });
    invokeRouter.state.listMessages = async () => [msg];
    invokeRouter.state.throwOn.update_message = new Error("bad-update");

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.onSelectEvent(result.current.events[0]!);
    });

    await act(async () => {
      await result.current.saveMessage();
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("bad-update"));
    expect(result.current.modalOpen).toBe(true);
  });

  it("confirmDelete invokes delete_message", async () => {
    const msg = createScheduledMessage({ id: "d1" });
    invokeRouter.state.listMessages = async () => [msg];

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.onSelectEvent(result.current.events[0]!);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(mockedInvoke).toHaveBeenCalledWith("delete_message", { id: "d1" });
    expect(toast.success).toHaveBeenCalledWith("已删除");
    expect(result.current.deleteOpen).toBe(false);
    expect(result.current.modalOpen).toBe(false);
  });

  it("confirmDelete surfaces errors without closing dialogs", async () => {
    const msg = createScheduledMessage({ id: "d1" });
    invokeRouter.state.listMessages = async () => [msg];
    invokeRouter.state.throwOn.delete_message = new Error("bad-delete");

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.onSelectEvent(result.current.events[0]!);
      result.current.setDeleteOpen(true);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("bad-delete"));
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.deleteOpen).toBe(true);
  });

  it("sendTestFromForm invokes send_preview and toasts success", async () => {
    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openCreate();
      result.current.setWebhookUrl("https://w");
      result.current.setContent("x");
    });

    await act(async () => {
      await result.current.sendTestFromForm();
    });

    expect(mockedInvoke).toHaveBeenCalledWith(
      "send_preview",
      expect.objectContaining({
        webhookUrl: "https://w",
        msgtype: "text",
        content: "x",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("测试发送成功");
  });

  it("sendTestFromForm toasts error when preview fails", async () => {
    invokeRouter.state.throwOn.send_preview = new Error("preview-down");

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openCreate();
      result.current.setWebhookUrl("https://w");
    });

    await act(async () => {
      await result.current.sendTestFromForm();
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("preview-down"));
  });

  it("sendSavedNow invokes send_saved_now and reloads", async () => {
    const msg = createScheduledMessage({ id: "s1" });
    invokeRouter.state.listMessages = async () => [msg];

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    await act(async () => {
      await result.current.sendSavedNow("s1");
    });

    expect(mockedInvoke).toHaveBeenCalledWith("send_saved_now", { id: "s1" });
    expect(toast.success).toHaveBeenCalledWith("立即发送成功");
  });

  it("sendSavedNow toasts error when invoke fails", async () => {
    invokeRouter.state.throwOn.send_saved_now = new Error("send-fail");

    const { result } = renderHook(() => useScheduledMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendSavedNow("any");
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("send-fail"));
  });

  it("truncates long content in event title preview", async () => {
    const long = "a".repeat(50);
    invokeRouter.state.listMessages = async () => [
      createScheduledMessage({ content: long }),
    ];

    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.events).toHaveLength(1));

    const title = result.current.events[0]!.title;
    expect(title.length).toBeLessThan(long.length + 20);
    expect(title).toContain("…");
  });

  it("reloads messages and updates status when messages-changed event fires", async () => {
    let status: "pending" | "sent" = "pending";
    invokeRouter.state.listMessages = async () => [
      createScheduledMessage({ id: "rt-1", status }),
    ];

    const { result } = renderHook(() => useScheduledMessages());

    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.events[0]!.title).toContain("待发送");

    status = "sent";

    await act(async () => {
      emitTauriEvent("messages-changed");
    });

    await waitFor(() => {
      expect(result.current.events[0]!.title).toContain("已发送");
    });
  });

  it("unsubscribes from messages-changed when the hook unmounts", async () => {
    const { unmount } = renderHook(() => useScheduledMessages());

    await waitFor(() => {
      expect(eventListeners.get("messages-changed")?.size).toBe(1);
    });

    unmount();

    await waitFor(() => {
      expect(eventListeners.get("messages-changed")?.size ?? 0).toBe(0);
    });
  });
});
