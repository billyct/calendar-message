import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { MessageEditorForm } from "@/components/message-editor-form";
import { useMessageEditor } from "@/hooks/use-message-editor";
import { useWebhookGroupsData } from "@/hooks/use-webhook-groups-data";
import { useMessageTemplatesData } from "@/hooks/use-message-templates-data";

export function MessageEditorPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const editor = useMessageEditor(id);
  const { groups } = useWebhookGroupsData();
  const { templates } = useMessageTemplatesData();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const atParam = search.get("at");
  useEffect(() => {
    if (id) return;
    if (!atParam) return;
    const d = new Date(atParam);
    if (!Number.isNaN(d.getTime())) editor.update("scheduledAt", d);
  }, [id, atParam, editor.update]);

  if (id && editor.loading) {
    return <PageHeader title="加载中..." back={() => navigate(-1)} />;
  }
  if (id && editor.notFound) {
    return (
      <>
        <PageHeader title="未找到消息" back={() => navigate(-1)} />
        <div className="p-6 text-sm text-muted-foreground">该消息不存在或已被删除。</div>
      </>
    );
  }

  const onSave = async () => {
    try {
      await editor.save();
      toast.success("已保存");
      navigate("/calendar");
    } catch (e) {
      toast.error(String(e));
    }
  };
  const onSendTest = async () => {
    try {
      await editor.sendTest();
      toast.success("测试已发送");
    } catch (e) {
      toast.error(String(e));
    }
  };
  const onSendNow = async () => {
    try {
      await editor.sendNowSaved();
      toast.success("已发送");
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
      navigate("/calendar");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={id ? "编辑消息" : "新建消息"}
        subtitle="计划时间到达后由后台每 30 秒检查一次并发送"
        back={() => navigate(-1)}
        actions={
          <>
            <Button variant="outline" onClick={onSendTest}>
              测试发送
            </Button>
            {id ? (
              <Button variant="secondary" onClick={onSendNow}>
                立即发送
              </Button>
            ) : null}
            <Button onClick={onSave}>保存</Button>
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
            <MessageEditorForm
              form={editor.form}
              onChange={editor.update}
              groups={groups}
              templates={templates}
            />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除消息？</AlertDialogTitle>
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
