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
import { useWebhookGroups } from "@/hooks/use-webhook-groups";
import { useMessageTemplates } from "@/hooks/use-message-templates";

export function MessageEditorPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const editor = useMessageEditor(id);
  const { groups } = useWebhookGroups();
  const { templates } = useMessageTemplates();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Pre-fill scheduledAt from ?at=ISO when creating new
  useEffect(() => {
    if (id) return;
    const at = search.get("at");
    if (at) {
      const d = new Date(at);
      if (!Number.isNaN(d.getTime())) editor.update("scheduledAt", d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, search]);

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
    try {
      await editor.remove();
      toast.success("已删除");
      navigate("/calendar");
    } catch (e) {
      toast.error(String(e));
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
            <AlertDialogAction onClick={onConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
