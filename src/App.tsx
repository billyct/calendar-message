import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
} from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek as dfStartOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { invoke } from "@tauri-apps/api/core";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./App.css";

type ScheduledMessage = {
  id: string;
  webhookUrl: string;
  msgtype: string;
  content: string;
  scheduledAt: number;
  status: string;
  createdAt: number;
  updatedAt: number;
  lastAttemptAt: number | null;
  lastError: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduledMessage;
};

const locales = { "zh-CN": zhCN };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => dfStartOfWeek(date, { locale: zhCN }),
  getDay,
  locales,
});

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): number {
  const d = new Date(value);
  return d.getTime();
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "待发送";
    case "processing":
      return "发送中";
    case "sent":
      return "已发送";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    default:
      return status;
  }
}

export default function App() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [msgtype, setMsgtype] = useState<"text" | "markdown">("text");
  const [content, setContent] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState(toDatetimeLocalValue(Date.now()));

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadRange = useCallback(async (anchor: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(anchor);
      const end = endOfMonth(anchor);
      const start_ms = start.getTime();
      const end_ms = end.getTime() + 24 * 60 * 60 * 1000;
      const rows = await invoke<ScheduledMessage[]>("list_messages", {
        start_ms,
        end_ms,
      });
      setMessages(rows);
    } catch (e) {
      showToast(String(e));
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadRange(currentDate);
  }, [currentDate, loadRange]);

  const events: CalendarEvent[] = useMemo(() => {
    return messages.map((m) => {
      const start = new Date(m.scheduledAt);
      const end = new Date(m.scheduledAt + 30 * 60 * 1000);
      const preview =
        m.content.length > 42 ? `${m.content.slice(0, 42)}…` : m.content;
      return {
        id: m.id,
        title: `[${statusLabel(m.status)}] ${preview || "(空内容)"}`,
        start,
        end,
        resource: m,
      };
    });
  }, [messages]);

  const openCreate = () => {
    setEditingId(null);
    setWebhookUrl("");
    setMsgtype("text");
    setContent("");
    setScheduledLocal(toDatetimeLocalValue(Date.now()));
    setModalOpen(true);
  };

  const openEdit = (m: ScheduledMessage) => {
    setEditingId(m.id);
    setWebhookUrl(m.webhookUrl);
    setMsgtype(m.msgtype === "markdown" ? "markdown" : "text");
    setContent(m.content);
    setScheduledLocal(toDatetimeLocalValue(m.scheduledAt));
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const saveMessage = async () => {
    const scheduled_at = fromDatetimeLocalValue(scheduledLocal);
    try {
      if (editingId) {
        await invoke("update_message", {
          id: editingId,
          webhook_url: webhookUrl,
          msgtype,
          content,
          scheduled_at,
        });
        showToast("已保存修改");
      } else {
        await invoke("create_message", {
          webhook_url: webhookUrl,
          msgtype,
          content,
          scheduled_at,
        });
        showToast("已创建定时消息");
      }
      closeModal();
      await loadRange(currentDate);
    } catch (e) {
      showToast(String(e));
    }
  };

  const deleteCurrent = async () => {
    if (!editingId) return;
    if (!window.confirm("确定删除这条消息？")) return;
    try {
      await invoke("delete_message", { id: editingId });
      showToast("已删除");
      closeModal();
      await loadRange(currentDate);
    } catch (e) {
      showToast(String(e));
    }
  };

  const sendTestFromForm = async () => {
    try {
      await invoke("send_preview", {
        webhook_url: webhookUrl,
        msgtype,
        content,
      });
      showToast("测试发送成功");
      if (editingId) await loadRange(currentDate);
    } catch (e) {
      showToast(String(e));
    }
  };

  const sendSavedNow = async (id: string) => {
    try {
      await invoke("send_saved_now", { id });
      showToast("立即发送成功");
      await loadRange(currentDate);
    } catch (e) {
      showToast(String(e));
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="title">企业微信 Webhook 定时消息</h1>
          <p className="subtitle">
            本地调度，定时 POST 到机器人 Webhook（text / markdown）
          </p>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn primary" onClick={openCreate}>
            新建消息
          </button>
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <div className="calendar-wrap">
        {loading && <div className="loading-overlay">加载中…</div>}
        <Calendar
          culture="zh-CN"
          localizer={localizer}
          events={events}
          date={currentDate}
          view={currentView}
          onNavigate={(d) => setCurrentDate(d)}
          onView={(v) => setCurrentView(v)}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "calc(100vh - 140px)", minHeight: 520 }}
          onSelectEvent={(ev) => openEdit(ev.resource)}
          messages={{
            today: "今天",
            previous: "上月",
            next: "下月",
            month: "月",
            week: "周",
            day: "日",
            agenda: "议程",
            date: "日期",
            time: "时间",
            event: "消息",
            showMore: (n) => `还有 ${n} 条`,
          }}
        />
      </div>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingId ? "编辑消息" : "新建消息"}</h2>
              <button type="button" className="btn ghost" onClick={closeModal}>
                关闭
              </button>
            </div>

            <div className="modal-body">
              <label className="field">
                <span>Webhook URL</span>
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  autoComplete="off"
                />
              </label>

              <label className="field">
                <span>消息类型</span>
                <select
                  value={msgtype}
                  onChange={(e) =>
                    setMsgtype(e.target.value === "markdown" ? "markdown" : "text")
                  }
                >
                  <option value="text">text</option>
                  <option value="markdown">markdown</option>
                </select>
              </label>

              <label className="field">
                <span>内容</span>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="要发送到群机器人的内容"
                />
              </label>

              <label className="field">
                <span>计划发送时间（本地时区）</span>
                <input
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                />
              </label>

              {editingId && (
                <div className="hint">
                  保存后由后台每 30 秒检查一次到期任务；可将失败任务编辑后重试。
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={sendTestFromForm}>
                立即发送（测试）
              </button>
              {editingId && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void sendSavedNow(editingId)}
                  >
                    按已保存记录再发一次
                  </button>
                  <button type="button" className="btn danger" onClick={deleteCurrent}>
                    删除
                  </button>
                </>
              )}
              <button type="button" className="btn primary" onClick={saveMessage}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
