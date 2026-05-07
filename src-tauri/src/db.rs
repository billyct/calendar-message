use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};

use crate::{ScheduledMessageDto, WebhookGroupDto};

pub fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS scheduled_messages (
          id TEXT PRIMARY KEY,
          webhook_url TEXT NOT NULL,
          msgtype TEXT NOT NULL,
          content TEXT NOT NULL,
          scheduled_at INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_attempt_at INTEGER,
          last_error TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_scheduled_messages_time_status
          ON scheduled_messages(scheduled_at, status);
        CREATE TABLE IF NOT EXISTS webhook_groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          webhook_url TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        "#,
    )?;
    Ok(())
}

pub fn reset_stuck_processing(conn: &Connection) -> rusqlite::Result<usize> {
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE scheduled_messages SET status = 'pending', updated_at = ?1 WHERE status = 'processing'",
        params![now],
    )
}

fn row_to_dto(row: &rusqlite::Row<'_>) -> rusqlite::Result<ScheduledMessageDto> {
    Ok(ScheduledMessageDto {
        id: row.get(0)?,
        webhook_url: row.get(1)?,
        msgtype: row.get(2)?,
        content: row.get(3)?,
        scheduled_at: row.get(4)?,
        status: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        last_attempt_at: row.get(8)?,
        last_error: row.get(9)?,
    })
}

pub fn create_message(
    conn: &Connection,
    webhook_url: &str,
    msgtype: &str,
    content: &str,
    scheduled_at: i64,
) -> rusqlite::Result<ScheduledMessageDto> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    conn.execute(
        r#"INSERT INTO scheduled_messages (
          id, webhook_url, msgtype, content, scheduled_at, status,
          created_at, updated_at, last_attempt_at, last_error
        ) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6, ?6, NULL, NULL)"#,
        params![id, webhook_url, msgtype, content, scheduled_at, now],
    )?;
    get_message(conn, &id).map(|o| o.expect("just inserted"))
}

pub fn update_message(
    conn: &Connection,
    id: &str,
    webhook_url: &str,
    msgtype: &str,
    content: &str,
    scheduled_at: i64,
) -> rusqlite::Result<Option<ScheduledMessageDto>> {
    let now = Utc::now().timestamp_millis();
    let n = conn.execute(
        r#"UPDATE scheduled_messages SET
          webhook_url = ?1, msgtype = ?2, content = ?3, scheduled_at = ?4,
          updated_at = ?5, last_error = NULL
        WHERE id = ?6 AND status IN ('pending', 'failed')"#,
        params![webhook_url, msgtype, content, scheduled_at, now, id],
    )?;
    if n == 0 {
        return Ok(None);
    }
    get_message(conn, id)
}

pub fn delete_message(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
    let n = conn.execute("DELETE FROM scheduled_messages WHERE id = ?1", params![id])?;
    Ok(n > 0)
}

pub fn get_message(conn: &Connection, id: &str) -> rusqlite::Result<Option<ScheduledMessageDto>> {
    let mut stmt = conn.prepare(
        r#"SELECT id, webhook_url, msgtype, content, scheduled_at, status,
          created_at, updated_at, last_attempt_at, last_error
        FROM scheduled_messages WHERE id = ?1"#,
    )?;
    stmt.query_row(params![id], row_to_dto).optional()
}

pub fn list_messages(
    conn: &Connection,
    start_ms: Option<i64>,
    end_ms: Option<i64>,
) -> rusqlite::Result<Vec<ScheduledMessageDto>> {
    match (start_ms, end_ms) {
        (Some(s), Some(e)) => {
            let mut stmt = conn.prepare(
                r#"SELECT id, webhook_url, msgtype, content, scheduled_at, status,
                  created_at, updated_at, last_attempt_at, last_error
                FROM scheduled_messages
                WHERE scheduled_at >= ?1 AND scheduled_at < ?2
                ORDER BY scheduled_at ASC"#,
            )?;
            let mapped = stmt.query_map(params![s, e], row_to_dto)?;
            let mut out = Vec::new();
            for r in mapped {
                out.push(r?);
            }
            Ok(out)
        }
        _ => {
            let mut stmt = conn.prepare(
                r#"SELECT id, webhook_url, msgtype, content, scheduled_at, status,
                  created_at, updated_at, last_attempt_at, last_error
                FROM scheduled_messages
                ORDER BY scheduled_at DESC
                LIMIT 500"#,
            )?;
            let mapped = stmt.query_map([], row_to_dto)?;
            let mut out = Vec::new();
            for r in mapped {
                out.push(r?);
            }
            Ok(out)
        }
    }
}

