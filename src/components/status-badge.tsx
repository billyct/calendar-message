import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/message-status";

const VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "outline",
  sent: "default",
  failed: "destructive",
  cancelled: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "secondary"}>{statusLabel(status)}</Badge>;
}
