import { useMatch } from "react-router-dom";

export function RightRail() {
  const onCalendar = useMatch("/calendar");
  if (!onCalendar) return null;
  return (
    <aside className="w-80 shrink-0 border-l bg-background p-4">
      <div className="text-sm text-muted-foreground">右侧面板（今日消息 / 快速创建）将在后续任务中加入。</div>
    </aside>
  );
}
