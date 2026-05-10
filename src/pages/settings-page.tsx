import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <PageHeader title="设置" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>外观</CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>主题</FieldLabel>
              <FieldDescription>选择浅色、深色或跟随系统</FieldDescription>
              <RadioGroup
                value={theme ?? "system"}
                onValueChange={(v) => setTheme(String(v))}
                className="grid gap-2 pt-2"
              >
                <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <RadioGroupItem value="light" />
                  <Sun className="h-4 w-4" /> 浅色
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <RadioGroupItem value="dark" />
                  <Moon className="h-4 w-4" /> 深色
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <RadioGroupItem value="system" />
                  <Monitor className="h-4 w-4" /> 跟随系统
                </label>
              </RadioGroup>
            </Field>
          </CardContent>
        </Card>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>关于</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>版本 0.1.0</div>
            <a
              className="text-primary hover:underline"
              href="https://github.com/billyct/calendar-message"
              target="_blank"
              rel="noreferrer"
            >
              项目主页 (GitHub)
            </a>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
