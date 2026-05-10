# Message Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build persisted message templates that users can manage and insert into scheduled message content.

**Architecture:** Mirror the existing webhook group CRUD path: SQLite table and `db.rs` helpers, Tauri DTO/input/commands in `lib.rs`, Jotai atom plus hook in the frontend, and React dialogs wired through `App`. Template insertion remains local form state behavior and does not affect webhook, group, or schedule fields.

**Tech Stack:** Tauri v2, Rust, rusqlite, React 19, TypeScript, Jotai, Vitest, Testing Library, shadcn-style local UI components.

---

## File structure

- Create `src/types/message-template.ts`: exported `MessageTemplate` type with camelCase fields returned by Tauri.
- Create `src/store/message-templates-atoms.ts`: primitive Jotai atom for `MessageTemplate[]`.
- Create `src/hooks/use-message-templates.ts`: frontend bridge to `list_templates`, `create_template`, `update_template`, and `delete_template`.
- Create `src/hooks/use-message-templates.test.tsx`: hook tests for load, mutation reload, and error toasts.
- Create `src/components/template-form-dialog.tsx`: create/edit modal for template name, type, and content.
- Create `src/components/template-form-dialog.test.tsx`: dialog tests for create/edit initialization and disabled save behavior.
- Modify `src/test/mock-tauri-invoke.ts`: add template command support for hook tests.
- Modify `src-tauri/src/db.rs`: add schema, row mapping, CRUD helpers, and Rust unit tests for templates.
- Modify `src-tauri/src/lib.rs`: add DTO/input structs and Tauri template commands.
- Modify `src/components/app-header.tsx`: add template management button/dropdown/dialog/delete confirmation.
- Modify `src/components/app-header.test.tsx`: update props and cover template management rendering.
- Modify `src/components/message-form-dialog.tsx`: add template selector and insertion behavior.
- Modify `src/components/message-form-dialog.test.tsx`: cover template insertion and message type switching.
- Modify `src/App.tsx`: load templates and pass template CRUD/insertion data through components.

---

### Task 1: Backend template persistence

**Files:**
- Modify: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add failing Rust DB tests**

Add this test module to the end of `src-tauri/src/db.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn memory_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory database");
        init_schema(&conn).expect("initialize schema");
        conn
    }

    #[test]
    fn template_crud_round_trip() {
        let conn = memory_conn();

        let created = create_template(&conn, "早报", "markdown", "# 今日早报")
            .expect("create template");
        assert_eq!(created.name, "早报");
        assert_eq!(created.msgtype, "markdown");
        assert_eq!(created.content, "# 今日早报");

        let rows = list_templates(&conn).expect("list templates");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].id, created.id);

        let updated = update_template(&conn, &created.id, "晚报", "text", "今日总结")
            .expect("update template")
            .expect("template exists");
        assert_eq!(updated.name, "晚报");
        assert_eq!(updated.msgtype, "text");
        assert_eq!(updated.content, "今日总结");
        assert!(updated.updated_at >= created.updated_at);

        assert!(delete_template(&conn, &created.id).expect("delete template"));
        assert!(list_templates(&conn).expect("list templates").is_empty());
    }

    #[test]
    fn update_and_delete_missing_template_report_absence() {
        let conn = memory_conn();

        let updated = update_template(&conn, "missing", "x", "text", "body")
            .expect("update missing template");
        assert!(updated.is_none());

        let deleted = delete_template(&conn, "missing").expect("delete missing template");
        assert!(!deleted);
    }
}
```

- [ ] **Step 2: Run Rust test to verify it fails**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates/src-tauri
cargo test template_
```

Expected: FAIL because `create_template`, `list_templates`, `update_template`, `delete_template`, and `MessageTemplateDto` do not exist.

- [ ] **Step 3: Add backend DTOs, schema, helpers, and commands**

In `src-tauri/src/lib.rs`, add the DTO after `WebhookGroupDto`:

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageTemplateDto {
    pub id: String,
    pub name: String,
    pub msgtype: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}
```

