import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme-menu";

type AppHeaderProps = {
  onNewMessage: () => void;
};

export function AppHeader({ onNewMessage }: AppHeaderProps) {
  return (
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
        <Button type="button" onClick={onNewMessage}>
          新建消息
        </Button>
      </div>
    </header>
  );
}
