import { useMatch } from "react-router-dom";
import { TodayMessagesPanel } from "@/components/today-messages-panel";
import { QuickCreatePanel } from "@/components/quick-create-panel";

export function RightRail() {
  const onCalendar = useMatch("/calendar");
  if (!onCalendar) return null;
  return (
    <aside className="w-80 shrink-0 space-y-4 overflow-auto border-l bg-background p-4">
      <TodayMessagesPanel />
      <QuickCreatePanel />
    </aside>
  );
}
