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
import { Button } from "@/components/ui/button";
import { ScheduleDateTimePicker } from "@/components/schedule-datetime-picker";

type MessageFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  webhookUrl: string;
  onWebhookUrlChange: (value: string) => void;
  msgtype: "text" | "markdown";
  onMsgtypeChange: (value: "text" | "markdown") => void;
  content: string;
  onContentChange: (value: string) => void;
  scheduledAtDate: Date;
  onScheduledAtDateChange: React.Dispatch<React.SetStateAction<Date>>;
  scheduleDateOpen: boolean;
  onScheduleDateOpenChange: (open: boolean) => void;
  onSave: () => void | Promise<void>;
  onDeleteClick: () => void;
  onSendTest: () => void | Promise<void>;
  onSendSavedNow: () => void | Promise<void>;
};

export function MessageFormDialog({
  open,
  onOpenChange,
  editingId,
  webhookUrl,
  onWebhookUrlChange,
  msgtype,
  onMsgtypeChange,
  content,
  onContentChange,
  scheduledAtDate,
  onScheduledAtDateChange,
  scheduleDateOpen,
  onScheduleDateOpenChange,
  onSave,
  onDeleteClick,
  onSendTest,
  onSendSavedNow,
}: MessageFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onWebhookUrlChange(e.target.value)}
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="msgtype">消息类型</Label>
            <Select
              value={msgtype}
              onValueChange={(v) =>
                onMsgtypeChange(v === "markdown" ? "markdown" : "text")
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
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="要发送到群机器人的内容"
            />
          </div>

          <ScheduleDateTimePicker
            scheduledAtDate={scheduledAtDate}
            onScheduledAtDateChange={onScheduledAtDateChange}
            scheduleDateOpen={scheduleDateOpen}
            onScheduleDateOpenChange={onScheduleDateOpenChange}
          />

          {editingId ? (
            <p className="text-xs text-muted-foreground">
              保存后由后台每 30 秒检查一次到期任务；可将失败任务编辑后重试。
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="outline" onClick={() => void onSendTest()}>
            立即发送（测试）
          </Button>
          {editingId ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void onSendSavedNow()}
              >
                按已保存记录再发一次
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onDeleteClick}
              >
                删除
              </Button>
            </>
          ) : null}
          <Button type="button" onClick={() => void onSave()}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
