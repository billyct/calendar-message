import { renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";

import { mockInvoke } from "@/test/mock-tauri-invoke";
import { useMessageTemplates } from "./use-message-templates";
import type { MessageTemplate } from "@/types/message-template";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createStore();
  return <Provider store={store}>{children}</Provider>;
};

describe("useMessageTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads templates on mount and calls list_templates", async () => {
    const mockTemplates: MessageTemplate[] = [
      {
        id: "t1",
        name: "Daily Standup",
        msgtype: "text",
        content: "Today's standup",
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: "t2",
        name: "Weekly Report",
        msgtype: "markdown",
        content: "# Weekly Report",
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    mockInvoke({ listTemplates: () => mockTemplates });

    const { result } = renderHook(() => useMessageTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(2);
    });

    expect(result.current.templates).toEqual(mockTemplates);
  });

  it("createTemplate calls create_template with input and reloads", async () => {
    const initialTemplates: MessageTemplate[] = [
      {
        id: "t1",
        name: "Existing",
        msgtype: "text",
        content: "Content",
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const newTemplate: MessageTemplate = {
      id: "t2",
      name: "New Template",
      msgtype: "markdown",
      content: "# New",
      createdAt: 2000,
      updatedAt: 2000,
    };

    let callCount = 0;
    mockInvoke({
      listTemplates: () => {
        callCount++;
        return callCount === 1 ? initialTemplates : [...initialTemplates, newTemplate];
      },
    });

    const { result } = renderHook(() => useMessageTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(1);
    });

    await result.current.createTemplate("New Template", "markdown", "# New");

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(2);
    });

    expect(result.current.templates[1]).toEqual(newTemplate);
  });

  it("updateTemplate calls update_template with id and input and reloads", async () => {
    const initialTemplates: MessageTemplate[] = [
      {
        id: "t1",
        name: "Old Name",
        msgtype: "text",
        content: "Old content",
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const updatedTemplates: MessageTemplate[] = [
      {
        id: "t1",
        name: "New Name",
        msgtype: "markdown",
        content: "New content",
        createdAt: 1000,
        updatedAt: 3000,
      },
    ];

    let callCount = 0;
    mockInvoke({
      listTemplates: () => {
        callCount++;
        return callCount === 1 ? initialTemplates : updatedTemplates;
      },
    });

    const { result } = renderHook(() => useMessageTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(1);
    });

    await result.current.updateTemplate("t1", "New Name", "markdown", "New content");

    await waitFor(() => {
      expect(result.current.templates[0].name).toBe("New Name");
    });

    expect(result.current.templates[0]).toEqual(updatedTemplates[0]);
  });

  it("deleteTemplate calls delete_template with id and reloads", async () => {
    const initialTemplates: MessageTemplate[] = [
      {
        id: "t1",
        name: "Template 1",
        msgtype: "text",
        content: "Content 1",
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: "t2",
        name: "Template 2",
        msgtype: "text",
        content: "Content 2",
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    let callCount = 0;
    mockInvoke({
      listTemplates: () => {
        callCount++;
        return callCount === 1 ? initialTemplates : [initialTemplates[1]];
      },
    });

    const { result } = renderHook(() => useMessageTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(2);
    });

    await result.current.deleteTemplate("t1");

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(1);
    });

    expect(result.current.templates[0].id).toBe("t2");
  });

  it("load errors surface through toast.error", async () => {
    mockInvoke({ throwOn: ["list_templates"] });

    renderHook(() => useMessageTemplates(), { wrapper });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("加载模板失败");
    });
  });
});
