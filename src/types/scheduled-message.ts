export type ScheduledMessage = {
  id: string;
  webhookUrl: string;
  msgtype: string;
  content: string;
  scheduledAt: number;
  status: string;
  createdAt: number;
  updatedAt: number;
  lastAttemptAt: number | null;
  lastError: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduledMessage;
};
