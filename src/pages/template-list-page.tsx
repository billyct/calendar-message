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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/page-header";
import { useMessageTemplatesData } from "@/hooks/use-message-templates-data";
import { invoke } from "@tauri-apps/api/core";

export function TemplateListPage() {
  const navigate = useNavigate();
  const { templates, reload } = useMessageTemplatesData();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDelete = async () => {
    if (!deleteId || isDeleting) return;
    setIsDeleting(true);
    try {
      await invoke("delete_template", { id: deleteId });
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
        title="模板管理"
        subtitle="管理常用的消息模板"
        actions={
          <Button onClick={() => navigate("/templates/new")}>新建模板</Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        {templates.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>暂无模板</EmptyTitle>
              <EmptyDescription>点击「新建模板」来添加第一个模板</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {t.name}
                    <Badge variant="secondary">{t.msgtype}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 text-xs text-muted-foreground">
                  <code className="line-clamp-3 whitespace-pre-wrap break-words">
                    {t.content.slice(0, 120)}
                  </code>
                </CardContent>
                <CardFooter className="flex gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/templates/${t.id}`)}
                  >
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(t.id)}
                  >
                    删除
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除模板？</AlertDialogTitle>
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
