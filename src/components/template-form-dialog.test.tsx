import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider } from "@/components/theme-provider";
import { TemplateFormDialog } from "@/components/template-form-dialog";
import type { MessageTemplate } from "@/types/message-template";

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}

describe("TemplateFormDialog", () => {
  it("creates a template with trimmed name/content and selected markdown msgtype", async () => {
    cleanup();
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <TemplateFormDialog
        open={true}
        onOpenChange={onOpenChange}
        editing={null}
        onSave={onSave}
      />,
      {
        wrapper: TestProviders,
      },
    );

    expect(screen.getByText("新建模板")).toBeInTheDocument();

    await user.type(screen.getByLabelText("模板名称"), "  My Template  ");
    
    // Select markdown from the msgtype select
    const msgtypeSelect = screen.getByLabelText("消息类型");
    await user.click(msgtypeSelect);
    await user.click(screen.getByRole("option", { name: "markdown" }));
    
    await user.type(screen.getByLabelText("模板内容"), "  # Test Content  ");

    const saveButton = screen.getByRole("button", { name: "保存" });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("My Template", "markdown", "# Test Content");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    cleanup();
  });

  it("hydrates fields for editing an existing template", async () => {
    cleanup();
    const existingTemplate: MessageTemplate = {
      id: "tpl-1",
      name: "Existing Template",
      msgtype: "markdown",
      content: "## Existing Content",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <TemplateFormDialog
        open={true}
        onOpenChange={vi.fn()}
        editing={existingTemplate}
        onSave={vi.fn()}
      />,
      {
        wrapper: TestProviders,
      },
    );

    await waitFor(() => {
      expect(screen.getByText("编辑模板")).toBeInTheDocument();
      expect(screen.getByLabelText("模板名称")).toHaveValue("Existing Template");
      expect(screen.getByLabelText("模板内容")).toHaveValue("## Existing Content");
      // The select should show markdown
      expect(screen.getByDisplayValue("markdown")).toBeInTheDocument();
    });
    
    cleanup();
  });

  it("disables save until name and content are present", async () => {
    cleanup();
    const user = userEvent.setup();

    render(
      <TemplateFormDialog
        open={true}
        onOpenChange={vi.fn()}
        editing={null}
        onSave={vi.fn()}
      />,
      {
        wrapper: TestProviders,
      },
    );

    const saveButton = screen.getByRole("button", { name: "保存" });
    
    // Initially disabled
    expect(saveButton).toBeDisabled();

    // Add name only
    await user.type(screen.getByLabelText("模板名称"), "Template Name");
    await waitFor(() => expect(saveButton).toBeDisabled());

    // Add content
    await user.type(screen.getByLabelText("模板内容"), "Some content");
    await waitFor(() => expect(saveButton).toBeEnabled());

    // Clear name
    await user.clear(screen.getByLabelText("模板名称"));
    await waitFor(() => expect(saveButton).toBeDisabled());
    
    cleanup();
  });
});
