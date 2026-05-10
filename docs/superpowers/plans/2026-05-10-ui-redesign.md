# UI 重新设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current single-page Tauri desktop app (header + full-screen calendar + form dialogs) into a three-column dashboard with sidebar navigation, route-based pages for all CRUD forms, and auxiliary panels (today messages, quick create, stats overview).

**Architecture:** `BrowserRouter` + shadcn `Sidebar` shell. Each form dialog becomes a route page (`/messages/new`, `/messages/:id`, `/groups/new|:id`, `/templates/new|:id`). Hooks split into `*Data()` (atom-backed lists) and `*Editor(id?)` (local-state form). Three new Tauri commands expose single-record fetches. Theme switch moves into a new SettingsPage.

**Tech Stack:** React 18 + TypeScript, Tauri v2, Rust + SQLite, Jotai (state), shadcn/ui (components), `react-router-dom` (new), `next-themes` (existing), Vitest + RTL (tests).

**Spec:** `docs/superpowers/specs/2026-05-10-ui-redesign-design.md`

---

## Conventions for this plan

- All paths are absolute from repo root unless prefixed `src-tauri/` (in which case they're absolute too — just denoting Rust side).
- Use **Bun** for everything frontend (`bun add`, `bun run`, `bunx`).
- Run shadcn installs with `bunx shadcn@latest add <component>` from repo root. The components.json is configured with `style=base-nova`, `baseColor=neutral`, `iconLibrary=lucide`.
- Frontend tests: `bun run test -- --run path/to.test.ts` for one shot. Use `bun run test` to run all (vitest is configured to run once by default per `package.json` scripts).
- Rust tests: `cd src-tauri && cargo test <name>`.
- Commits use Conventional Commits prefix (e.g. `feat:`, `refactor:`). Always include the Co-authored-by trailer:
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```
- Schema is not changed in this plan — no migrations needed.

---

## Task 1: Install dependencies & shadcn components

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/package.json` (added react-router-dom)
- Create: `/Users/billy/Projects/calendar-message/src/components/ui/sidebar.tsx` (and the other shadcn files listed below)

- [ ] **Step 1: Add `react-router-dom`**

```bash
cd /Users/billy/Projects/calendar-message
bun add react-router-dom
```

Expected: `package.json` `dependencies` now includes `react-router-dom` (v6.x or v7.x).

- [ ] **Step 2: Install shadcn components**

Run each of these in order (separate so any prompts are visible):

```bash
cd /Users/billy/Projects/calendar-message
bunx shadcn@latest add sidebar
bunx shadcn@latest add table
bunx shadcn@latest add card
bunx shadcn@latest add badge
bunx shadcn@latest add separator
bunx shadcn@latest add switch
bunx shadcn@latest add radio-group
bunx shadcn@latest add scroll-area
bunx shadcn@latest add skeleton
bunx shadcn@latest add empty
bunx shadcn@latest add tooltip
bunx shadcn@latest add field
bunx shadcn@latest add item
bunx shadcn@latest add toggle-group
bunx shadcn@latest add button-group
```

If any prompt appears (e.g. "overwrite existing button.tsx?"), choose **No** unless explicitly told otherwise.

Expected: Each command creates `src/components/ui/<name>.tsx`. `sidebar` will also add CSS variables (which already exist in `src/index.css`) and a hook `src/hooks/use-mobile.ts`.

- [ ] **Step 3: Verify build**

```bash
cd /Users/billy/Projects/calendar-message
bun run build
```

Expected: Build succeeds (icons + tsc + vite). If any new shadcn file fails to compile, fix the import (usually `@/lib/utils` or peer deps like `@radix-ui/react-*`).

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock src/components/ui/ src/hooks/use-mobile.ts components.json src/index.css
git commit -m "chore: add react-router-dom and shadcn components for UI redesign

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Build app shell skeleton (sidebar + routes, empty pages)

**Files:**
- Create: `/Users/billy/Projects/calendar-message/src/components/app-shell.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/components/app-sidebar.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/components/page-header.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/components/right-rail.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/calendar-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/message-list-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/message-editor-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/group-list-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/group-editor-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/template-list-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/template-editor-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/pages/settings-page.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/router.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/main.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/App.tsx` (will be replaced with Outlet host)

- [ ] **Step 1: Create `PageHeader`**

```tsx
// src/components/page-header.tsx
import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  back?: () => void;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, back, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b bg-background px-6 py-4", className)}>
      <div className="flex items-center gap-3">
        {back ? (
          <Button variant="ghost" size="icon" onClick={back} aria-label="返回">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : null}
        <div>
          <h1 className="text-lg font-semibold leading-none">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Create `AppSidebar` (placeholder stats)**

```tsx
// src/components/app-sidebar.tsx
import { NavLink, useLocation } from "react-router-dom";
import { Calendar, ClipboardList, Users, FileText, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const NAV = [
  { to: "/calendar", label: "日历视图", icon: Calendar },
  { to: "/messages", label: "消息列表", icon: ClipboardList },
  { to: "/groups", label: "群组管理", icon: Users },
  { to: "/templates", label: "模板管理", icon: FileText },
  { to: "/settings", label: "设置", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-3">
          <div className="text-base font-semibold">企业微信定时消息</div>
          <div className="text-xs text-muted-foreground">Webhook 定时发送</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.to}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>本月概览</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-2 text-xs text-muted-foreground">（统计概览将在后续任务中加入）</div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-muted-foreground">
          <div>本地应用 v0.1.0</div>
          <a
            className="text-primary hover:underline"
            href="https://github.com/billyct/calendar-message"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
```

- [ ] **Step 3: Create empty `RightRail`**

```tsx
// src/components/right-rail.tsx
import { useMatch } from "react-router-dom";

export function RightRail() {
  const onCalendar = useMatch("/calendar");
  if (!onCalendar) return null;
  return (
    <aside className="w-80 shrink-0 border-l bg-background p-4">
      <div className="text-sm text-muted-foreground">右侧面板（今日消息 / 快速创建）将在后续任务中加入。</div>
    </aside>
  );
}
```

- [ ] **Step 4: Create `AppShell`**

```tsx
// src/components/app-shell.tsx
import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RightRail } from "@/components/right-rail";

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
        <RightRail />
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 5: Create stub pages**

For each page below, create a file with this template (replace `<TITLE>` and `<NAME>`):

```tsx
import { PageHeader } from "@/components/page-header";

export function <NAME>() {
  return (
    <>
      <PageHeader title="<TITLE>" />
      <div className="flex-1 overflow-auto p-6 text-sm text-muted-foreground">即将到来</div>
    </>
  );
}
```

| File | Component name | Title |
|---|---|---|
| `src/pages/calendar-page.tsx` | `CalendarPage` | 日历视图 |
| `src/pages/message-list-page.tsx` | `MessageListPage` | 消息列表 |
| `src/pages/message-editor-page.tsx` | `MessageEditorPage` | 编辑消息 |
| `src/pages/group-list-page.tsx` | `GroupListPage` | 群组管理 |
| `src/pages/group-editor-page.tsx` | `GroupEditorPage` | 编辑群组 |
| `src/pages/template-list-page.tsx` | `TemplateListPage` | 模板管理 |
| `src/pages/template-editor-page.tsx` | `TemplateEditorPage` | 编辑模板 |
| `src/pages/settings-page.tsx` | `SettingsPage` | 设置 |

- [ ] **Step 6: Create router**

```tsx
// src/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { CalendarPage } from "@/pages/calendar-page";
import { MessageListPage } from "@/pages/message-list-page";
import { MessageEditorPage } from "@/pages/message-editor-page";
import { GroupListPage } from "@/pages/group-list-page";
import { GroupEditorPage } from "@/pages/group-editor-page";
import { TemplateListPage } from "@/pages/template-list-page";
import { TemplateEditorPage } from "@/pages/template-editor-page";
import { SettingsPage } from "@/pages/settings-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/calendar" replace /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "messages", element: <MessageListPage /> },
      { path: "messages/new", element: <MessageEditorPage /> },
      { path: "messages/:id", element: <MessageEditorPage /> },
      { path: "groups", element: <GroupListPage /> },
      { path: "groups/new", element: <GroupEditorPage /> },
      { path: "groups/:id", element: <GroupEditorPage /> },
      { path: "templates", element: <TemplateListPage /> },
      { path: "templates/new", element: <TemplateEditorPage /> },
      { path: "templates/:id", element: <TemplateEditorPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
```

- [ ] **Step 7: Wire router into `main.tsx`**

Replace `src/main.tsx` so it renders `<RouterProvider router={router} />` instead of `<App />`. Keep `ThemeProvider` and `Toaster`.

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { router } from "@/router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </React.StrictMode>
);
```

(`src/App.tsx` will be deleted in Task 3 once the calendar is migrated.)

- [ ] **Step 8: Build and smoke test**

```bash
cd /Users/billy/Projects/calendar-message
bun run build
```

Expected: build passes. Then start dev:

```bash
bun run dev
```

Open http://localhost:1420 — confirm sidebar renders, navigation between routes works, each page shows its title.

- [ ] **Step 9: Commit**

```bash
git add src/main.tsx src/router.tsx src/components/app-shell.tsx src/components/app-sidebar.tsx src/components/right-rail.tsx src/components/page-header.tsx src/pages/
git commit -m "feat(ui): scaffold app shell with sidebar and routes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Migrate calendar to `/calendar`, delete old App + AppHeader

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/src/pages/calendar-page.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/components/message-calendar.tsx` (height adjustment, click → navigate)
- Delete: `/Users/billy/Projects/calendar-message/src/App.tsx`
- Delete: `/Users/billy/Projects/calendar-message/src/components/app-header.tsx`

- [ ] **Step 1: Read current `App.tsx` and `MessageCalendar` to understand wiring**

Read `src/App.tsx`, `src/components/app-header.tsx`, `src/components/message-calendar.tsx`. Identify which props/handlers `MessageCalendar` needs from `useScheduledMessages`. Also note where the dialogs were opened.

- [ ] **Step 2: Update `MessageCalendar` to navigate instead of opening dialogs**

In `src/components/message-calendar.tsx`:

- Remove any prop / callback that opens the dialog (e.g. `onSelectEvent`, `onSelectSlot`).
- Inside the component, add `const navigate = useNavigate();` (`import { useNavigate } from "react-router-dom"`).
- For event click: `onSelectEvent={(event) => navigate(\`/messages/\${event.resource.id}\`)}` (the event resource is the `ScheduledMessage` — confirm by reading the existing code; if differently shaped, adapt).
- For slot click (creating at a time): `onSelectSlot={(slot) => navigate(\`/messages/new?at=\${slot.start.toISOString()}\`)}`.
- Update the wrapper `style` from `height: calc(100vh - 140px)` to `height: '100%'`. The page container will provide height.

- [ ] **Step 3: Implement `CalendarPage`**

```tsx
// src/pages/calendar-page.tsx
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MessageCalendar } from "@/components/message-calendar";
import { useScheduledMessages } from "@/hooks/use-scheduled-messages";

export function CalendarPage() {
  const navigate = useNavigate();
  const messages = useScheduledMessages();
  return (
    <>
      <PageHeader
        title="日历视图"
        subtitle="管理你的定时消息"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/groups/new")}>
              <Plus className="mr-1 h-4 w-4" />
              新建群聊
            </Button>
            <Button onClick={() => navigate("/messages/new")}>
              <Plus className="mr-1 h-4 w-4" />
              新建消息
            </Button>
          </>
        }
      />
      <div className="flex-1 overflow-hidden p-4">
        <MessageCalendar
          // Pass through the props the calendar still needs.
          // Adjust this list to match the trimmed-down MessageCalendar API:
          range={messages.range}
          onRangeChange={messages.onRangeChange}
          events={messages.events}
        />
      </div>
    </>
  );
}
```

If the existing `MessageCalendar` API differs, adjust to match. Don't pass dialog-opening props — those are gone.

- [ ] **Step 4: Delete `App.tsx` and `AppHeader`**

```bash
cd /Users/billy/Projects/calendar-message
rm src/App.tsx src/components/app-header.tsx
```

- [ ] **Step 5: Build & smoke test**

```bash
bun run build
bun run dev
```

Open http://localhost:1420/calendar. Confirm calendar renders, clicking events navigates to `/messages/:id` (will show stub editor for now), clicking empty slots navigates to `/messages/new?at=...`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(calendar): host calendar in /calendar route, remove old App and AppHeader

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Add backend single-record commands

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/src-tauri/src/lib.rs`

`get_message` already exists (lib.rs ~line 175). We only need to add `get_webhook_group` and `get_message_template` — the underlying `db::get_group` and `db::get_template` functions already exist.

- [ ] **Step 1: Add Rust test for get_webhook_group**

Append to the existing `#[cfg(test)] mod tests` block in `src-tauri/src/db.rs` (or wherever group tests live — search for `fn create_group` test). Add:

```rust
#[test]
fn get_group_returns_none_for_missing_id() {
    let conn = test_conn();
    init_schema(&conn).unwrap();
    let result = get_group(&conn, "nonexistent").unwrap();
    assert!(result.is_none());
}

#[test]
fn get_group_returns_record_when_present() {
    let conn = test_conn();
    init_schema(&conn).unwrap();
    let id = create_group(&conn, "g", "https://example.com", Some("#fff"))
        .unwrap();
    let row = get_group(&conn, &id).unwrap().expect("should exist");
    assert_eq!(row.name, "g");
}
```

(Adapt to the actual `create_group` signature — read it first if unsure.) If similar tests already exist, skip.

- [ ] **Step 2: Run Rust tests**

```bash
cd /Users/billy/Projects/calendar-message/src-tauri
cargo test get_group
```

Expected: pass (the underlying function already exists).

- [ ] **Step 3: Add `get_webhook_group` and `get_message_template` Tauri commands**

In `src-tauri/src/lib.rs`, find the existing `get_message` command and add similar wrappers next to it:

```rust
#[tauri::command]
async fn get_webhook_group(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<Option<WebhookGroupDto>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_group(&conn, &id)
        .map(|opt| opt.map(WebhookGroupDto::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_message_template(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<Option<MessageTemplateDto>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_template(&conn, &id)
        .map(|opt| opt.map(MessageTemplateDto::from))
        .map_err(|e| e.to_string())
}
```

Adjust the body to match how other commands in this file lock state and convert DTOs (read `get_message` and `update_group` carefully — copy the same pattern).

- [ ] **Step 4: Register commands in `invoke_handler!`**

Find the `tauri::generate_handler![...]` block (lib.rs ~line 374). Add `get_webhook_group, get_message_template,` to the list.

- [ ] **Step 5: Build Rust**

```bash
cd /Users/billy/Projects/calendar-message/src-tauri
cargo build
cargo clippy --no-deps -- -D warnings
```

Expected: success.

- [ ] **Step 6: Commit**

```bash
cd /Users/billy/Projects/calendar-message
git add src-tauri/src/lib.rs src-tauri/src/db.rs
git commit -m "feat(backend): add get_webhook_group and get_message_template commands

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Refactor `useScheduledMessages` into data + editor hooks

**Files:**
- Create: `/Users/billy/Projects/calendar-message/src/hooks/use-scheduled-messages-data.ts`
- Create: `/Users/billy/Projects/calendar-message/src/hooks/use-message-editor.ts`
- Modify: `/Users/billy/Projects/calendar-message/src/store/scheduled-messages-atoms.ts` (remove form-state atoms)
- Delete: `/Users/billy/Projects/calendar-message/src/hooks/use-scheduled-messages.ts` (after CalendarPage updated)

- [ ] **Step 1: Read existing hook to enumerate APIs**

Read `src/hooks/use-scheduled-messages.ts` and `src/store/scheduled-messages-atoms.ts`. List:
- Data atoms (keep): `messagesAtom`, `currentRangeAtom`, derived `eventsAtom`, etc.
- Form atoms (delete): `webhookUrlAtom`, `contentAtom`, `msgtypeAtom`, `scheduledAtDateAtom`, `selectedGroupIdAtom`, `editingIdAtom`, `modalOpenAtom`, `deleteOpenAtom`, `scheduleDateOpenAtom`.
- Functions: `loadMessagesForRange`, `createMessage`, `updateMessage`, `deleteMessage`, `sendNow`, `sendTest`, etc.

- [ ] **Step 2: Create `useScheduledMessagesData`**

```ts
// src/hooks/use-scheduled-messages-data.ts
import { useEffect, useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { messagesAtom, currentRangeAtom } from "@/store/scheduled-messages-atoms";
import type { ScheduledMessage } from "@/types/scheduled-message";

export function useScheduledMessagesData() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [range, setRange] = useAtom(currentRangeAtom);

  const load = useCallback(async (start: Date, end: Date) => {
    const rows = await invoke<ScheduledMessage[]>("list_messages", {
      start: start.toISOString(),
      end: end.toISOString(),
    });
    setMessages(rows);
  }, [setMessages]);

  // initial + range change
  useEffect(() => {
    load(range.start, range.end).catch(console.error);
  }, [range.start, range.end, load]);

  // backend push
  useEffect(() => {
    const unlisten = listen("messages-changed", () => {
      load(range.start, range.end).catch(console.error);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [load, range.start, range.end]);

  return { messages, range, setRange, reload: () => load(range.start, range.end) };
}
```

(Adapt to actual atom names. Keep behavior identical to current hook.)

- [ ] **Step 3: Create `useMessageEditor`**

```ts
// src/hooks/use-message-editor.ts
import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { ScheduledMessage } from "@/types/scheduled-message";

type FormState = {
  webhookUrl: string;
  msgtype: "text" | "markdown";
  content: string;
  scheduledAt: Date;
  groupId: string | null;
};

const empty = (): FormState => ({
  webhookUrl: "",
  msgtype: "text",
  content: "",
  scheduledAt: new Date(Date.now() + 5 * 60_000),
  groupId: null,
});

export function useMessageEditor(id?: string) {
  const [form, setForm] = useState<FormState>(empty());
  const [loading, setLoading] = useState<boolean>(!!id);
  const [original, setOriginal] = useState<ScheduledMessage | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    invoke<ScheduledMessage | null>("get_message", { id })
      .then((row) => {
        if (!row) {
          toast.error("消息不存在");
          return;
        }
        setOriginal(row);
        setForm({
          webhookUrl: row.webhookUrl,
          msgtype: row.msgtype,
          content: row.content,
          scheduledAt: new Date(row.scheduledAt),
          groupId: null, // groups are matched by URL on submit; populate if your model carries it
        });
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async () => {
    if (id) {
      await invoke("update_message", {
        id,
        webhookUrl: form.webhookUrl,
        msgtype: form.msgtype,
        content: form.content,
        scheduledAt: form.scheduledAt.toISOString(),
      });
    } else {
      await invoke("create_message", {
        webhookUrl: form.webhookUrl,
        msgtype: form.msgtype,
        content: form.content,
        scheduledAt: form.scheduledAt.toISOString(),
      });
    }
  }, [form, id]);

  const remove = useCallback(async () => {
    if (!id) return;
    await invoke("delete_message", { id });
  }, [id]);

  const sendTest = useCallback(async () => {
    await invoke("send_test", {
      webhookUrl: form.webhookUrl,
      msgtype: form.msgtype,
      content: form.content,
    });
  }, [form]);

  const sendNowSaved = useCallback(async () => {
    if (!id) return;
    await invoke("send_saved_now", { id });
  }, [id]);

  return { form, update, loading, original, save, remove, sendTest, sendNowSaved };
}
```

Adjust command names / parameter names to match what already exists in the original `useScheduledMessages` (don't guess — read first).

- [ ] **Step 4: Remove form-state atoms**

In `src/store/scheduled-messages-atoms.ts`, delete: `webhookUrlAtom`, `contentAtom`, `msgtypeAtom`, `scheduledAtDateAtom`, `selectedGroupIdAtom`, `editingIdAtom`, `modalOpenAtom`, `deleteOpenAtom`, `scheduleDateOpenAtom`. Keep `messagesAtom`, `currentRangeAtom`, derived `eventsAtom`.

- [ ] **Step 5: Update `CalendarPage` to use new data hook**

Replace `useScheduledMessages()` import with `useScheduledMessagesData()`. Adjust prop names accordingly.

- [ ] **Step 6: Delete old hook & old form atoms test, run tests**

```bash
cd /Users/billy/Projects/calendar-message
rm src/hooks/use-scheduled-messages.ts
bun run test -- --run
```

Failing tests at this stage are expected for components that referenced the old hook (`MessageFormDialog` tests) — they'll be removed in Task 6. For now, fix any test for `useScheduledMessages` by renaming to `useScheduledMessagesData`. Skip dialog tests by either deleting them (if their components are slated for removal) or marking with `it.skip`.

- [ ] **Step 7: Build**

```bash
bun run build
```

Expected: passes (dialogs may still import the deleted hook — temporarily fix imports or comment them; we're deleting them next task).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(hooks): split useScheduledMessages into data and editor hooks

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Build `MessageEditorPage` and delete `MessageFormDialog`

**Files:**
- Create: `/Users/billy/Projects/calendar-message/src/components/message-editor-form.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/pages/message-editor-page.tsx`
- Delete: `/Users/billy/Projects/calendar-message/src/components/message-form-dialog.tsx`
- Delete: `/Users/billy/Projects/calendar-message/src/components/delete-message-dialog.tsx`

- [ ] **Step 1: Extract `MessageEditorForm` from existing dialog**

Read `src/components/message-form-dialog.tsx`. Extract everything **inside** the `<Dialog>` body (group selector, msgtype select, content textarea with template inserter and cursor-aware logic, schedule picker) into a new pure component `MessageEditorForm` that takes:

```ts
type MessageEditorFormProps = {
  form: FormState;            // same FormState as in useMessageEditor
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  groups: WebhookGroup[];
  templates: MessageTemplate[];
};
```

Wrap each field in shadcn `<Field>`. The "insert template" cursor logic stays exactly as in the dialog — copy verbatim.

- [ ] **Step 2: Implement `MessageEditorPage`**

```tsx
// src/pages/message-editor-page.tsx
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MessageEditorForm } from "@/components/message-editor-form";
import { useMessageEditor } from "@/hooks/use-message-editor";
import { useWebhookGroupsData } from "@/hooks/use-webhook-groups-data";
import { useMessageTemplatesData } from "@/hooks/use-message-templates-data";

export function MessageEditorPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const editor = useMessageEditor(id);
  const { groups } = useWebhookGroupsData();
  const { templates } = useMessageTemplatesData();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (id && editor.loading) return <PageHeader title="加载中..." />;

  return (
    <>
      <PageHeader
        title={id ? "编辑消息" : "新建消息"}
        subtitle="编辑后将在计划时间发送"
        back={() => navigate(-1)}
        actions={
          <>
            {id ? (
              <Button variant="outline" onClick={async () => {
                try { await editor.sendNowSaved(); toast.success("已发送"); }
                catch (e) { toast.error(String(e)); }
              }}>立即发送</Button>
            ) : null}
            <Button variant="outline" onClick={async () => {
              try { await editor.sendTest(); toast.success("测试已发送"); }
              catch (e) { toast.error(String(e)); }
            }}>测试发送</Button>
            <Button onClick={async () => {
              try {
                await editor.save();
                toast.success("已保存");
                navigate("/messages");
              } catch (e) { toast.error(String(e)); }
            }}>保存</Button>
            {id ? (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                删除
              </Button>
            ) : null}
          </>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <Card className="max-w-2xl">
          <CardContent className="space-y-6 pt-6">
            <MessageEditorForm
              form={editor.form}
              onChange={editor.update}
              groups={groups}
              templates={templates}
            />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除消息？</AlertDialogTitle>
            <AlertDialogDescription>该操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try { await editor.remove(); toast.success("已删除"); navigate("/messages"); }
              catch (e) { toast.error(String(e)); }
            }}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

If `?at=...` query is present (from calendar slot click), pre-fill `editor.form.scheduledAt` (do this inside `MessageEditorPage` after mount with a `useEffect` that calls `editor.update("scheduledAt", new Date(search.get("at")!))` only when `id` is undefined and `at` is present).

If `?templateId=...` is present, find the template and call `editor.update("content", template.content)` (similar guard).

If `?mode=instant`, set `editor.update("scheduledAt", new Date())` and add a banner "立即发送模式".

- [ ] **Step 3: Delete the dialog files**

```bash
cd /Users/billy/Projects/calendar-message
rm src/components/message-form-dialog.tsx
rm src/components/delete-message-dialog.tsx
```

- [ ] **Step 4: Build & smoke test**

```bash
bun run build
bun run dev
```

Test flows:
1. Click "新建消息" on calendar page → `/messages/new` shows editor.
2. Fill in fields, save → redirects to `/messages` (stub list still).
3. Navigate `/messages/:id` (e.g. via calendar event click) → editor loads existing message.
4. Test send / save / delete buttons all work.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(messages): replace MessageFormDialog with MessageEditorPage route

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Build group editor + list pages, delete `GroupFormDialog`

**Files:**
- Create: `/Users/billy/Projects/calendar-message/src/hooks/use-webhook-groups-data.ts`
- Create: `/Users/billy/Projects/calendar-message/src/hooks/use-group-editor.ts`
- Create: `/Users/billy/Projects/calendar-message/src/components/group-editor-form.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/pages/group-list-page.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/pages/group-editor-page.tsx`
- Delete: `/Users/billy/Projects/calendar-message/src/hooks/use-webhook-groups.ts`
- Delete: `/Users/billy/Projects/calendar-message/src/components/group-form-dialog.tsx`

- [ ] **Step 1: Read & split existing hook**

Read `src/hooks/use-webhook-groups.ts`. Split into:

```ts
// use-webhook-groups-data.ts
export function useWebhookGroupsData() {
  // load list_groups into webhookGroupsAtom on mount
  // expose: groups, reload
}
```

```ts
// use-group-editor.ts
export function useGroupEditor(id?: string) {
  // local form state {name, webhookUrl, color}
  // useEffect to fetch via get_webhook_group when id given
  // save -> create_group or update_group
  // remove -> delete_group
}
```

Use the same pattern as `useMessageEditor`.

- [ ] **Step 2: Create `GroupEditorForm`**

Pure component with three `<Field>`-wrapped controls (name `<Input>`, webhookUrl `<Input type="url">`, color — read existing color picker in `group-form-dialog.tsx` and reuse).

- [ ] **Step 3: Implement `GroupEditorPage`**

Same shell as `MessageEditorPage` (PageHeader with back/actions, Card containing the form, AlertDialog for delete). On save, navigate to `/groups`.

- [ ] **Step 4: Implement `GroupListPage`**

```tsx
// src/pages/group-list-page.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Empty } from "@/components/ui/empty";
import { useWebhookGroupsData } from "@/hooks/use-webhook-groups-data";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export function GroupListPage() {
  const navigate = useNavigate();
  const { groups, reload } = useWebhookGroupsData();
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="群组管理"
        subtitle="维护 webhook 群组"
        actions={
          <Button onClick={() => navigate("/groups/new")}>
            <Plus className="mr-1 h-4 w-4" />
            新建群组
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        {groups.length === 0 ? (
          <Empty title="还没有群组" description="点击右上角创建第一个群组" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: g.color ?? "#888" }}
                    />
                    {g.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
                    {g.webhookUrl}
                  </code>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => navigate(`/groups/${g.id}`)}>编辑</Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleting(g.id)}
                  >
                    删除
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除群组？</AlertDialogTitle>
            <AlertDialogDescription>使用此群组的消息不会被删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await invoke("delete_group", { id: deleting });
                toast.success("已删除");
                await reload();
              } catch (e) {
                toast.error(String(e));
              } finally {
                setDeleting(null);
              }
            }}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 5: Delete old files**

```bash
cd /Users/billy/Projects/calendar-message
rm src/hooks/use-webhook-groups.ts
rm src/components/group-form-dialog.tsx
```

(Update any remaining import.)

- [ ] **Step 6: Build & smoke test**

```bash
bun run build
bun run dev
```

Confirm `/groups` shows cards, create / edit / delete flows work.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(groups): replace GroupFormDialog with /groups list and editor pages

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Build template editor + list pages, delete `TemplateFormDialog`

**Files:**
- Create: `/Users/billy/Projects/calendar-message/src/hooks/use-message-templates-data.ts`
- Create: `/Users/billy/Projects/calendar-message/src/hooks/use-template-editor.ts`
- Create: `/Users/billy/Projects/calendar-message/src/components/template-editor-form.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/pages/template-list-page.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/pages/template-editor-page.tsx`
- Delete: `/Users/billy/Projects/calendar-message/src/hooks/use-message-templates.ts`
- Delete: `/Users/billy/Projects/calendar-message/src/components/template-form-dialog.tsx`

- [ ] **Step 1: Split hook**

Same pattern as Task 7. `useMessageTemplatesData()` for list, `useTemplateEditor(id?)` for single record using `get_message_template`.

- [ ] **Step 2: Create `TemplateEditorForm`**

Pure component with three `<Field>`s: name `<Input>`, msgtype `<Select>` (text/markdown), content `<Textarea>`.

- [ ] **Step 3: Implement `TemplateEditorPage`**

Same shell as `GroupEditorPage`, no "test send" / "send now" buttons. Just save & delete.

- [ ] **Step 4: Implement `TemplateListPage`**

Same card grid as `GroupListPage`. Card body shows template name, `<Badge>` for msgtype, and content preview (first ~100 chars with line clamp). Edit/Delete buttons.

- [ ] **Step 5: Delete old files**

```bash
cd /Users/billy/Projects/calendar-message
rm src/hooks/use-message-templates.ts
rm src/components/template-form-dialog.tsx
```

- [ ] **Step 6: Build & smoke test**

```bash
bun run build
bun run dev
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(templates): replace TemplateFormDialog with /templates list and editor pages

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Build `MessageListPage` with `messagesRangeAtom`

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/src/store/scheduled-messages-atoms.ts`
- Create: `/Users/billy/Projects/calendar-message/src/components/status-badge.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/pages/message-list-page.tsx`

- [ ] **Step 1: Add `messagesRangeAtom` and `messageListAtom`**

In `src/store/scheduled-messages-atoms.ts`, add (default = ±30 days):

```ts
import { atom } from "jotai";
import type { ScheduledMessage } from "@/types/scheduled-message";

const now = () => new Date();
const offsetDays = (d: number) => {
  const r = new Date();
  r.setDate(r.getDate() + d);
  return r;
};

export const messagesRangeAtom = atom<{ start: Date; end: Date }>({
  start: offsetDays(-30),
  end: offsetDays(30),
});

export const messageListAtom = atom<ScheduledMessage[]>([]);
```

- [ ] **Step 2: Create `StatusBadge`**

```tsx
// src/components/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/message-status";
import type { ScheduledMessage } from "@/types/scheduled-message";

const VARIANT: Record<ScheduledMessage["status"], "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "outline",
  sent: "default",
  failed: "destructive",
};

export function StatusBadge({ status }: { status: ScheduledMessage["status"] }) {
  return <Badge variant={VARIANT[status]}>{statusLabel(status)}</Badge>;
}
```

(`processing=info` and `sent=success` aren't built-in shadcn variants — use `outline` and `default` plus optional className tweaks if visually desired. Keep simple at first.)

- [ ] **Step 3: Implement `MessageListPage`**

```tsx
// src/pages/message-list-page.tsx
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { messagesRangeAtom, messageListAtom } from "@/store/scheduled-messages-atoms";
import type { ScheduledMessage } from "@/types/scheduled-message";
import { toast } from "sonner";

export function MessageListPage() {
  const navigate = useNavigate();
  const [range] = useAtom(messagesRangeAtom);
  const [rows, setRows] = useAtom(messageListAtom);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await invoke<ScheduledMessage[]>("list_messages", {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      setRows(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range.start, range.end]);
  useEffect(() => {
    const u = listen("messages-changed", () => load());
    return () => { u.then((fn) => fn()); };
  }, []);

  return (
    <>
      <PageHeader
        title="消息列表"
        subtitle="所有定时消息（最近 30 天 / 未来 30 天）"
        actions={
          <Button onClick={() => navigate("/messages/new")}>
            <Plus className="mr-1 h-4 w-4" /> 新建消息
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <Card>
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Empty title="暂无消息" description="点击右上角创建一条" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>计划时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.scheduledAt).toLocaleString("zh-CN")}</TableCell>
                    <TableCell>{m.msgtype}</TableCell>
                    <TableCell className="max-w-xs truncate">{m.content}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/messages/${m.id}`)}>编辑</Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleting(m.id)}
                      >删除</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除消息？</AlertDialogTitle>
            <AlertDialogDescription>该操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await invoke("delete_message", { id: deleting });
                toast.success("已删除");
                await load();
              } catch (e) { toast.error(String(e)); }
              finally { setDeleting(null); }
            }}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 4: Build & smoke test**

```bash
cd /Users/billy/Projects/calendar-message
bun run build
bun run dev
```

Visit `/messages`. Confirm table renders with messages from default range.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(messages): add /messages list page with 30-day default range

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Right rail — `TodayMessagesPanel` + `QuickCreatePanel`

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/src/store/scheduled-messages-atoms.ts` (add `todayMessagesAtom`)
- Modify: `/Users/billy/Projects/calendar-message/src/components/right-rail.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/components/today-messages-panel.tsx`
- Create: `/Users/billy/Projects/calendar-message/src/components/quick-create-panel.tsx`

- [ ] **Step 1: Add `todayMessagesAtom`**

In `src/store/scheduled-messages-atoms.ts`:

```ts
export const todayMessagesAtom = atom((get) => {
  const all = get(messagesAtom);
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  return all.filter((msg) => {
    const t = new Date(msg.scheduledAt);
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  });
});
```

- [ ] **Step 2: Create `TodayMessagesPanel`**

```tsx
// src/components/today-messages-panel.tsx
import { useAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item } from "@/components/ui/item";
import { Empty } from "@/components/ui/empty";
import { StatusBadge } from "@/components/status-badge";
import { todayMessagesAtom } from "@/store/scheduled-messages-atoms";

export function TodayMessagesPanel() {
  const [today] = useAtom(todayMessagesAtom);
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">今日消息</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {today.length === 0 ? (
          <Empty title="今日无消息" />
        ) : (
          today.map((m) => (
            <Item key={m.id} asChild>
              <button onClick={() => navigate(`/messages/${m.id}`)} className="w-full text-left">
                <div className="flex-1 truncate text-sm">{m.content}</div>
                <StatusBadge status={m.status} />
              </button>
            </Item>
          ))
        )}
      </CardContent>
    </Card>
  );
}
```

(If shadcn `Item`'s API differs, adapt — keep behavior.)

- [ ] **Step 3: Create `QuickCreatePanel`**

```tsx
// src/components/quick-create-panel.tsx
import { useNavigate } from "react-router-dom";
import { Send, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickCreatePanel() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">快速创建</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => navigate("/messages/new?mode=instant")}>
          <Send className="mr-2 h-4 w-4" /> 立即发送消息
        </Button>
        <Button variant="outline" onClick={() => navigate("/messages/new")}>
          <Clock className="mr-2 h-4 w-4" /> 创建定时消息
        </Button>
        <Button variant="outline" onClick={() => navigate("/templates")}>
          <FileText className="mr-2 h-4 w-4" /> 从模板创建
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Mount panels in `RightRail`**

```tsx
// src/components/right-rail.tsx
import { useMatch } from "react-router-dom";
import { TodayMessagesPanel } from "@/components/today-messages-panel";
import { QuickCreatePanel } from "@/components/quick-create-panel";

export function RightRail() {
  const onCalendar = useMatch("/calendar");
  if (!onCalendar) return null;
  return (
    <aside className="w-80 shrink-0 space-y-4 border-l bg-background p-4 overflow-auto">
      <TodayMessagesPanel />
      <QuickCreatePanel />
    </aside>
  );
}
```

- [ ] **Step 5: Build & smoke test**

```bash
bun run build
bun run dev
```

Visit `/calendar`. Confirm right rail shows panels with today's messages and quick-create buttons.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(calendar): add right rail with today messages and quick create panels

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 11: Sidebar `StatsOverview`

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/src/store/scheduled-messages-atoms.ts` (add `monthStatsAtom`)
- Create: `/Users/billy/Projects/calendar-message/src/components/stats-overview.tsx`
- Modify: `/Users/billy/Projects/calendar-message/src/components/app-sidebar.tsx`

- [ ] **Step 1: Add `monthStatsAtom`**

```ts
// in scheduled-messages-atoms.ts
export const monthStatsAtom = atom((get) => {
  const all = get(messagesAtom);
  const counts = { total: all.length, pending: 0, sent: 0, failed: 0 };
  for (const m of all) {
    if (m.status === "pending" || m.status === "processing") counts.pending++;
    else if (m.status === "sent") counts.sent++;
    else if (m.status === "failed") counts.failed++;
  }
  return counts;
});
```

- [ ] **Step 2: Create `StatsOverview`**

```tsx
// src/components/stats-overview.tsx
import { useAtom } from "jotai";
import { Card, CardContent } from "@/components/ui/card";
import { monthStatsAtom } from "@/store/scheduled-messages-atoms";

export function StatsOverview() {
  const [s] = useAtom(monthStatsAtom);
  const items = [
    { label: "全部", value: s.total },
    { label: "待发", value: s.pending },
    { label: "已发", value: s.sent },
    { label: "失败", value: s.failed },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 px-2">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-lg font-semibold">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Slot into sidebar**

In `src/components/app-sidebar.tsx`, replace the placeholder `本月概览` group content with `<StatsOverview />`.

- [ ] **Step 4: Build & smoke test**

```bash
bun run build
bun run dev
```

Confirm sidebar shows 4 mini stat cards.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sidebar): add monthly stats overview

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 12: SettingsPage with theme switcher; delete `ThemeMenu`

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/src/pages/settings-page.tsx`
- Delete: `/Users/billy/Projects/calendar-message/src/components/theme-menu.tsx`

- [ ] **Step 1: Implement `SettingsPage`**

```tsx
// src/pages/settings-page.tsx
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <PageHeader title="设置" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>外观</CardTitle></CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>主题</FieldLabel>
              <FieldDescription>选择浅色、深色或跟随系统</FieldDescription>
              <RadioGroup value={theme ?? "system"} onValueChange={setTheme} className="grid gap-2 pt-2">
                <Label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <RadioGroupItem value="light" /> <Sun className="h-4 w-4" /> 浅色
                </Label>
                <Label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <RadioGroupItem value="dark" /> <Moon className="h-4 w-4" /> 深色
                </Label>
                <Label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <RadioGroupItem value="system" /> <Monitor className="h-4 w-4" /> 跟随系统
                </Label>
              </RadioGroup>
            </Field>
          </CardContent>
        </Card>

        <Card className="max-w-2xl">
          <CardHeader><CardTitle>关于</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>版本 0.1.0</div>
            <a className="text-primary hover:underline" href="https://github.com/billyct/calendar-message" target="_blank" rel="noreferrer">
              项目主页 (GitHub)
            </a>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

(If `Field`'s subcomponents are named differently in shadcn — read `src/components/ui/field.tsx` — adapt names.)

- [ ] **Step 2: Delete `ThemeMenu`**

```bash
cd /Users/billy/Projects/calendar-message
rm src/components/theme-menu.tsx
```

- [ ] **Step 3: Build & smoke test**

```bash
bun run build
bun run dev
```

Visit `/settings`. Switch theme — confirm app updates.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(settings): add settings page with theme switcher

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 13: Tests cleanup, mock-tauri-invoke extension, integration test

**Files:**
- Modify: `/Users/billy/Projects/calendar-message/src/test/mock-tauri-invoke.ts`
- Modify: existing `*.test.ts(x)` files for renamed hooks
- Create: `/Users/billy/Projects/calendar-message/src/test/router-integration.test.tsx`

- [ ] **Step 1: Extend `mock-tauri-invoke.ts`**

Read the current `mock-tauri-invoke.ts`. Add stubs for:

- `list_groups` → returns `[]`
- `get_message` → returns `null` by default; allow overriding via mock map
- `get_webhook_group` → returns `null`
- `get_message_template` → returns `null`
- `create_group`, `update_group`, `delete_group` → returns `void` / id string
- `create_template`, `update_template`, `delete_template` → returns `void` / id string

Follow the existing dispatch pattern (likely a switch on command name).

- [ ] **Step 2: Update / remove dialog tests**

Search for tests of removed components:

```bash
cd /Users/billy/Projects/calendar-message
grep -rln "MessageFormDialog\|GroupFormDialog\|TemplateFormDialog\|DeleteMessageDialog\|ThemeMenu" src/
```

For each test file found, either:
- delete the file if it tested only the removed component, or
- replace the import with the new component (e.g. `MessageEditorPage` or `MessageEditorForm`) and adjust assertions.

For hook tests of `useScheduledMessages` / `useWebhookGroups` / `useMessageTemplates`, rename to the new `*-data` and `*-editor` hooks, splitting tests by responsibility.

- [ ] **Step 3: Add router integration test**

```tsx
// src/test/router-integration.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { CalendarPage } from "@/pages/calendar-page";
import { GroupListPage } from "@/pages/group-list-page";
import "@/test/mock-tauri-invoke";

describe("router", () => {
  it("navigates from calendar to groups via sidebar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/calendar"]}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="groups" element={<GroupListPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("日历视图")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /群组管理/ }));
    expect(await screen.findByText("群组管理")).toBeInTheDocument();
  });
});
```

If `userEvent` is not installed, install: `bun add -d @testing-library/user-event`.

- [ ] **Step 4: Run all tests**

```bash
cd /Users/billy/Projects/calendar-message
bun run test
```

Expected: all pass. Fix any remaining failures.

- [ ] **Step 5: Run Rust tests**

```bash
cd /Users/billy/Projects/calendar-message/src-tauri
cargo test
cargo clippy --no-deps -- -D warnings
```

Expected: all pass.

- [ ] **Step 6: Final smoke test**

```bash
cd /Users/billy/Projects/calendar-message
bun run tauri dev
```

Walk through all flows in the running desktop app:
- `/calendar` shows events; right rail visible
- Click event → editor; save → returns to /messages list
- `/groups` create / edit / delete
- `/templates` create / edit / delete
- `/messages` list shows all in 30/30 range
- `/settings` theme switch works

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: update mocks and tests for router-based UI

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Done

After all tasks pass and the desktop app is verified, the redesign is complete. Optionally run `superpowers:finishing-a-development-branch` to decide on PR / merge / cleanup.
