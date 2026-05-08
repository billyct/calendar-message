import { useState } from "react";
import { ChevronDownIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ThemeMenu } from "@/components/theme-menu";
import { GroupFormDialog } from "@/components/group-form-dialog";
import { TemplateFormDialog } from "@/components/template-form-dialog";
import type { WebhookGroup } from "@/types/webhook-group";
import type { MessageTemplate } from "@/types/message-template";

type AppHeaderProps = {
  onNewMessage: () => void;
  groups: WebhookGroup[];
  onCreateGroup: (name: string, webhookUrl: string, color: string) => Promise<void>;
  onUpdateGroup: (id: string, name: string, webhookUrl: string, color: string) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  templates: MessageTemplate[];
  onCreateTemplate: (name: string, msgtype: "text" | "markdown", content: string) => Promise<void>;
  onUpdateTemplate: (id: string, name: string, msgtype: "text" | "markdown", content: string) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
};

export function AppHeader({
  onNewMessage,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: AppHeaderProps) {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WebhookGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<WebhookGroup | null>(null);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplate | null>(null);

  const openCreate = () => {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  };

  const openEdit = (group: WebhookGroup) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleSaveGroup = async (name: string, webhookUrl: string, color: string) => {
    try {
      if (editingGroup) {
        await onUpdateGroup(editingGroup.id, name, webhookUrl, color);
        toast.success("已更新群聊");
      } else {
        await onCreateGroup(name, webhookUrl, color);
        toast.success("已创建群聊");
      }
    } catch (e) {
      toast.error(String(e));
      throw e;
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    try {
      await onDeleteGroup(deletingGroup.id);
      toast.success(`已删除「${deletingGroup.name}」`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setDeletingGroup(null);
    }
  };

  const openTemplateCreate = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const openTemplateEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async (name: string, msgtype: "text" | "markdown", content: string) => {
    try {
      if (editingTemplate) {
        await onUpdateTemplate(editingTemplate.id, name, msgtype, content);
        toast.success("已更新模板");
      } else {
        await onCreateTemplate(name, msgtype, content);
        toast.success("已创建模板");
      }
    } catch (e) {
      toast.error(String(e));
      throw e;
    }
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      await onDeleteTemplate(deletingTemplate.id);
      toast.success(`已删除「${deletingTemplate.name}」`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setDeletingTemplate(null);
    }
  };

  return (
    <>
      <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            企业微信 Webhook 定时消息
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            本地调度，定时 POST 到机器人 Webhook（text / markdown）
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ThemeMenu />
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-r-none border-r-0"
              onClick={openCreate}
            >
              <Plus className="mr-1 size-4" />
              新建群聊
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none px-2"
                    aria-label="群聊列表"
                  />
                }
              >
                <ChevronDownIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>群聊列表</DropdownMenuLabel>
                  {groups.length === 0 ? (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      暂无群聊
                    </div>
                  ) : (
                    groups.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between rounded-md px-1.5 py-1 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="inline-block size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: g.color }}
                          />
                          <span className="truncate">{g.name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-accent"
                            onClick={() => openEdit(g)}
                            aria-label="编辑"
                          >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingGroup(g)}
                          aria-label="删除"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-r-none border-r-0"
              onClick={openTemplateCreate}
            >
              <Plus className="mr-1 size-4" />
              新建模板
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none px-2"
                    aria-label="模板列表"
                  />
                }
              >
                <ChevronDownIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>模板列表</DropdownMenuLabel>
                  {templates.length === 0 ? (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      暂无模板
                    </div>
                  ) : (
                    templates.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-md px-1.5 py-1 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{t.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {t.msgtype}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-accent"
                            onClick={() => openTemplateEdit(t)}
                            aria-label="编辑"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingTemplate(t)}
                            aria-label="删除"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button type="button" onClick={onNewMessage}>
            新建消息
          </Button>
        </div>
      </header>

      <GroupFormDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        editing={editingGroup}
        onSave={handleSaveGroup}
      />

      <TemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        editing={editingTemplate}
        onSave={handleSaveTemplate}
      />

      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={(open) => { if (!open) setDeletingGroup(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除群聊「{deletingGroup?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，群聊将被永久移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleConfirmDeleteGroup()}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => { if (!open) setDeletingTemplate(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除模板「{deletingTemplate?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，模板将被永久移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleConfirmDeleteTemplate()}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
