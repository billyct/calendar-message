# Copilot Instructions

Tauri v2 desktop app for scheduling messages to WeChat Work (企业微信) webhooks. React + TypeScript frontend, Rust backend with SQLite persistence and a tokio scheduler.

## Commands

Package manager is **Bun** (see `packageManager` in `package.json`).

```bash
# Frontend
bun install
bun run dev                    # Vite dev server (port 1420)
bun run build                  # icons + tsc + vite build
bun run test                   # vitest run (one shot)
bun run test:watch             # vitest watch
bun run icons                  # regenerate app icons from assets/icon-source/

# Tauri (full desktop app)
bun run tauri dev
bun run tauri build

# Rust (run from src-tauri/)
cargo test
cargo clippy
```

Run a single frontend test: `bun run test path/to/file.test.ts` or `bun run test -t "test name"`.
Run a single Rust test: `cargo test <test_name>` from `src-tauri/`.

## Architecture

### Frontend ↔ Backend bridge
- Frontend never calls Rust directly from components. All `invoke("...")` calls live in **custom hooks under `src/hooks/`** (`use-scheduled-messages.ts`, `use-webhook-groups.ts`). Hooks own the Tauri boundary and combine Jotai atom reads/writes with backend calls.
- State lives in **Jotai atoms in `src/store/`**: primitive atoms hold raw data; derived atoms (e.g. `eventsAtom`) compute view models like calendar events.
- The Rust scheduler emits a `"messages-changed"` event after sending; the frontend listens and reloads the current month. New backend mutations should emit this event when they change message data.

### Rust backend (`src-tauri/src/`)
- `lib.rs` — all Tauri commands + DTO definitions + app setup (`main.rs` just calls `lib::run()`).
- `db.rs` — SQLite schema init and CRUD for both `scheduled_messages` and `webhook_groups`.
- `scheduler.rs` — tokio interval loop (~30s) that atomically claims due messages via `claim_next_due` (a SQLite transaction that flips `pending` → `processing`), sends them, then emits `messages-changed`.
- `webhook.rs` — HTTP POST to WeChat Work webhook (`text` / `markdown` msgtypes).
- `notify.rs` — desktop notifications via `tauri-plugin-notification`.

### Message lifecycle
Status flow: `pending` → `processing` → `sent` | `failed`. The `processing` state exists specifically so the scheduler's claim transaction prevents double-sends. Don't bypass `claim_next_due` when adding new send paths.

### Schema
Two tables only: `scheduled_messages` (id, webhook_url, msgtype, content, scheduled_at, status, timestamps, last_attempt_at, last_error) and `webhook_groups` (id, name, webhook_url, color, timestamps).

## Conventions

- **UI components**: shadcn/ui (Base-Nova style) in `src/components/ui/`. Use `cn()` from `src/lib/utils.ts` for class merging — never concatenate tailwind classes manually.
- **Locale**: UI text and status labels are Chinese (`src/lib/message-status.ts` maps status codes via `statusLabel()`). Calendar uses zh-CN via `src/lib/calendar-localizer.ts`.
- **Theming**: `next-themes` wrapped by `src/components/theme-provider.tsx` in `main.tsx`. CSS custom properties (shadcn tokens) live in `src/index.css`.
- **Tests**: Vitest + jsdom + @testing-library/react. Always mock Tauri via `src/test/mock-tauri-invoke.ts`; build messages via `createScheduledMessage()` from `src/test/factories.ts`. `src/test/setup.ts` mocks `matchMedia`.
- **Adding a Tauri command**: define in `lib.rs`, register it in the `invoke_handler!` list, then add a thin wrapper inside the relevant hook in `src/hooks/` — do not call `invoke` from components.
- **Adding a new message field**: update the SQLite schema in `db.rs`, the Rust DTO in `lib.rs`, the TS type in `src/types/scheduled-message.ts`, and the Jotai atoms / form dialog as needed. Migrations are not formalized — schema changes need manual handling for existing local DBs.
