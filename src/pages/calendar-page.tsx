import { PageHeader } from "@/components/page-header";

export function CalendarPage() {
  return (
    <>
      <PageHeader title="日历视图" />
      <div className="flex-1 overflow-auto p-6 text-sm text-muted-foreground">即将到来</div>
    </>
  );
}
