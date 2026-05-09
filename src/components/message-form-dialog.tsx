import { useEffect, useRef, useState } from "react";
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
import type { WebhookGroup } from "@/types/webhook-group";
import type { MessageTemplate } from "@/types/message-template";

type MessageFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  groups: WebhookGroup[];
  selectedGroupId: string | null;
  onGroupSelect: (groupId: string | null) => void;
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
  templates: MessageTemplate[];
};

export function MessageFormDialog({
  open,
  onOpenChange,
  editingId,
  groups,
  selectedGroupId,
  onGroupSelect,
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
  templates,
}: MessageFormDialogProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (selectedGroupId === null) return;
    if (!groups.some((g) => g.id === selectedGroupId)) {
      onGroupSelect(null);
    }
  }, [groups, selectedGroupId, onGroupSelect]);

  const handleGroupSelect = (value: string | null) => {
    if (!value || value === "__none__") {
      onGroupSelect(null);
      return;
    }
    const group = groups.find((g) => g.id === value);
    if (group) {
      onGroupSelect(group.id);
      onWebhookUrlChange(group.webhookUrl);
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    if (!templateId || templateId === "__placeholder__") {
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    onMsgtypeChange(template.msgtype);

    const textarea = contentRef.current;
    if (
      textarea &&
      document.activeElement === textarea &&
      typeof textarea.selectionStart === "number" &&
      typeof textarea.selectionEnd === "number"
    ) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = content.slice(0, start);
      const after = content.slice(end);
      onContentChange(before + template.content + after);
    } else {
      if (content === "") {
        onContentChange(template.content);
      } else if (content.endsWith("\n")) {
        onContentChange(content + template.content);
      } else {
        onContentChange(content + "\n" + template.content);
      }
    }

    setSelectedTemplate("");
  };

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
          {groups.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="group">选择群聊（可选）</Label>
              <Select
                value={selectedGroupId ?? "__none__"}
                onValueChange={handleGroupSelect}
              >
                <SelectTrigger id="group" className="w-full min-w-0">
                  <SelectValue>
                    {selectedGroupId
                      ? (() => {
                          const g = groups.find((g) => g.id === selectedGroupId);
                          return g ? (
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: g.color }}
                              />
                              {g.name}
                            </span>
                          ) : (
                            "手动填写"
                          );
                        })()
                      : "手动填写"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">手动填写</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: g.color }}
                        />
                        {g.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!selectedGroupId && (
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
          )}

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

          {templates.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="template">插入模板</Label>
              <Select
                value={selectedTemplate}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger
                  id="template"
                  className="w-full min-w-0"
                  aria-label="插入模板"
                >
                  <SelectValue placeholder="选择模板..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__placeholder__" disabled>
                    选择模板...
                  </SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              ref={contentRef}
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
