import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MessageTemplate } from "@/types/message-template";

type TemplateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MessageTemplate | null;
  onSave: (name: string, msgtype: "text" | "markdown", content: string) => Promise<void>;
};

export function TemplateFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: TemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [msgtype, setMsgtype] = useState<"text" | "markdown">("text");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setMsgtype(editing?.msgtype ?? "text");
      setContent(editing?.content ?? "");
    }
  }, [open, editing]);

  const handleSave = async () => {
    await onSave(name.trim(), msgtype, content.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑模板" : "新建模板"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="template-name">模板名称</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的模板"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-msgtype">消息类型</Label>
            <Select
              value={msgtype}
              onValueChange={(value) => setMsgtype(value as "text" | "markdown")}
            >
              <SelectTrigger id="template-msgtype">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">text</SelectItem>
                <SelectItem value="markdown">markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-content">模板内容</Label>
            <Textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入模板内容..."
              className="min-h-32 font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || !content.trim()}
            onClick={() => void handleSave()}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
