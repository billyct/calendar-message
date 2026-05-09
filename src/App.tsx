import { useScheduledMessages } from "@/hooks/use-scheduled-messages";
import { useWebhookGroups } from "@/hooks/use-webhook-groups";
import { useMessageTemplates } from "@/hooks/use-message-templates";
import { AppHeader } from "@/components/app-header";
import { MessageCalendar } from "@/components/message-calendar";
import { MessageFormDialog } from "@/components/message-form-dialog";
import { DeleteMessageDialog } from "@/components/delete-message-dialog";

export default function App() {
  const wg = useWebhookGroups();
  const vm = useScheduledMessages();
  const mt = useMessageTemplates();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        onNewMessage={vm.openCreate}
        groups={wg.groups}
        onCreateGroup={wg.createGroup}
        onUpdateGroup={wg.updateGroup}
        onDeleteGroup={wg.deleteGroup}
        templates={mt.templates}
        onCreateTemplate={mt.createTemplate}
        onUpdateTemplate={mt.updateTemplate}
        onDeleteTemplate={mt.deleteTemplate}
      />

      <MessageCalendar
        loading={vm.loading}
        events={vm.events}
        currentDate={vm.currentDate}
        currentView={vm.currentView}
        onNavigate={vm.onNavigate}
        onViewChange={vm.onViewChange}
        onSelectSlot={vm.onSelectSlot}
        onSelectEvent={vm.onSelectEvent}
      />

      <MessageFormDialog
        open={vm.modalOpen}
        onOpenChange={vm.setModalOpen}
        editingId={vm.editingId}
        groups={wg.groups}
        selectedGroupId={vm.selectedGroupId}
        onGroupSelect={vm.setSelectedGroupId}
        webhookUrl={vm.webhookUrl}
        onWebhookUrlChange={vm.setWebhookUrl}
        msgtype={vm.msgtype}
        onMsgtypeChange={vm.setMsgtype}
        content={vm.content}
        onContentChange={vm.setContent}
        scheduledAtDate={vm.scheduledAtDate}
        onScheduledAtDateChange={vm.setScheduledAtDate}
        scheduleDateOpen={vm.scheduleDateOpen}
        onScheduleDateOpenChange={vm.setScheduleDateOpen}
        onSave={vm.saveMessage}
        onDeleteClick={() => vm.setDeleteOpen(true)}
        onSendTest={vm.sendTestFromForm}
        onSendSavedNow={() =>
          vm.editingId ? vm.sendSavedNow(vm.editingId) : undefined
        }
        templates={mt.templates}
      />

      <DeleteMessageDialog
        open={vm.deleteOpen}
        onOpenChange={vm.setDeleteOpen}
        onConfirm={vm.confirmDelete}
      />
    </div>
  );
}
