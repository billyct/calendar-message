use std::path::Path;
use std::time::Duration;

use reqwest::blocking::Client;
use tauri::Emitter;

use crate::db;
use crate::notify;
use crate::webhook;

pub const MESSAGES_CHANGED_EVENT: &str = "messages-changed";

pub fn process_due(app: &tauri::AppHandle, path: &Path) -> Result<usize, String> {
    let mut conn = rusqlite::Connection::open(path).map_err(|e| e.to_string())?;
    db::reset_stuck_processing(&conn).map_err(|e| e.to_string())?;
    let client = Client::builder()
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let mut processed: usize = 0;
    loop {
        let msg = db::claim_next_due(&mut conn).map_err(|e| e.to_string())?;
        let Some(msg) = msg else {
            break;
        };
        match webhook::send_wechat_work(&client, &msg.webhook_url, &msg.msgtype, &msg.content) {
            Ok(()) => {
                db::finalize_sent(&conn, &msg.id).map_err(|e| e.to_string())?;
                notify::send_result(app, &msg, Ok(()));
            }
            Err(e) => {
                let err = e.to_string();
                db::finalize_failed(&conn, &msg.id, &err).map_err(|e| e.to_string())?;
                notify::send_result(app, &msg, Err(&err));
            }
        }
        processed += 1;
    }
    Ok(processed)
}

pub fn start_scheduler(app: tauri::AppHandle, db_path: std::path::PathBuf) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            let path = db_path.clone();
            let app_for_task = app.clone();
            let result =
                tokio::task::spawn_blocking(move || process_due(&app_for_task, &path)).await;
            if let Ok(Ok(processed)) = result {
                if processed > 0 {
                    let _ = app.emit(MESSAGES_CHANGED_EVENT, ());
                }
            }
        }
    });
}