Add input structs after `UpdateGroupInput`:

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateTemplateInput {
    name: String,
    msgtype: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateTemplateInput {
    id: String,
    name: String,
    msgtype: String,
    content: String,
}
```

Add commands after `list_groups`:

```rust
#[tauri::command]
fn create_template(
    state: State<AppDb>,
    input: CreateTemplateInput,
) -> Result<MessageTemplateDto, String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("模板名称不能为空".into());
    }
    let msgtype = normalize_msgtype(&input.msgtype)?;
    let content = input.content.trim();
    if content.is_empty() {
        return Err("模板内容不能为空".into());
    }
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    db::create_template(&conn, name, msgtype, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_template(
    state: State<AppDb>,
    input: UpdateTemplateInput,
) -> Result<MessageTemplateDto, String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("模板名称不能为空".into());
    }
    let msgtype = normalize_msgtype(&input.msgtype)?;
    let content = input.content.trim();
    if content.is_empty() {
        return Err("模板内容不能为空".into());
    }
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    match db::update_template(&conn, &input.id, name, msgtype, content)
        .map_err(|e| e.to_string())?
    {
        Some(row) => Ok(row),
        None => Err("模板不存在".into()),
    }
}

#[tauri::command]
fn delete_template(state: State<AppDb>, id: String) -> Result<(), String> {
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    let ok = db::delete_template(&conn, &id).map_err(|e| e.to_string())?;
    if !ok {
        return Err("模板不存在".into());
    }
    Ok(())
}

#[tauri::command]
fn list_templates(state: State<AppDb>) -> Result<Vec<MessageTemplateDto>, String> {
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    db::list_templates(&conn).map_err(|e| e.to_string())
}
```

Add the command names to `tauri::generate_handler!`:

```rust
create_template,
update_template,
delete_template,
list_templates,
```

In `src-tauri/src/db.rs`, change the import to:

```rust
use crate::{MessageTemplateDto, ScheduledMessageDto, WebhookGroupDto};
```

Extend `init_schema` after the `webhook_groups` table:

```sql
        CREATE TABLE IF NOT EXISTS message_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          msgtype TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
```

Add these helpers after `list_groups`:

```rust
fn template_row_to_dto(row: &rusqlite::Row<'_>) -> rusqlite::Result<MessageTemplateDto> {
    Ok(MessageTemplateDto {
        id: row.get(0)?,
        name: row.get(1)?,
        msgtype: row.get(2)?,
        content: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

pub fn create_template(
    conn: &Connection,
    name: &str,
    msgtype: &str,
    content: &str,
) -> rusqlite::Result<MessageTemplateDto> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    conn.execute(
        r#"INSERT INTO message_templates (id, name, msgtype, content, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?5)"#,
        params![id, name, msgtype, content, now],
    )?;
    get_template(conn, &id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn update_template(
    conn: &Connection,
    id: &str,
    name: &str,
    msgtype: &str,
    content: &str,
) -> rusqlite::Result<Option<MessageTemplateDto>> {
    let now = Utc::now().timestamp_millis();
    let n = conn.execute(
        r#"UPDATE message_templates SET name = ?1, msgtype = ?2, content = ?3, updated_at = ?4
           WHERE id = ?5"#,
        params![name, msgtype, content, now, id],
    )?;
    if n == 0 {
        return Ok(None);
    }
    get_template(conn, id)
}

pub fn delete_template(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
    let n = conn.execute("DELETE FROM message_templates WHERE id = ?1", params![id])?;
    Ok(n > 0)
}

pub fn get_template(conn: &Connection, id: &str) -> rusqlite::Result<Option<MessageTemplateDto>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, msgtype, content, created_at, updated_at FROM message_templates WHERE id = ?1",
    )?;
    stmt.query_row(params![id], template_row_to_dto).optional()
}

pub fn list_templates(conn: &Connection) -> rusqlite::Result<Vec<MessageTemplateDto>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, msgtype, content, created_at, updated_at FROM message_templates ORDER BY created_at ASC",
    )?;
    let mapped = stmt.query_map([], template_row_to_dto)?;
    let mut out = Vec::new();
    for r in mapped {
        out.push(r?);
    }
    Ok(out)
}
```

- [ ] **Step 4: Run Rust tests**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates/src-tauri
cargo test template_
```

