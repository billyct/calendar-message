import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { messagesRangeAtom, messageListAtom } from "@/store/scheduled-messages-atoms";
import { useAtom } from "jotai";
import type { ScheduledMessage } from "@/types/scheduled-message";
import type { DateRange } from "@/store/scheduled-messages-atoms";

export function MessageListPage() {
  const navigate = useNavigate();
  const [range] = useAtom(messagesRangeAtom);
  const [rows, setRows] = useAtom(messageListAtom);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(
    async (r: DateRange) => {
      try {
        const messages = await invoke<ScheduledMessage[]>("list_messages", {
          startMs: r.start.getTime(),
          endMs: r.end.getTime(),
        });
        setRows(messages);
      } catch (e) {
        toast.error(String(e));
        setRows([]);
      }
    },
    [setRows],
  );

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const rangeRef = useRef(range);
  useEffect(() => {
    rangeRef.current = range;
  });

  useEffect(() => {
    let cancelled = false;
    let off: (() => void) | undefined;
    void listen("messages-changed", () => loadRef.current(rangeRef.current)).then((fn) => {
      if (cancelled) fn();
      else off = fn;
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  const onDelete = async () => {
    if (!confirmDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await invoke("delete_message", { id: confirmDelete });
      toast.success("已删除");
      setConfirmDelete(null);
      await load(range);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString("zh-CN");
  };

  return (
    <>
      <PageHeader
        title="消息列表"
        subtitle="所有定时消息（最近 30 天 / 未来 30 天）"
        actions={
          <Button onClick={() => navigate("/messages/new")}>
            <Plus className="mr-2 h-4 w-4" />
            新增消息
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>暂无消息</EmptyTitle>
              <EmptyDescription>点击右上角创建一条</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>状态</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>定时时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <span title={m.content}>{m.content}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <span title={m.webhookUrl}>{m.webhookUrl}</span>
                  </TableCell>
                  <TableCell>{m.msgtype}</TableCell>
                  <TableCell>{formatDate(m.scheduledAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/messages/${m.id}`)}
                      className="mr-2"
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDelete(m.id)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除消息？</AlertDialogTitle>
            <AlertDialogDescription>
              该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={onDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
