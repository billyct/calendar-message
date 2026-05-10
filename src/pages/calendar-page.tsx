import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import type { View } from "react-big-calendar";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MessageCalendar } from "@/components/message-calendar";
import { useScheduledMessagesData } from "@/hooks/use-scheduled-messages-data";
import type { CalendarEvent } from "@/types/scheduled-message";

function monthRange(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 2);
  return { start, end };
}

export function CalendarPage() {
  const navigate = useNavigate();
  const { events, loading, setRange } = useScheduledMessagesData();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>("month");

  // keep range in sync with month navigation
  useEffect(() => {
    setRange(monthRange(currentDate));
  }, [currentDate, setRange]);

  const onSelectSlot = useCallback(
    (slotStart: Date) => navigate(`/messages/new?at=${slotStart.toISOString()}`),
    [navigate],
  );
  const onSelectEvent = useCallback(
    (event: CalendarEvent) => navigate(`/messages/${event.resource.id}`),
    [navigate],
  );

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
          loading={loading}
          events={events}
          currentDate={currentDate}
          currentView={currentView}
          onNavigate={setCurrentDate}
          onViewChange={setCurrentView}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
        />
      </div>
    </>
  );
}
