import { dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek as dfStartOfWeek,
  getDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";

const locales = { "zh-CN": zhCN };

export const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => dfStartOfWeek(date, { locale: zhCN }),
  getDay,
  locales,
});
