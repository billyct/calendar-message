import { useAtom } from "jotai";
import { Card, CardContent } from "@/components/ui/card";
import { monthStatsAtom } from "@/store/scheduled-messages-atoms";

export function StatsOverview() {
  const [s] = useAtom(monthStatsAtom);
  const items = [
    { label: "全部", value: s.total },
    { label: "待发", value: s.pending },
    { label: "已发", value: s.sent },
    { label: "失败", value: s.failed },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 px-2">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-lg font-semibold">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
