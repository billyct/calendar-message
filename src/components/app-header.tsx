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
import { ThemeMenu } from "@/components/theme-menu";
import { GroupFormDialog } from "@/components/group-form-dialog";
import type { WebhookGroup } from "@/types/webhook-group";

type AppHeaderProps = {
  onNewMessage: () => void;
  groups: WebhookGroup[];
  onCreateGroup: (name: string, webhookUrl: string, color: string) => Promise<void>;
  onUpdateGroup: (id: string, name: string, webhookUrl: string, color: string) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
};

export function AppHeader({
  onNewMessage,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
}: AppHeaderProps) {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WebhookGroup | null>(null);

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

  const handleDelete = async (group: WebhookGroup) => {
    try {
      await onDeleteGroup(group.id);
      toast.success(`已删除「${group.name}」`);
    } catch (e) {
      toast.error(String(e));
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
                          onClick={() => void handleDelete(g)}
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
    </>
  );
}