Expected: PASS for the two template DB tests.

- [ ] **Step 5: Commit backend persistence**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
git add src-tauri/src/db.rs src-tauri/src/lib.rs
git commit -m "feat: add message template backend

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Frontend template state hook

**Files:**
- Create: `src/types/message-template.ts`
- Create: `src/store/message-templates-atoms.ts`
- Create: `src/hooks/use-message-templates.ts`
- Create: `src/hooks/use-message-templates.test.tsx`
- Modify: `src/test/mock-tauri-invoke.ts`

- [ ] **Step 1: Write failing hook tests**

Create `src/hooks/use-message-templates.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { useMessageTemplates } from "@/hooks/use-message-templates";
import type { MessageTemplate } from "@/types/message-template";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockedInvoke = vi.mocked(invoke);

describe("useMessageTemplates", () => {
  let templates: MessageTemplate[];
  let store: ReturnType<typeof createStore>;

  function JotaiWrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    templates = [];
    store = createStore();
    mockedInvoke.mockImplementation(async (cmd: string, payload?: unknown) => {
      if (cmd === "list_templates") return templates;
      if (cmd === "create_template") {
        templates = [
          ...templates,
          {
            id: "t1",
            name: "早报",
            msgtype: "markdown",
            content: "# 早报",
            createdAt: 1,
            updatedAt: 1,
          },
        ];
        return templates[0];
      }
      if (cmd === "update_template") {
        const input = (payload as { input: MessageTemplate }).input;
        templates = templates.map((template) =>
          template.id === input.id ? { ...template, ...input } : template,
        );
        return templates[0];
      }
      if (cmd === "delete_template") {
        const id = (payload as { id: string }).id;
        templates = templates.filter((template) => template.id !== id);
        return undefined;
      }
      throw new Error(`Unexpected invoke command: ${cmd}`);
    });
  });

  it("loads templates on mount", async () => {
    templates = [
      {
        id: "t1",
        name: "早报",
        msgtype: "markdown",
        content: "# 早报",
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const { result } = renderHook(() => useMessageTemplates(), {
      wrapper: JotaiWrapper,
    });

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(mockedInvoke).toHaveBeenCalledWith("list_templates");
  });

  it("creates templates and reloads the list", async () => {
    const { result } = renderHook(() => useMessageTemplates(), {
      wrapper: JotaiWrapper,
    });
    await waitFor(() => expect(mockedInvoke).toHaveBeenCalledWith("list_templates"));

    await act(async () => {
      await result.current.createTemplate("早报", "markdown", "# 早报");
    });

    expect(mockedInvoke).toHaveBeenCalledWith("create_template", {
      input: { name: "早报", msgtype: "markdown", content: "# 早报" },
    });
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
  });

  it("updates and deletes templates with reloads", async () => {
    templates = [
      {
        id: "t1",
        name: "早报",
        msgtype: "markdown",
        content: "# 早报",
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const { result } = renderHook(() => useMessageTemplates(), {
      wrapper: JotaiWrapper,
    });
    await waitFor(() => expect(result.current.templates).toHaveLength(1));

    await act(async () => {
      await result.current.updateTemplate("t1", "晚报", "text", "晚报正文");
    });
    expect(mockedInvoke).toHaveBeenCalledWith("update_template", {
      input: { id: "t1", name: "晚报", msgtype: "text", content: "晚报正文" },
    });

    await act(async () => {
      await result.current.deleteTemplate("t1");
    });
    expect(mockedInvoke).toHaveBeenCalledWith("delete_template", { id: "t1" });
    await waitFor(() => expect(result.current.templates).toHaveLength(0));
  });

  it("surfaces load errors through toast", async () => {
    mockedInvoke.mockRejectedValueOnce(new Error("load failed"));

    renderHook(() => useMessageTemplates(), { wrapper: JotaiWrapper });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("load failed"));
    });
  });
});
```

