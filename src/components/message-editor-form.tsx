import { useEffect, useRef, useState } from "react";
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
import { ScheduleDateTimePicker } from "@/components/schedule-datetime-picker";
import type { WebhookGroup } from "@/types/webhook-group";
import type { MessageTemplate } from "@/types/message-template";
import type { EditorForm } from "@/hooks/use-message-editor";

type MessageEditorFormProps = {
  form: EditorForm;
  onChange: <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => void;
  groups: WebhookGroup[];
  templates: MessageTemplate[];
};

export function MessageEditorForm({
  form,
  onChange,
  groups,
  templates,
}: MessageEditorFormProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    const group = groups.find((g) => g.webhookUrl === form.webhookUrl);
    return group?.id ?? null;
  });
  const [scheduleDateOpen, setScheduleDateOpen] = useState(false);

  useEffect(() => {
    if (selectedGroupId === null) return;
    if (!groups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(null);
    }
  }, [groups, selectedGroupId]);

  const handleGroupSelect = (value: string | null) => {
    if (!value || value === "__none__") {
      setSelectedGroupId(null);
      return;
    }
    const group = groups.find((g) => g.id === value);
    if (group) {
      setSelectedGroupId(group.id);
      onChange("webhookUrl", group.webhookUrl);
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    if (!templateId || templateId === "__placeholder__") {
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    onChange("msgtype", template.msgtype);

    const textarea = contentRef.current;
    if (
      textarea &&
      textarea.value === form.content &&
      typeof textarea.selectionStart === "number" &&
      typeof textarea.selectionEnd === "number"
    ) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = form.content.slice(0, start);
      const after = form.content.slice(end);
      onChange("content", before + template.content + after);
    } else {
      if (form.content === "") {
        onChange("content", template.content);
      } else if (form.content.endsWith("\n")) {
        onChange("content", form.content + template.content);
      } else {
        onChange("content", form.content + "\n" + template.content);
      }
    }

    setSelectedTemplate("");
  };

  return (
    <div className="grid gap-4">
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
            value={form.webhookUrl}
            onChange={(e) => onChange("webhookUrl", e.target.value)}
            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
            autoComplete="off"
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="msgtype">消息类型</Label>
        <Select
          value={form.msgtype}
          onValueChange={(v) =>
            onChange("msgtype", v === "markdown" ? "markdown" : "text")
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
          value={form.content}
          onChange={(e) => onChange("content", e.target.value)}
          placeholder="要发送到群机器人的内容"
        />
      </div>

      <ScheduleDateTimePicker
        scheduledAtDate={form.scheduledAt}
        onScheduledAtDateChange={(updater) =>
          onChange(
            "scheduledAt",
            typeof updater === "function" ? updater(form.scheduledAt) : updater,
          )
        }
        scheduleDateOpen={scheduleDateOpen}
        onScheduleDateOpenChange={setScheduleDateOpen}
      />
    </div>
  );
}
