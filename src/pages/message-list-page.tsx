import { PageHeader } from "@/components/page-header";

export function MessageListPage() {
  return (
    <>
      <PageHeader title="消息列表" />
      <div className="flex-1 overflow-auto p-6 text-sm text-muted-foreground">即将到来</div>
    </>
  );
}
