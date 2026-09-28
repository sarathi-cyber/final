export type ISO8601Date = string; // Format: YYYY-MM-DD
export type MilitaryTime = string; // Format: HH:mm (24-hour)

export enum Weekday {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  slotCode?: string;
  faculty?: string;
  credits?: string;
}

export interface TimetableSlot {
  id: string;
  sectionId: string;
  subjectId: string;
  weekday: Weekday;
  period: number;
  startTime: MilitaryTime; // e.g. "09:00"
  endTime: MilitaryTime;   // e.g. "09:50"
  effectiveFrom?: ISO8601Date; // Inclusive
  effectiveTo?: ISO8601Date;   // Inclusive
  room?: string;
  sourcePdf?: string;
  ambiguous?: boolean;
}

export interface Section {
  id: string;
  name: string;
  subjectIds: string[];
  timetable: TimetableSlot[];
}

export interface AcademicCalendar {
  semesterStart: ISO8601Date; // "2026-08-29"
  semesterEnd: ISO8601Date;   // "2026-11-29"
  holidays: ISO8601Date[];    // Non-instructional days (e.g., ["2026-10-02"])
  workingSaturdays?: {
    date: ISO8601Date;
    substituteWeekday: Weekday; // Uses a specific day's timetable
  }[];
}

export interface ScheduledClassInstance {
  date: ISO8601Date;
  slot: TimetableSlot;
  subject: Subject;
  startDateTime: string; // ISO format: YYYY-MM-DDTHH:mm:00
  endDateTime: string;
  isPast: boolean;
}

export interface TimetableDataset {
  academicCalendar: AcademicCalendar;
  subjects: Record<string, Subject>;
  sections: Record<string, Section>;
}

export interface SubjectClassCount {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  totalScheduled: number;
  completed: number;
  remaining: number;
}