import { useAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { StatusBadge } from "@/components/status-badge";
import { todayMessagesAtom } from "@/store/scheduled-messages-atoms";

export function TodayMessagesPanel() {
  const [today] = useAtom(todayMessagesAtom);
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">今日消息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {today.length === 0 ? (
          <Empty className="border-0 p-2">
            <EmptyHeader>
              <EmptyTitle className="text-sm text-muted-foreground">今日无消息</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          today.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => navigate(`/messages/${m.id}`)}
              className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex-1 truncate">{m.content || "（空）"}</span>
              <StatusBadge status={m.status} />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
