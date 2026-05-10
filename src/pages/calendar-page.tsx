import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MessageCalendar } from "@/components/message-calendar";
import { useScheduledMessages } from "@/hooks/use-scheduled-messages";
import type { CalendarEvent } from "@/types/scheduled-message";

export function CalendarPage() {
  const navigate = useNavigate();
  const vm = useScheduledMessages();

  return (
    <>
      <PageHeader
        title="日历视图"
        subtitle="管理你的定时消息"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/groups/new")}>
              <Plus className="mr-1 h-4 w-4" />
              新建群聊
            </Button>
            <Button onClick={() => navigate("/messages/new")}>
              <Plus className="mr-1 h-4 w-4" />
              新建消息
            </Button>
          </>
        }
      />
      <div className="flex-1 overflow-hidden p-4">
        <MessageCalendar
          loading={vm.loading}
          events={vm.events}
          currentDate={vm.currentDate}
          currentView={vm.currentView}
          onNavigate={vm.onNavigate}
          onViewChange={vm.onViewChange}
          onSelectSlot={(slotStart: Date) =>
            navigate(`/messages/new?at=${slotStart.toISOString()}`)
          }
          onSelectEvent={(event: CalendarEvent) =>
            navigate(`/messages/${event.resource.id}`)
          }
        />
      </div>
    </>
  );
}
