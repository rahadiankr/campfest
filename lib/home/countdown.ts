import { getDayDifference, toLocalDateStart } from "@/lib/home/date";
import type { CountdownState, EventSettingsRow } from "@/lib/home/types";

export const buildCountdownState = (
  eventSettings: EventSettingsRow,
  today: Date,
): CountdownState => {
  if (
    eventSettings.start_date === null ||
    eventSettings.end_date === null
  ) {
    return {
      detail:
        "Tanggal mulai dan selesai acara belum diatur di Supabase Studio.",
      metric: "Belum diatur",
      tone: "unconfigured",
    };
  }

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startDate = toLocalDateStart(eventSettings.start_date);
  const endDate = toLocalDateStart(eventSettings.end_date);

  if (endDate.getTime() < startDate.getTime()) {
    throw new Error(
      `Invalid event_settings date range: end_date ${eventSettings.end_date} is before start_date ${eventSettings.start_date}.`,
    );
  }

  if (todayStart.getTime() < startDate.getTime()) {
    const daysUntilStart = getDayDifference(todayStart, startDate);

    return {
      detail: `Dimulai dalam ${daysUntilStart} hari`,
      metric: daysUntilStart.toString(),
      tone: "pending",
    };
  }

  if (todayStart.getTime() <= endDate.getTime()) {
    const currentDay = getDayDifference(startDate, todayStart) + 1;
    const totalDays = getDayDifference(startDate, endDate) + 1;

    return {
      detail: `Hari ke-${currentDay} dari ${totalDays}`,
      metric: currentDay.toString(),
      tone: "active",
    };
  }

  return {
    detail: "Camping sudah selesai. Sampai jumpa di acara berikutnya.",
    metric: "Selesai",
    tone: "complete",
  };
};
