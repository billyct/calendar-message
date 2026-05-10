import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/page-header";
import { useWebhookGroupsData } from "@/hooks/use-webhook-groups-data";
import { invoke } from "@tauri-apps/api/core";

export function GroupListPage() {
  const navigate = useNavigate();
  const { groups, reload } = useWebhookGroupsData();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDelete = async () => {
    if (!deleteId || isDeleting) return;
    setIsDeleting(true);
    try {
      await invoke("delete_group", { id: deleteId });
      toast.success("已删除");
      setDeleteId(null);
      await reload();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="群组管理"
        subtitle="管理常用的 webhook 地址"
        actions={
          <Button onClick={() => navigate("/groups/new")}>新建群组</Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        {groups.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>暂无群组</EmptyTitle>
              <EmptyDescription>点击「新建群组」来添加第一个群组</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="inline-block size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                    {g.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 text-xs text-muted-foreground break-all">
                  {g.webhookUrl}
                </CardContent>
                <CardContent className="flex gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/groups/${g.id}`)}
                  >
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(g.id)}
                  >
                    删除
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除群组？</AlertDialogTitle>
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
