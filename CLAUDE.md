# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tauri v2 desktop app for scheduling and sending messages to WeChat Work (企业微信) webhook URLs. The frontend displays scheduled messages on a calendar view, with CRUD operations and test-send capabilities. The Rust backend persists messages to SQLite, runs a scheduler that sends due messages, and emits desktop notifications on results.

## Commands

```bash
# Frontend (Bun)
bun install                    # Install dependencies
bun run dev                    # Vite dev server (port 1420)
bun run build                  # Production build (icons + tsc + vite)
bun run test                   # Run vitest once
bun run test:watch             # Vitest watch mode
bun run icons                  # Generate app icons from assets/icon-source/

# Tauri (full desktop app)
bun run tauri dev              # Dev mode (frontend + Rust backend)
bun run tauri build            # Production build

# Rust backend
cargo test                     # Run Rust tests (from src-tauri/)
cargo clippy                   # Lint Rust code
```

## Architecture

### Frontend (`src/`)

```
src/
├── App.tsx                    # Root component — wires hooks to UI
├── main.tsx                   # Entry point — renders App with ThemeProvider + Toaster
├── index.css                  # Global styles + CSS custom properties (shadcn tokens)
├── components/
│   ├── app-header.tsx         # Top bar: new message btn, theme toggle, group management
│   ├── message-calendar.tsx   # react-big-calendar wrapper showing scheduled messages
│   ├── message-form-dialog.tsx# Create/edit form with webhook URL, content, schedule picker
│   ├── delete-message-dialog.tsx
│   ├── schedule-datetime-picker.tsx
│   ├── group-form-dialog.tsx  # CRUD dialog for webhook groups
│   ├── theme-menu.tsx
│   ├── theme-provider.tsx     # next-themes wrapper
│   └── ui/                    # shadcn/ui components (Base-Nova style)
├── hooks/
│   ├── use-scheduled-messages.ts  # Central hook: wraps all message CRUD + calendar state
│   └── use-webhook-groups.ts      # Groups CRUD hook
├── store/
│   ├── scheduled-messages-atoms.ts # Jotai atoms for message state + derived eventsAtom
│   └── webhook-groups-atoms.ts     # Jotai atom for groups list
├── lib/
│   ├── utils.ts               # cn() — clsx + tailwind-merge
│   ├── message-status.ts      # statusLabel() — maps status codes to Chinese labels
│   └── calendar-localizer.ts  # date-fns localizer for react-big-calendar (zh-CN)
├── types/
│   ├── scheduled-message.ts   # ScheduledMessage + CalendarEvent types
│   └── webhook-group.ts       # WebhookGroup type
└── test/
    ├── setup.ts               # Vitest setup (jsdom + matchMedia mock)
    ├── factories.ts           # createScheduledMessage() test factory
    └── mock-tauri-invoke.ts   # Mock @tauri-apps/api/core invoke() helper
```

**State management with Jotai**: Primitive atoms in `src/store/` hold raw state. Derived atoms (like `eventsAtom`) compute calendar events from messages. Custom hooks in `src/hooks/` combine atom reads/writes with Tauri `invoke` calls — they are the sole bridge between the React UI and the Rust backend.

### Rust Backend (`src-tauri/src/`)

```
src-tauri/src/
├── main.rs                    # Entry point — calls lib::run()
├── lib.rs                     # All Tauri commands, app setup, DTO definitions
├── db.rs                      # SQLite schema init + full CRUD for messages and groups
├── webhook.rs                 # HTTP POST to WeChat Work webhook (text/markdown)
├── scheduler.rs               # tokio interval loop: claims due messages, sends, notifies
└── notify.rs                  # Desktop notification via tauri-plugin-notification
```

**Data flow**: Tauri commands (defined in `lib.rs`) are invoked from the frontend via `invoke()`. The commands open a SQLite connection, call functions in `db.rs`, and return DTOs. The scheduler (`scheduler.rs`) runs independently in a tokio task on a 30-second interval, claiming pending messages whose `scheduled_at` has passed via an atomic SQLite transaction (`claim_next_due`). After processing, it emits a `"messages-changed"` event so the frontend can refresh.

**SQLite schema**: Two tables — `scheduled_messages` (id, webhook_url, msgtype, content, scheduled_at, status, timestamps, last_attempt_at, last_error) and `webhook_groups` (id, name, webhook_url, color, timestamps). Message statuses: `pending` → `processing` → `sent` | `failed`.

### Frontend–Backend Communication

- Frontend calls Rust via `invoke("command_name", { args })` from `@tauri-apps/api/core`
- The scheduler pushes updates to the frontend via `app.emit("messages-changed")`
- The frontend listens for `"messages-changed"` events and reloads the current month's messages
- Desktop notifications use `tauri-plugin-notification`, triggered by the Rust scheduler after send attempts

## Testing

- **Frontend**: Vitest + jsdom + @testing-library/react. Tests use `src/test/mock-tauri-invoke.ts` to mock Tauri's `invoke()` calls. Test factory in `src/test/factories.ts`.
- **Rust**: Standard `#[test]` / `#[cfg(test)]` modules.
