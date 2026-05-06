use reqwest::blocking::Client;
use serde::Deserialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WebhookError {
    #[error("请求失败: {0}")]
    Network(String),
    #[error("HTTP {0}: {1}")]
    Http(u16, String),
    #[error("企业微信返回错误: errcode={0}, errmsg={1}")]
    WechatApi(i32, String),
    #[error("解析响应失败: {0}")]
    Parse(String),
}

#[derive(Debug, Deserialize)]
struct WechatWebhookResponse {
    errcode: Option<i32>,
    errmsg: Option<String>,
}

pub fn send_wechat_work(
    client: &Client,
    webhook_url: &str,
    msgtype: &str,
    content: &str,
) -> Result<(), WebhookError> {
    let body = match msgtype {
        "markdown" => serde_json::json!({
            "msgtype": "markdown",
            "markdown": { "content": content }
        }),
        _ => serde_json::json!({
            "msgtype": "text",
            "text": { "content": content }
        }),
    };

    let resp = client
        .post(webhook_url)
        .json(&body)
        .send()
        .map_err(|e| WebhookError::Network(e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .map_err(|e| WebhookError::Http(status.as_u16(), e.to_string()))?;

    if !status.is_success() {
        return Err(WebhookError::Http(
            status.as_u16(),
            text.clone(),
        ));
    }

    let parsed: WechatWebhookResponse = serde_json::from_str(&text)
        .map_err(|e| WebhookError::Parse(format!("{e}; body={text}")))?;

    match parsed.errcode {
        Some(0) | None => Ok(()),
        Some(code) => Err(WebhookError::WechatApi(
            code,
            parsed.errmsg.unwrap_or_default(),
        )),
    }
}
