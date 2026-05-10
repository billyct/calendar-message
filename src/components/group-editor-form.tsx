import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroupEditorForm } from "@/hooks/use-group-editor";

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

type GroupEditorFormComponentProps = {
  form: GroupEditorForm;
  onChange: <K extends keyof GroupEditorForm>(key: K, value: GroupEditorForm[K]) => void;
};

export function GroupEditorFormComponent({
  form,
  onChange,
}: GroupEditorFormComponentProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="group-name">群组名称</Label>
        <Input
          id="group-name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="我的群聊"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="group-webhook">Webhook URL</Label>
        <Input
          id="group-webhook"
          type="url"
          value={form.webhookUrl}
          onChange={(e) => onChange("webhookUrl", e.target.value)}
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
                borderColor: form.color === c ? "currentColor" : "transparent",
              }}
              onClick={() => onChange("color", c)}
              aria-label={`选择颜色 ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
