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
import type { WebhookGroup } from "@/types/webhook-group";

const COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
];

type GroupFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: WebhookGroup | null;
  onSave: (name: string, webhookUrl: string, color: string) => Promise<void>;
};

export function GroupFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: GroupFormDialogProps) {
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[5]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setWebhookUrl(editing?.webhookUrl ?? "");
      setColor(editing?.color ?? COLOR_PALETTE[5]);
    }
  }, [open, editing]);

  const handleSave = async () => {
    await onSave(name.trim(), webhookUrl.trim(), color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑群聊" : "新建群聊"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="group-name">群聊名称</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的群聊"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-webhook">Webhook URL</Label>
            <Input
              id="group-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label>颜色</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "currentColor" : "transparent",
                  }}
                  onClick={() => setColor(c)}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
            </div>
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
            disabled={!name.trim() || !webhookUrl.trim()}
            onClick={() => void handleSave()}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
