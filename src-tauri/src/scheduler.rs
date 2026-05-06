use std::path::Path;
use std::time::Duration;

use reqwest::blocking::Client;

use crate::db;
use crate::webhook;

pub fn process_due(path: &Path) -> Result<(), String> {
    let mut conn = rusqlite::Connection::open(path).map_err(|e| e.to_string())?;
    db::reset_stuck_processing(&conn).map_err(|e| e.to_string())?;
    let client = Client::builder()
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    loop {
        let msg = db::claim_next_due(&mut conn).map_err(|e| e.to_string())?;
        let Some(msg) = msg else {
            break;
        };
        match webhook::send_wechat_work(&client, &msg.webhook_url, &msg.msgtype, &msg.content) {
            Ok(()) => db::finalize_sent(&conn, &msg.id).map_err(|e| e.to_string())?,
            Err(e) => db::finalize_failed(&conn, &msg.id, &e.to_string()).map_err(|e| e.to_string())?,
        }
    }
    Ok(())
}

pub fn start_scheduler(db_path: std::path::PathBuf) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            let path = db_path.clone();
            let _ = tokio::task::spawn_blocking(move || process_due(&path)).await;
        }
    });
}
