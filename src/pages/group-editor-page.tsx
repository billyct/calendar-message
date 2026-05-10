import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { GroupEditorFormComponent } from "@/components/group-editor-form";
import { useGroupEditor } from "@/hooks/use-group-editor";

export function GroupEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editor = useGroupEditor(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (id && editor.loading) {
    return <PageHeader title="加载中..." back={() => navigate(-1)} />;
  }
  if (id && editor.notFound) {
    return (
      <>
        <PageHeader title="未找到群组" back={() => navigate(-1)} />
        <div className="p-6 text-sm text-muted-foreground">该群组不存在或已被删除。</div>
      </>
    );
  }

  const onSave = async () => {
    try {
      await editor.save();
      toast.success("已保存");
      navigate("/groups");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const onConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await editor.remove();
      toast.success("已删除");
      setConfirmDelete(false);
      navigate("/groups");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={id ? "编辑群组" : "新建群组"}
        subtitle="用于在新建消息时快速选择 webhook"
        back={() => navigate(-1)}
        actions={
          <>
            <Button onClick={onSave} disabled={!editor.form.name.trim() || !editor.form.webhookUrl.trim()}>
              保存
            </Button>
            {id ? (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                删除
              </Button>
            ) : null}
          </>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <Card className="max-w-2xl">
          <CardContent className="space-y-6 pt-6">
            <GroupEditorFormComponent
              form={editor.form}
              onChange={editor.update}
            />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除群组？</AlertDialogTitle>
            <AlertDialogDescription>
              该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={onConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
