import { TimetableService } from "./TimetableService";
import { timetableDataset } from "./dataset";

export const timetableService = new TimetableService(timetableDataset);
export const SEMESTER_START = timetableDataset.academicCalendar.semesterStart;
export const SEMESTER_END = timetableDataset.academicCalendar.semesterEnd;

export function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function planningReferenceTime(planningDate: string): Date {
  const today = todayInIndia();
  if (planningDate > today) return new Date(`${planningDate}T00:00:00+05:30`);
  return new Date();
}
