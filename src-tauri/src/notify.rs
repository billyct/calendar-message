use tauri_plugin_notification::NotificationExt;

use crate::ScheduledMessageDto;

const PREVIEW_CHARS: usize = 40;

fn preview(content: &str) -> String {
    let mut iter = content.chars();
    let head: String = iter.by_ref().take(PREVIEW_CHARS).collect();
    if iter.next().is_some() {
        format!("{head}…")
    } else {
        head
    }
}

pub fn send_result(app: &tauri::AppHandle, msg: &ScheduledMessageDto, outcome: Result<(), &str>) {
    let body_preview = preview(&msg.content);
    let (title, body) = match outcome {
        Ok(()) => (
            "定时消息已发送".to_string(),
            if body_preview.is_empty() {
                "（空内容）".to_string()
            } else {
                body_preview
            },
        ),
        Err(err) => (
            "定时消息发送失败".to_string(),
            if body_preview.is_empty() {
                format!("原因: {err}")
            } else {
                format!("{body_preview}\n原因: {err}")
            },
        ),
    };

    let _ = app.notification().builder().title(title).body(body).show();
}