- [ ] **Step 2: Run hook test to verify it fails**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/hooks/use-message-templates.test.tsx
```

Expected: FAIL because the hook and type files do not exist.

- [ ] **Step 3: Add template type, atom, and hook**

Create `src/types/message-template.ts`:

```ts
export type MessageTemplate = {
  id: string;
  name: string;
  msgtype: "text" | "markdown";
  content: string;
  createdAt: number;
  updatedAt: number;
};
```

Create `src/store/message-templates-atoms.ts`:

```ts
import { atom } from "jotai";

import type { MessageTemplate } from "@/types/message-template";

export const templatesAtom = atom<MessageTemplate[]>([]);
```

Create `src/hooks/use-message-templates.ts`:

```ts
import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { templatesAtom } from "@/store/message-templates-atoms";
import type { MessageTemplate } from "@/types/message-template";

export function useMessageTemplates() {
  const [templates, setTemplates] = useAtom(templatesAtom);

  const loadTemplates = useCallback(async () => {
    try {
      const rows = await invoke<MessageTemplate[]>("list_templates");
      setTemplates(rows);
    } catch (e) {
      toast.error(String(e));
    }
  }, [setTemplates]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const createTemplate = useCallback(
    async (name: string, msgtype: "text" | "markdown", content: string) => {
      await invoke<MessageTemplate>("create_template", {
        input: { name, msgtype, content },
      });
      await loadTemplates();
    },
    [loadTemplates],
  );

  const updateTemplate = useCallback(
    async (
      id: string,
      name: string,
      msgtype: "text" | "markdown",
      content: string,
    ) => {
      await invoke<MessageTemplate>("update_template", {
        input: { id, name, msgtype, content },
      });
      await loadTemplates();
    },
    [loadTemplates],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await invoke("delete_template", { id });
      await loadTemplates();
    },
    [loadTemplates],
  );

  return {
    templates,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
```

- [ ] **Step 4: Update invoke test router**

Modify `src/test/mock-tauri-invoke.ts`:

```ts
import { vi } from "vitest";

import type { MessageTemplate } from "@/types/message-template";
import type { ScheduledMessage } from "@/types/scheduled-message";

export type InvokeRouterState = {
  listMessages: () => Promise<ScheduledMessage[]>;
  listTemplates: () => Promise<MessageTemplate[]>;
  mutateResult: unknown;
  /** Per-command throw overrides for mutation / preview commands */
  throwOn: Partial<Record<string, Error>>;
};

export function createInvokeRouter() {
  const state: InvokeRouterState = {
    listMessages: async () => [],
    listTemplates: async () => [],
    mutateResult: undefined,
    throwOn: {},
  };

  const invokeImpl = vi.fn(async (cmd: string, _payload?: unknown) => {
    switch (cmd) {
      case "list_messages":
        return state.listMessages();
      case "list_templates":
        return state.listTemplates();
      case "create_message":
      case "update_message":
      case "delete_message":
      case "send_preview":
      case "send_saved_now":
      case "create_template":
      case "update_template":
      case "delete_template": {
        const err = state.throwOn[cmd];
        if (err) throw err;
        return state.mutateResult;
      }
      default:
        throw new Error(`Unexpected invoke command: ${cmd}`);
    }
  });

  return { invokeImpl, state };
}
```

- [ ] **Step 5: Run hook tests**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/hooks/use-message-templates.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit frontend template state**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
git add src/types/message-template.ts src/store/message-templates-atoms.ts src/hooks/use-message-templates.ts src/hooks/use-message-templates.test.tsx src/test/mock-tauri-invoke.ts
git commit -m "feat: add message template state hook

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Template management UI

**Files:**
- Create: `src/components/template-form-dialog.tsx`
- Create: `src/components/template-form-dialog.test.tsx`
- Modify: `src/components/app-header.tsx`
- Modify: `src/components/app-header.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing dialog tests**

Create `src/components/template-form-dialog.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TemplateFormDialog } from "@/components/template-form-dialog";
import { ThemeProvider } from "@/components/theme-provider";
import type { MessageTemplate } from "@/types/message-template";

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}

const template: MessageTemplate = {
  id: "t1",
  name: "早报",
  msgtype: "markdown",
  content: "# 早报",
  createdAt: 1,
  updatedAt: 1,
};

describe("TemplateFormDialog", () => {
  it("creates a template with trimmed name and content", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TemplateFormDialog
        open
        onOpenChange={vi.fn()}
        editing={null}
        onSave={onSave}
      />,
      { wrapper: TestProviders },
    );

    await user.type(screen.getByLabelText("模板名称"), "  早报  ");
    await user.click(screen.getByRole("combobox", { name: "消息类型" }));
    await user.click(screen.getByRole("option", { name: "markdown" }));
    await user.type(screen.getByLabelText("模板内容"), "  # 早报  ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith("早报", "markdown", "# 早报");
  });

  it("hydrates fields for editing", () => {
    render(
      <TemplateFormDialog
        open
        onOpenChange={vi.fn()}
        editing={template}
        onSave={vi.fn()}
      />,
      { wrapper: TestProviders },
    );

    expect(screen.getByLabelText("模板名称")).toHaveValue("早报");
    expect(screen.getByLabelText("模板内容")).toHaveValue("# 早报");
    expect(screen.getByRole("combobox", { name: "消息类型" })).toHaveTextContent(
      "markdown",
    );
  });

  it("disables save until name and content are present", async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormDialog
        open
        onOpenChange={vi.fn()}
        editing={null}
        onSave={vi.fn()}
      />,
      { wrapper: TestProviders },
    );

    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    await user.type(screen.getByLabelText("模板名称"), "早报");
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    await user.type(screen.getByLabelText("模板内容"), "内容");
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run dialog test to verify it fails**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/components/template-form-dialog.test.tsx
```

Expected: FAIL because `TemplateFormDialog` does not exist.

- [ ] **Step 3: Implement `TemplateFormDialog`**

Create `src/components/template-form-dialog.tsx`:

```tsx
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MessageTemplate } from "@/types/message-template";

type TemplateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MessageTemplate | null;
  onSave: (
    name: string,
    msgtype: "text" | "markdown",
    content: string,
  ) => Promise<void>;
};

export function TemplateFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: TemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [msgtype, setMsgtype] = useState<"text" | "markdown">("text");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setMsgtype(editing?.msgtype ?? "text");
      setContent(editing?.content ?? "");
    }
  }, [open, editing]);

  const handleSave = async () => {
    await onSave(name.trim(), msgtype, content.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑模板" : "新建模板"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="template-name">模板名称</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="早报模板"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-msgtype">消息类型</Label>
            <Select
              value={msgtype}
              onValueChange={(v) =>
                setMsgtype(v === "markdown" ? "markdown" : "text")
              }
            >
              <SelectTrigger id="template-msgtype" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">text</SelectItem>
                <SelectItem value="markdown">markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-content">模板内容</Label>
            <Textarea
              id="template-content"
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="可复用的消息内容"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || !content.trim()}
            onClick={() => void handleSave()}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run dialog tests**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/components/template-form-dialog.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write failing header test for template controls**

Modify `src/components/app-header.test.tsx` so the render in the existing test includes template props:

```tsx
        templates={[]}
        onCreateTemplate={vi.fn()}
        onUpdateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
```

Add this test:

```tsx
  it("renders template management controls", async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        onNewMessage={vi.fn()}
        groups={[]}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        templates={[
          {
            id: "t1",
            name: "早报",
            msgtype: "markdown",
            content: "# 早报",
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
        onCreateTemplate={vi.fn()}
        onUpdateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />,
      { wrapper: TestProviders },
    );

    expect(screen.getByRole("button", { name: "新建模板" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "模板列表" }));
    expect(screen.getByText("模板列表")).toBeInTheDocument();
    expect(screen.getByText("早报")).toBeInTheDocument();
    expect(screen.getByText("markdown")).toBeInTheDocument();
  });
```

- [ ] **Step 6: Run header test to verify it fails**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/components/app-header.test.tsx
```

Expected: FAIL because `AppHeader` does not accept template props yet.

- [ ] **Step 7: Add template management to `AppHeader`**

Modify imports in `src/components/app-header.tsx`:

```tsx
import { TemplateFormDialog } from "@/components/template-form-dialog";
import type { MessageTemplate } from "@/types/message-template";
```

Extend `AppHeaderProps`:

```tsx
  templates: MessageTemplate[];
  onCreateTemplate: (
    name: string,
    msgtype: "text" | "markdown",
    content: string,
  ) => Promise<void>;
  onUpdateTemplate: (
    id: string,
    name: string,
    msgtype: "text" | "markdown",
    content: string,
  ) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
```

Destructure those props. Add state:

```tsx
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplate | null>(null);
```

Add handlers:

```tsx
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async (
    name: string,
    msgtype: "text" | "markdown",
    content: string,
  ) => {
    try {
      if (editingTemplate) {
        await onUpdateTemplate(editingTemplate.id, name, msgtype, content);
        toast.success("已更新模板");
      } else {
        await onCreateTemplate(name, msgtype, content);
        toast.success("已创建模板");
      }
    } catch (e) {
      toast.error(String(e));
      throw e;
    }
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      await onDeleteTemplate(deletingTemplate.id);
      toast.success(`已删除「${deletingTemplate.name}」`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setDeletingTemplate(null);
    }
  };
```

Insert a template management control next to the group control:

```tsx
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-r-none border-r-0"
              onClick={openCreateTemplate}
            >
              <Plus className="mr-1 size-4" />
              新建模板
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none px-2"
                    aria-label="模板列表"
                  />
                }
              >
                <ChevronDownIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>模板列表</DropdownMenuLabel>
                  {templates.length === 0 ? (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      暂无模板
                    </div>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between rounded-md px-1.5 py-1 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate">{template.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.msgtype}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-accent"
                            onClick={() => openEditTemplate(template)}
                            aria-label="编辑模板"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingTemplate(template)}
                            aria-label="删除模板"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
```

Add dialog and delete confirmation before the existing group delete confirmation or after it:

```tsx
      <TemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        editing={editingTemplate}
        onSave={handleSaveTemplate}
      />

      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => {
          if (!open) setDeletingTemplate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除模板「{deletingTemplate?.name}」？
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，模板将被永久移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleConfirmDeleteTemplate()}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
```

- [ ] **Step 8: Wire templates in `App.tsx`**

Modify `src/App.tsx`:

```tsx
import { useMessageTemplates } from "@/hooks/use-message-templates";
```

Inside `App`:

```tsx
  const mt = useMessageTemplates();
```

Add props to `AppHeader`:

```tsx
        templates={mt.templates}
        onCreateTemplate={mt.createTemplate}
        onUpdateTemplate={mt.updateTemplate}
        onDeleteTemplate={mt.deleteTemplate}
```

- [ ] **Step 9: Run header and dialog tests**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/components/template-form-dialog.test.tsx src/components/app-header.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit template management UI**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
git add src/components/template-form-dialog.tsx src/components/template-form-dialog.test.tsx src/components/app-header.tsx src/components/app-header.test.tsx src/App.tsx
git commit -m "feat: add message template management UI

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Template insertion in message form

**Files:**
- Modify: `src/components/message-form-dialog.tsx`
- Modify: `src/components/message-form-dialog.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing insertion tests**

Modify `src/components/message-form-dialog.test.tsx`:

Add `userEvent` import:

```tsx
import userEvent from "@testing-library/user-event";
```

Add `MessageTemplate` import:

```tsx
import type { MessageTemplate } from "@/types/message-template";
```

Add `baseTemplate` after `baseGroup`:

```tsx
const baseTemplate: MessageTemplate = {
  id: "t1",
  name: "早报",
  msgtype: "markdown",
  content: "# 今日早报",
  createdAt: 1,
  updatedAt: 1,
};
```

Add `templates: []` to default props in `renderDialog`.

Add these tests:

```tsx
  it("inserts a selected template and switches message type", async () => {
    const user = userEvent.setup();
    const onContentChange = vi.fn();
    const onMsgtypeChange = vi.fn();

    renderDialog({
      templates: [baseTemplate],
      content: "开头",
      onContentChange,
      onMsgtypeChange,
    });

    await user.click(screen.getByRole("combobox", { name: "插入模板" }));
    await user.click(screen.getByRole("option", { name: /早报/ }));

    expect(onMsgtypeChange).toHaveBeenCalledWith("markdown");
    expect(onContentChange).toHaveBeenCalledWith("开头\n# 今日早报");
  });

  it("does not show template selector when there are no templates", () => {
    renderDialog({ templates: [] });

    expect(
      screen.queryByRole("combobox", { name: "插入模板" }),
    ).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run insertion tests to verify they fail**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/components/message-form-dialog.test.tsx
```

Expected: FAIL because `MessageFormDialog` does not accept templates yet.

- [ ] **Step 3: Implement template insertion**

Modify `src/components/message-form-dialog.tsx` imports:

```tsx
import { useEffect, useRef, useState } from "react";
import type { MessageTemplate } from "@/types/message-template";
```

Extend props:

```tsx
  templates: MessageTemplate[];
```

Destructure `templates`.

Inside the component, add:

```tsx
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedTemplateValue, setSelectedTemplateValue] = useState("__placeholder__");

  const appendTemplateContent = (templateContent: string) => {
    if (!content) return templateContent;
    return `${content}${content.endsWith("\n") ? "" : "\n"}${templateContent}`;
  };

  const handleTemplateSelect = (value: string) => {
    const template = templates.find((item) => item.id === value);
    if (!template) return;
    onMsgtypeChange(template.msgtype);

    const el = contentRef.current;
    if (
      el &&
      typeof el.selectionStart === "number" &&
      typeof el.selectionEnd === "number" &&
      document.activeElement === el
    ) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      onContentChange(
        `${content.slice(0, start)}${template.content}${content.slice(end)}`,
      );
    } else {
      onContentChange(appendTemplateContent(template.content));
    }
    setSelectedTemplateValue("__placeholder__");
  };
```

Add template selector before the content field:

```tsx
          {templates.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="template">插入模板</Label>
              <Select
                value={selectedTemplateValue}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger id="template" className="w-full min-w-0">
                  <SelectValue placeholder="选择模板插入到内容" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__placeholder__" disabled>
                    选择模板插入到内容
                  </SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} · {template.msgtype}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
```

Add the ref to the content textarea:

```tsx
              ref={contentRef}
```

- [ ] **Step 4: Pass templates from `App.tsx`**

Add to `MessageFormDialog` props in `src/App.tsx`:

```tsx
        templates={mt.templates}
```

- [ ] **Step 5: Run insertion tests**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun test src/components/message-form-dialog.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit template insertion**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
git add src/components/message-form-dialog.tsx src/components/message-form-dialog.test.tsx src/App.tsx
git commit -m "feat: insert templates into messages

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Full verification and issue handoff

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run frontend tests**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun run test
```

Expected: all Vitest test files pass.

- [ ] **Step 2: Run Rust tests**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates/src-tauri
cargo test
```

Expected: all Rust tests pass.

- [ ] **Step 3: Run production build**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
bun run build
```

Expected: TypeScript and Vite production build pass. The command also regenerates app icons.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
git --no-pager status --short
git --no-pager diff --stat origin/main...HEAD
git --no-pager diff --check
```

Expected: no whitespace errors; only intended files changed.

- [ ] **Step 5: Commit any final fixes**

If Step 1, 2, 3, or 4 required fixes, commit them:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
git add <fixed-files>
git commit -m "fix: finalize message templates

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

If no fixes were needed, do not create an empty commit.

- [ ] **Step 6: Prepare final handoff**

Run:

```bash
cd /Users/billy/Projects/calendar-message/.worktrees/issue-9-message-templates
git --no-pager log --oneline --decorate --max-count=8
git --no-pager status --short --branch
```

Expected: branch `issue-9-message-templates` contains the spec commit plus feature commits, and working tree is clean.

---

## Self-review

- Spec coverage: backend persistence, CRUD commands, frontend hook, header management UI, message form insertion, error handling, and verification are covered by Tasks 1-5.
- Placeholder scan: no incomplete implementation placeholders are intentionally left in the plan.
- Type consistency: `MessageTemplate.msgtype` is consistently typed as `"text" | "markdown"` in frontend code; Rust DTO uses `String` and command input normalization.