pub fn claim_next_due(conn: &mut Connection) -> rusqlite::Result<Option<ScheduledMessageDto>> {
    let now_ms = Utc::now().timestamp_millis();
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;

    let id: Option<String> = tx
        .query_row(
            r#"SELECT id FROM scheduled_messages
            WHERE status = 'pending' AND scheduled_at <= ?1
            ORDER BY scheduled_at ASC
            LIMIT 1"#,
            params![now_ms],
            |row| row.get(0),
        )
        .optional()?;

    let Some(id) = id else {
        tx.commit()?;
        return Ok(None);
    };

    let n = tx.execute(
        r#"UPDATE scheduled_messages SET
          status = 'processing', last_attempt_at = ?1, updated_at = ?1
        WHERE id = ?2 AND status = 'pending'"#,
        params![now_ms, id],
    )?;

    if n != 1 {
        tx.commit()?;
        return Ok(None);
    }

    let msg = tx.query_row(
        r#"SELECT id, webhook_url, msgtype, content, scheduled_at, status,
          created_at, updated_at, last_attempt_at, last_error
        FROM scheduled_messages WHERE id = ?1"#,
        params![id],
        row_to_dto,
    )?;

    tx.commit()?;
    Ok(Some(msg))
}

pub fn finalize_sent(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    let now = Utc::now().timestamp_millis();
    conn.execute(
        r#"UPDATE scheduled_messages SET
          status = 'sent', updated_at = ?1, last_error = NULL
        WHERE id = ?2"#,
        params![now, id],
    )?;
    Ok(())
}

pub fn finalize_failed(conn: &Connection, id: &str, err: &str) -> rusqlite::Result<()> {
    let now = Utc::now().timestamp_millis();
    conn.execute(
        r#"UPDATE scheduled_messages SET
          status = 'failed', updated_at = ?1, last_error = ?2
        WHERE id = ?3"#,
        params![now, err, id],
    )?;
    Ok(())
}

fn group_row_to_dto(row: &rusqlite::Row<'_>) -> rusqlite::Result<WebhookGroupDto> {
    Ok(WebhookGroupDto {
        id: row.get(0)?,
        name: row.get(1)?,
        webhook_url: row.get(2)?,
        color: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

pub fn create_group(
    conn: &Connection,
    name: &str,
    webhook_url: &str,
    color: &str,
) -> rusqlite::Result<WebhookGroupDto> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    conn.execute(
        r#"INSERT INTO webhook_groups (id, name, webhook_url, color, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?5)"#,
        params![id, name, webhook_url, color, now],
    )?;
    get_group(conn, &id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn update_group(
    conn: &Connection,
    id: &str,
    name: &str,
    webhook_url: &str,
    color: &str,
) -> rusqlite::Result<Option<WebhookGroupDto>> {
    let now = Utc::now().timestamp_millis();
    let n = conn.execute(
        r#"UPDATE webhook_groups SET name = ?1, webhook_url = ?2, color = ?3, updated_at = ?4
           WHERE id = ?5"#,
        params![name, webhook_url, color, now, id],
    )?;
    if n == 0 {
        return Ok(None);
    }
    get_group(conn, id)
}

pub fn delete_group(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
    let n = conn.execute("DELETE FROM webhook_groups WHERE id = ?1", params![id])?;
    Ok(n > 0)
}

pub fn get_group(conn: &Connection, id: &str) -> rusqlite::Result<Option<WebhookGroupDto>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, webhook_url, color, created_at, updated_at FROM webhook_groups WHERE id = ?1",
    )?;
    stmt.query_row(params![id], group_row_to_dto).optional()
}

pub fn list_groups(conn: &Connection) -> rusqlite::Result<Vec<WebhookGroupDto>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, webhook_url, color, created_at, updated_at FROM webhook_groups ORDER BY created_at ASC",
    )?;
    let mapped = stmt.query_map([], group_row_to_dto)?;
    let mut out = Vec::new();
    for r in mapped {
        out.push(r?);
    }
    Ok(out)
}
