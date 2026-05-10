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
import type { TemplateEditorForm } from "@/hooks/use-template-editor";

type TemplateEditorFormComponentProps = {
  form: TemplateEditorForm;
  onChange: <K extends keyof TemplateEditorForm>(key: K, value: TemplateEditorForm[K]) => void;
};

export function TemplateEditorFormComponent({
  form,
  onChange,
}: TemplateEditorFormComponentProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="template-name">模板名称</Label>
        <Input
          id="template-name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="周报模板"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="template-msgtype">消息类型</Label>
        <Select
          value={form.msgtype}
          onValueChange={(value) => onChange("msgtype", value as "text" | "markdown")}
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
        <Label htmlFor="template-content">内容</Label>
        <Textarea
          id="template-content"
          value={form.content}
          onChange={(e) => onChange("content", e.target.value)}
          placeholder="消息内容..."
          rows={10}
        />
      </div>
    </div>
  );
}
