import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { zhCN as dayPickerZhCN } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ScheduleDateTimePickerProps = {
  scheduledAtDate: Date;
  onScheduledAtDateChange: React.Dispatch<React.SetStateAction<Date>>;
  scheduleDateOpen: boolean;
  onScheduleDateOpenChange: (open: boolean) => void;
};

export function ScheduleDateTimePicker({
  scheduledAtDate,
  onScheduledAtDateChange,
  scheduleDateOpen,
  onScheduleDateOpenChange,
}: ScheduleDateTimePickerProps) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium leading-none">
        计划发送时间（本地时区）
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="scheduled-date" className="text-muted-foreground">
            日期
          </Label>
          <Popover open={scheduleDateOpen} onOpenChange={onScheduleDateOpenChange}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  id="scheduled-date"
                  type="button"
                  className="w-full justify-between font-normal sm:max-w-[min(100%,280px)]"
                />
              }
            >
              <span className="truncate">
                {format(scheduledAtDate, "PPP", { locale: zhCN })}
              </span>
              <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
            </PopoverTrigger>
            <PopoverContent
              className="z-[100] w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                locale={dayPickerZhCN}
                captionLayout="dropdown"
                selected={scheduledAtDate}
                defaultMonth={scheduledAtDate}
                onSelect={(d: Date | undefined) => {
                  if (!d) return;
                  onScheduledAtDateChange((prev) => {
                    const next = new Date(prev);
                    next.setFullYear(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                    );
                    return next;
                  });
                  onScheduleDateOpenChange(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-2 sm:w-36">
          <Label htmlFor="scheduled-time" className="text-muted-foreground">
            时间
          </Label>
          <Input
            type="time"
            id="scheduled-time"
            step={60}
            value={format(scheduledAtDate, "HH:mm")}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [hh, mm] = v.split(":").map(Number);
              onScheduledAtDateChange((prev) => {
                const next = new Date(prev);
                next.setHours(hh, mm, 0, 0);
                return next;
              });
            }}
            className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
