import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar as BigCalendar,
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
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ChevronDownIcon, Palette } from "lucide-react";
import { zhCN as dayPickerZhCN } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import "react-big-calendar/lib/css/react-big-calendar.css";

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

function ThemeMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" aria-label="外观" />}
      >
        <Palette className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuGroup>
          <DropdownMenuLabel>外观</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme ?? "system"}
            onValueChange={setTheme}
          >
            <DropdownMenuRadioItem value="light">浅色</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">深色</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">跟随系统</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function App() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [msgtype, setMsgtype] = useState<"text" | "markdown">("text");
  const [content, setContent] = useState("");
  const [scheduledAtDate, setScheduledAtDate] = useState(() => new Date());
  const [scheduleDateOpen, setScheduleDateOpen] = useState(false);

  const loadRange = useCallback(async (anchor: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(anchor);
      const end = endOfMonth(anchor);
      const start_ms = start.getTime();
      const end_ms = end.getTime() + 24 * 60 * 60 * 1000;
      const rows = await invoke<ScheduledMessage[]>("list_messages", {
        startMs: start_ms,
        endMs: end_ms,
      });
      setMessages(rows);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

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
    setScheduledAtDate(new Date());
    setModalOpen(true);
  };

  const openEdit = (m: ScheduledMessage) => {
    setEditingId(m.id);
    setWebhookUrl(m.webhookUrl);
    setMsgtype(m.msgtype === "markdown" ? "markdown" : "text");
    setContent(m.content);
    setScheduledAtDate(new Date(m.scheduledAt));
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const saveMessage = async () => {
    const scheduled_at = scheduledAtDate.getTime();
    try {
      if (editingId) {
        await invoke("update_message", {
          input: {
            id: editingId,
            webhookUrl,
            msgtype,
            content,
            scheduledAt: scheduled_at,
          },
        });
        toast.success("已保存修改");
      } else {
        await invoke("create_message", {
          input: {
            webhookUrl,
            msgtype,
            content,
            scheduledAt: scheduled_at,
          },
        });
        toast.success("已创建定时消息");
      }
      closeModal();
      await loadRange(currentDate);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const confirmDelete = async () => {
    if (!editingId) return;
    try {
      await invoke("delete_message", { id: editingId });
      toast.success("已删除");
      setDeleteOpen(false);
      closeModal();
      await loadRange(currentDate);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const sendTestFromForm = async () => {
    try {
      await invoke("send_preview", {
        webhookUrl,
        msgtype,
        content,
      });
      toast.success("测试发送成功");
      if (editingId) await loadRange(currentDate);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const sendSavedNow = async (id: string) => {
    try {
      await invoke("send_saved_now", { id });
      toast.success("立即发送成功");
      await loadRange(currentDate);
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            企业微信 Webhook 定时消息
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            本地调度，定时 POST 到机器人 Webhook（text / markdown）
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ThemeMenu />
          <Button type="button" onClick={openCreate}>
            新建消息
          </Button>
        </div>
      </header>

      <div className="relative px-4 pb-6 pt-3">
        {loading ? (
          <div className="pointer-events-none absolute inset-x-4 top-3 z-[2] flex justify-center text-sm text-muted-foreground">
            加载中…
          </div>
        ) : null}
        <BigCalendar
          culture="zh-CN"
          localizer={localizer}
          events={events}
          date={currentDate}
          view={currentView}
          onNavigate={(d: Date) => setCurrentDate(d)}
          onView={(v: View) => setCurrentView(v)}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "calc(100vh - 140px)", minHeight: 520 }}
          onSelectEvent={(ev: CalendarEvent) => openEdit(ev.resource)}
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
            showMore: (n: number) => `还有 ${n} 条`,
          }}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑消息" : "新建消息"}</DialogTitle>
            <DialogDescription>
              填写 Webhook 与计划时间；可随时使用「立即发送」验证连通性。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="msgtype">消息类型</Label>
              <Select
                value={msgtype}
                onValueChange={(v) =>
                  setMsgtype(v === "markdown" ? "markdown" : "text")
                }
              >
                <SelectTrigger id="msgtype" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">text</SelectItem>
                  <SelectItem value="markdown">markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="要发送到群机器人的内容"
              />
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium leading-none">
                计划发送时间（本地时区）
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="scheduled-date" className="text-muted-foreground">
                    日期
                  </Label>
                  <Popover open={scheduleDateOpen} onOpenChange={setScheduleDateOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          id="scheduled-date"
                          type="button"
                          className="w-full justify-between font-normal sm:max-w-[min(100%,280px)]"
                        />
                      }
                    >
                      <span className="truncate">
                        {format(scheduledAtDate, "PPP", { locale: zhCN })}
                      </span>
                      <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[100] w-auto overflow-hidden p-0"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        locale={dayPickerZhCN}
                        captionLayout="dropdown"
                        selected={scheduledAtDate}
                        defaultMonth={scheduledAtDate}
                        onSelect={(d: Date | undefined) => {
                          if (!d) return;
                          setScheduledAtDate((prev) => {
                            const next = new Date(prev);
                            next.setFullYear(
                              d.getFullYear(),
                              d.getMonth(),
                              d.getDate()
                            );
                            return next;
                          });
                          setScheduleDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2 sm:w-36">
                  <Label htmlFor="scheduled-time" className="text-muted-foreground">
                    时间
                  </Label>
                  <Input
                    type="time"
                    id="scheduled-time"
                    step={60}
                    value={format(scheduledAtDate, "HH:mm")}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      const [hh, mm] = v.split(":").map(Number);
                      setScheduledAtDate((prev) => {
                        const next = new Date(prev);
                        next.setHours(hh, mm, 0, 0);
                        return next;
                      });
                    }}
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {editingId ? (
              <p className="text-xs text-muted-foreground">
                保存后由后台每 30 秒检查一次到期任务；可将失败任务编辑后重试。
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" onClick={sendTestFromForm}>
              立即发送（测试）
            </Button>
            {editingId ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void sendSavedNow(editingId)}
                >
                  按已保存记录再发一次
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  删除
                </Button>
              </>
            ) : null}
            <Button type="button" onClick={saveMessage}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条消息？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。若任务仍在队列中，将从本地计划中移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
