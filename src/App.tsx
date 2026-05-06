import { useScheduledMessages } from "@/hooks/use-scheduled-messages";
import { AppHeader } from "@/components/app-header";
import { MessageCalendar } from "@/components/message-calendar";
import { MessageFormDialog } from "@/components/message-form-dialog";
import { DeleteMessageDialog } from "@/components/delete-message-dialog";

export default function App() {
  const vm = useScheduledMessages();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onNewMessage={vm.openCreate} />

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
      />

      <DeleteMessageDialog
        open={vm.deleteOpen}
        onOpenChange={vm.setDeleteOpen}
        onConfirm={vm.confirmDelete}
      />
    </div>
  );
}
