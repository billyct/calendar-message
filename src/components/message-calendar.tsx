import { Calendar as BigCalendar, type View } from "react-big-calendar";
import type { SlotInfo } from "react-big-calendar";

import { calendarLocalizer } from "@/lib/calendar-localizer";
import type { CalendarEvent } from "@/types/scheduled-message";

import "react-big-calendar/lib/css/react-big-calendar.css";

type MessageCalendarProps = {
  loading: boolean;
  events: CalendarEvent[];
  currentDate: Date;
  currentView: View;
  onNavigate: (date: Date) => void;
  onViewChange: (view: View) => void;
  onSelectSlot: (slotStart: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

export function MessageCalendar({
  loading,
  events,
  currentDate,
  currentView,
  onNavigate,
  onViewChange,
  onSelectSlot,
  onSelectEvent,
}: MessageCalendarProps) {
  return (
    <div className="relative px-4 pb-6 pt-3">
      {loading ? (
        <div className="pointer-events-none absolute inset-x-4 top-3 z-[2] flex justify-center text-sm text-muted-foreground">
          加载中…
        </div>
      ) : null}
      <BigCalendar
        culture="zh-CN"
        localizer={calendarLocalizer}
        events={events}
        date={currentDate}
        view={currentView}
        onNavigate={onNavigate}
        onView={onViewChange}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "calc(100vh - 140px)", minHeight: 520 }}
        selectable
        onSelectSlot={(slot: SlotInfo) => onSelectSlot(slot.start)}
        onSelectEvent={(ev: CalendarEvent) => onSelectEvent(ev)}
        messages={{
          today: "今天",
          previous: "上月",
          next: "下月",
          month: "月",
          week: "周",
          day: "日",
          agenda: "议程",
          date: "日期",
          time: "时间",
          event: "消息",
          showMore: (n: number) => `还有 ${n} 条`,
        }}
      />
    </div>
  );
}
