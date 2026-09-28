import { TimetableDataset, TimetableSlot, Weekday } from "./types";

export interface ValidationError {
  type: "INVALID_DATE" | "INVALID_TIME" | "MISSING_SUBJECT" | "OVERLAPPING_SLOTS" | "INVALID_WEEKDAY";
  message: string;
  details?: unknown;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function validateDataset(dataset: TimetableDataset): ValidationError[] {
  const errors: ValidationError[] = [];
  const { academicCalendar, subjects, sections } = dataset;

  // 1. Validate Semester Boundaries
  if (!DATE_REGEX.test(academicCalendar.semesterStart) || !DATE_REGEX.test(academicCalendar.semesterEnd)) {
    errors.push({ type: "INVALID_DATE", message: "Semester start or end date has invalid format. Required: YYYY-MM-DD" });
  }
  if (academicCalendar.semesterStart > academicCalendar.semesterEnd) {
    errors.push({ type: "INVALID_DATE", message: "semesterStart cannot be after semesterEnd" });
  }

  // 2. Validate Sections & Timetable Slots
  for (const [sectionId, section] of Object.entries(sections)) {
    const slotMap = new Map<string, TimetableSlot[]>();

    section.timetable.forEach((slot, index) => {
      // Validate Weekday
      if (slot.weekday < Weekday.SUNDAY || slot.weekday > Weekday.SATURDAY) {
        errors.push({
          type: "INVALID_WEEKDAY",
          message: `Section ${sectionId} slot ${index} contains an invalid weekday: ${slot.weekday}`
        });
      }

      // Validate Time Format & Sequence
      if (!TIME_REGEX.test(slot.startTime) || !TIME_REGEX.test(slot.endTime)) {
        errors.push({
          type: "INVALID_TIME",
          message: `Section ${sectionId} slot ${index} has invalid time format. Required: HH:mm`
        });
      } else if (slot.startTime >= slot.endTime) {
        errors.push({
          type: "INVALID_TIME",
          message: `Section ${sectionId} slot ${index} startTime (${slot.startTime}) is >= endTime (${slot.endTime})`
        });
      }

      // Validate Subject Existence
      if (!subjects[slot.subjectId]) {
        errors.push({
          type: "MISSING_SUBJECT",
          message: `Section ${sectionId} slot ${index} references non-existent subjectId: ${slot.subjectId}`
        });
      }

      // Track slots to check for overlapping collisions
      const key = `${slot.weekday}`;
      const existing = slotMap.get(key) || [];
      existing.push(slot);
      slotMap.set(key, existing);
    });

    // Check Overlaps
    slotMap.forEach((daySlots, day) => {
      daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < daySlots.length - 1; i++) {
        const current = daySlots[i];
        const next = daySlots[i + 1];

        // Check if effective date intervals overlap
        const dateOverlap = isDateRangeOverlapping(
          current.effectiveFrom || academicCalendar.semesterStart,
          current.effectiveTo || academicCalendar.semesterEnd,
          next.effectiveFrom || academicCalendar.semesterStart,
          next.effectiveTo || academicCalendar.semesterEnd
        );

        if (dateOverlap && current.endTime > next.startTime) {
          errors.push({
            type: "OVERLAPPING_SLOTS",
            message: `Overlap detected in Section ${sectionId} on Weekday ${day}: Period ${current.period} (${current.startTime}-${current.endTime}) overlaps Period ${next.period} (${next.startTime}-${next.endTime})`
          });
        }
      }
    });
  }

  return errors;
}

function isDateRangeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && startB <= endA;
}