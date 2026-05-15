import { axiosClient } from "@/shared/network/axios-client";

import type {
  CalendarResponse,
  WeatherByDateResponse,
} from "@/features/project-admin/_shared/model/calendar.types";

export const calendarApi = {
  async getProjectCalendar(projectId: string): Promise<CalendarResponse> {
    const { data } = await axiosClient.get<CalendarResponse>(
      `/project/getProjectCalendar/${projectId}`,
    );
    return data;
  },

  async getWeatherByDate(date: string): Promise<WeatherByDateResponse> {
    const { data } = await axiosClient.get<WeatherByDateResponse>(
      "/project/getWeatherByDate",
      { params: { date } },
    );
    return data;
  },
};
