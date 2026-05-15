export interface CalendarDateInfo {
  date: string;
  dayOfWeek: number;
  weekNumber: number;
  isHoliday: boolean;
  isHolManual: boolean;
  holidayName: string | null;
  isActivated: boolean;
  deactivatedReason: string | null;
  weather: string;
  minTemperature: number;
  maxTemperature: number;
}

export interface CalendarResponse {
  projectStartDate: string;
  projectEndDate: string;
  dates: CalendarDateInfo[];
}

export interface WeatherByDateResponse {
  weather: string;
  minTemperature: number;
  maxTemperature: number;
}

export type DateType = "normal" | "holiday" | "deactivated";

export function getDateType(dateInfo: CalendarDateInfo): DateType {
  if (!dateInfo.isActivated) return "deactivated";
  if (dateInfo.isHoliday) return "holiday";
  return "normal";
}
