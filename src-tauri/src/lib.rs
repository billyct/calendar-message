mod db;
mod scheduler;
mod webhook;

use std::path::PathBuf;

use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

#[derive(Clone)]
struct AppDb {
    path: PathBuf,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledMessageDto {
    pub id: String,
    pub webhook_url: String,
    pub msgtype: String,
    pub content: String,
    pub scheduled_at: i64,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_attempt_at: Option<i64>,
    pub last_error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateMessageInput {
    webhook_url: String,
    msgtype: String,
    content: String,
    scheduled_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateMessageInput {
    id: String,
    webhook_url: String,
    msgtype: String,
    content: String,
    scheduled_at: i64,
}

fn normalize_msgtype(raw: &str) -> Result<&'static str, String> {
    match raw.trim() {
        "text" => Ok("text"),
        "markdown" => Ok("markdown"),
        other => Err(format!(
            "不支持的 msgtype: {other}（仅支持 text / markdown）"
        )),
    }
}

fn blocking_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_message(
    state: State<AppDb>,
    input: CreateMessageInput,
) -> Result<ScheduledMessageDto, String> {
    let msgtype = normalize_msgtype(&input.msgtype)?;
    let url = input.webhook_url.trim();
    if url.is_empty() {
        return Err("Webhook URL 不能为空".into());
    }
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    db::create_message(&conn, url, msgtype, &input.content, input.scheduled_at)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_message(
    state: State<AppDb>,
    input: UpdateMessageInput,
) -> Result<ScheduledMessageDto, String> {
    let msgtype = normalize_msgtype(&input.msgtype)?;
    let url = input.webhook_url.trim();
    if url.is_empty() {
        return Err("Webhook URL 不能为空".into());
    }
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    match db::update_message(
        &conn,
        &input.id,
        url,
        msgtype,
        &input.content,
        input.scheduled_at,
    )
    .map_err(|e| e.to_string())?
    {
        Some(row) => Ok(row),
        None => Err("无法更新：消息不存在或已发送".into()),
    }
}

#[tauri::command]
fn delete_message(state: State<AppDb>, id: String) -> Result<(), String> {
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    let ok = db::delete_message(&conn, &id).map_err(|e| e.to_string())?;
    if !ok {
        return Err("消息不存在".into());
    }
    Ok(())
}

#[tauri::command]
fn get_message(state: State<AppDb>, id: String) -> Result<Option<ScheduledMessageDto>, String> {
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    db::get_message(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_messages(
    state: State<AppDb>,
    start_ms: Option<i64>,
    end_ms: Option<i64>,
) -> Result<Vec<ScheduledMessageDto>, String> {
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    db::list_messages(&conn, start_ms, end_ms).map_err(|e| e.to_string())
}

#[tauri::command]
fn send_preview(
    webhook_url: String,
    msgtype: String,
    content: String,
) -> Result<(), String> {
    let msgtype = normalize_msgtype(&msgtype)?;
    let url = webhook_url.trim();
    if url.is_empty() {
        return Err("Webhook URL 不能为空".into());
    }
    let client = blocking_client()?;
    webhook::send_wechat_work(&client, url, msgtype, &content).map_err(|e| e.to_string())
}

#[tauri::command]
fn send_saved_now(state: State<AppDb>, id: String) -> Result<(), String> {
    let conn = Connection::open(&state.path).map_err(|e| e.to_string())?;
    let msg = db::get_message(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "消息不存在".to_string())?;
    let client = blocking_client()?;
    let now = Utc::now().timestamp_millis();
    match webhook::send_wechat_work(&client, &msg.webhook_url, &msg.msgtype, &msg.content) {
        Ok(()) => {
            db::touch_send_attempt(&conn, &id, now, None).map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            let err = e.to_string();
            db::touch_send_attempt(&conn, &id, now, Some(&err)).map_err(|e| e.to_string())?;
            Err(err)
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("无法解析应用数据目录: {e}"))?;
            std::fs::create_dir_all(&dir).map_err(|e| format!("创建数据目录失败: {e}"))?;
            let db_path = dir.join("calendar_message.db");
            {
                let conn = rusqlite::Connection::open(&db_path)
                    .map_err(|e| format!("打开数据库失败: {e}"))?;
                db::init_schema(&conn).map_err(|e| format!("初始化数据库失败: {e}"))?;
            }
            let db_path_clone = db_path.clone();
            app.manage(AppDb { path: db_path });
            scheduler::start_scheduler(db_path_clone);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_message,
            update_message,
            delete_message,
            get_message,
            list_messages,
            send_preview,
            send_saved_now,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
