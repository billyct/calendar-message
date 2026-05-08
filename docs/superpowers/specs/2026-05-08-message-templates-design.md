# Message Templates Design

## Problem

Users need reusable message templates that can be managed in the app and inserted into scheduled message content when creating or editing messages.

## Goals

- Persist message templates locally alongside scheduled messages and webhook groups.
- Let users create, edit, delete, and list templates with UX similar to webhook group management.
- Let users insert a template into the message content without changing webhook group, webhook URL, or scheduled time.
- Preserve support for both `text` and `markdown` message types.

## Non-goals

- Template variables, placeholders, or preview rendering.
- Syncing templates across devices.
- Automatic template application based on group, date, or message type.

## Backend design

Add a `message_templates` SQLite table:

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `msgtype TEXT NOT NULL`
- `content TEXT NOT NULL`
- `created_at INTEGER NOT NULL`
- `updated_at INTEGER NOT NULL`

Add DTO and Tauri commands:

- `create_template(input: { name, msgtype, content })`
- `update_template(input: { id, name, msgtype, content })`
- `delete_template(id)`
- `list_templates()`

Validation mirrors existing group and message commands. Template names and content are required. `msgtype` is normalized through the existing `text` / `markdown` validation path. Missing rows return user-facing errors rather than silent success.

## Frontend design

Add:

- `MessageTemplate` type in `src/types/message-template.ts`
- `templatesAtom` in `src/store/message-templates-atoms.ts`
- `useMessageTemplates` in `src/hooks/use-message-templates.ts`
- `TemplateFormDialog` in `src/components/template-form-dialog.tsx`

The hook mirrors `useWebhookGroups`: it loads templates on mount, wraps Tauri CRUD commands, refreshes after mutations, and lets UI components surface errors with existing toast patterns.

`AppHeader` gains template management controls next to the group controls:

- A `新建模板` button.
- A dropdown showing existing templates.
- Edit and delete actions for each template.
- Empty state text when no templates exist.

The dialog uses the same modal structure as `GroupFormDialog`, with fields for template name, message type, and content. It does not include color or webhook URL.

## Message insertion flow

`App` passes templates into `MessageFormDialog`.

When templates exist, the message form shows an `插入模板` selector near the content field. Selecting a template:

- Sets the current message type to the template's `msgtype`.
- Inserts template content into the textarea at the current cursor position when available.
- Falls back to appending content with a separating newline when cursor insertion is unavailable.
- Does not change selected group, webhook URL, scheduled time, or editing state.

The selector resets after insertion so the same template can be inserted multiple times.

## Error handling

Backend validation returns explicit Chinese error messages consistent with existing commands:

- Template name cannot be empty.
- Template content cannot be empty.
- Message type must be `text` or `markdown`.
- Updating or deleting a missing template reports that the template does not exist.

Frontend errors are surfaced through the same `toast.error(String(e))` pattern already used for groups and messages. CRUD dialogs only close after successful saves.

## Testing

Add tests for:

- Rust DB CRUD behavior for templates.
- Frontend template hook invoke/reload behavior.
- Template management rendering in the header.
- Template insertion in `MessageFormDialog`, including message type switching and append/cursor fallback behavior.

Run the existing frontend test suite and Rust test suite after implementation.
