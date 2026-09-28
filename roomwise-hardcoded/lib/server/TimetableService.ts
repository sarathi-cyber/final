import {
  TimetableDataset,
  Section,
  Subject,
  TimetableSlot,
  ScheduledClassInstance,
  SubjectClassCount,
  ISO8601Date,
  Weekday
} from "./types";

export interface PlanningDateConfig {
  now?: Date; // Defaults to new Date() if omitted
  eodCutoff?: boolean; // If true, treats the entire planning date as elapsed
}

export class TimetableService {
  private dataset: TimetableDataset;

  constructor(dataset: TimetableDataset) {
    this.dataset = dataset;
  }

  public getAvailableSections(): { id: string; name: string; sourcePdf?: string; sourceAcademicYear?: string; timetableStatus?: string; predictionEnabled?: boolean }[] {
    return Object.values(this.dataset.sections).map((s) => ({ id: s.id, name: s.name, sourcePdf: (s as any).sourcePdf, sourceAcademicYear: (s as any).sourceAcademicYear, timetableStatus: (s as any).timetableStatus, predictionEnabled: (s as any).predictionEnabled }));
  }

  public getSubjectsForSection(sectionId: string): Subject[] {
    const section = this.dataset.sections[sectionId];
    if (!section) throw new Error(`Section ${sectionId} not found.`);
    return section.subjectIds.map((id) => this.dataset.subjects[id]).filter(Boolean);
  }

  /**
   * Generates all concrete class instances for a section between two dates.
   * Clamped strictly between academicCalendar.semesterStart and semesterEnd.
   */
  public generateSchedule(
    sectionId: string,
    startDateStr: ISO8601Date,
    endDateStr: ISO8601Date,
    config?: PlanningDateConfig
  ): ScheduledClassInstance[] {
    const section = this.dataset.sections[sectionId];
    if (!section) throw new Error(`Section ${sectionId} not found.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      throw new Error("Dates must use YYYY-MM-DD format.");
    }
    if (startDateStr > endDateStr) throw new Error("startDate cannot be after endDate.");

    const { academicCalendar, subjects } = this.dataset;
    const now = config?.now ?? new Date();

    // Clamp range within semester boundaries
    const actualStart = startDateStr < academicCalendar.semesterStart ? academicCalendar.semesterStart : startDateStr;
    const actualEnd = endDateStr > academicCalendar.semesterEnd ? academicCalendar.semesterEnd : endDateStr;

    if (actualStart > actualEnd) return [];

    const instances: ScheduledClassInstance[] = [];
    const holidaysSet = new Set(academicCalendar.holidays);
    const workingSatMap = new Map<string, Weekday>(
      academicCalendar.workingSaturdays?.map((ws) => [ws.date, ws.substituteWeekday]) || []
    );

    const cursor = new Date(`${actualStart}T00:00:00Z`);
    const end = new Date(`${actualEnd}T00:00:00Z`);

    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      let dayOfWeek = cursor.getUTCDay() as Weekday;

      // Handle working Saturdays or substitution
      if (workingSatMap.has(dateStr)) {
        dayOfWeek = workingSatMap.get(dateStr)!;
      }

      const isHoliday = holidaysSet.has(dateStr);

      if (!isHoliday) {
        // Find matching slots
        const matchingSlots = section.timetable.filter((slot) => {
          if (slot.weekday !== dayOfWeek) return false;
          if (slot.effectiveFrom && slot.effectiveFrom > dateStr) return false;
          if (slot.effectiveTo && slot.effectiveTo < dateStr) return false;
          return true;
        });

        for (const slot of matchingSlots) {
          const startDateTime = `${dateStr}T${slot.startTime}:00`;
          const endDateTime = `${dateStr}T${slot.endTime}:00`;
          const classSlotEnd = new Date(`${dateStr}T${slot.endTime}:00+05:30`);

          // Evaluation of whether class has already occurred
          let isPast: boolean;
          if (config?.eodCutoff) {
            const planningDateStr = now.toISOString().slice(0, 10);
            isPast = dateStr <= planningDateStr;
          } else {
            isPast = classSlotEnd.getTime() <= now.getTime();
          }

          instances.push({
            date: dateStr,
            slot,
            subject: subjects[slot.subjectId],
            startDateTime,
            endDateTime,
            isPast
          });
        }
      }

      // Next day
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return instances.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  }

  /**
   * Returns remaining classes strictly from the reference planning date through 2026-11-29.
   */
  public getRemainingClasses(
    sectionId: string,
    planningDateStr: ISO8601Date,
    config?: PlanningDateConfig
  ): ScheduledClassInstance[] {
    const schedule = this.generateSchedule(
      sectionId,
      planningDateStr,
      this.dataset.academicCalendar.semesterEnd,
      config
    );
    return schedule.filter((instance) => !instance.isPast);
  }

  /**
   * Summarizes total, completed, and remaining classes for attendance calculations.
   */
  public getSubjectAttendanceMetrics(
    sectionId: string,
    planningDateStr: ISO8601Date,
    config?: PlanningDateConfig
  ): Record<string, SubjectClassCount> {
    const fullSemesterSchedule = this.generateSchedule(
      sectionId,
      this.dataset.academicCalendar.semesterStart,
      this.dataset.academicCalendar.semesterEnd,
      config
    );

    const metrics: Record<string, SubjectClassCount> = {};

    // Initialize all section subjects with 0
    const subjects = this.getSubjectsForSection(sectionId);
    for (const sub of subjects) {
      metrics[sub.id] = {
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        totalScheduled: 0,
        completed: 0,
        remaining: 0
      };
    }

    // Populate counts
    for (const instance of fullSemesterSchedule) {
      const subId = instance.slot.subjectId;
      if (!metrics[subId]) continue;

      metrics[subId].totalScheduled += 1;
      if (instance.isPast) {
        metrics[subId].completed += 1;
      } else {
        metrics[subId].remaining += 1;
      }
    }

    return metrics;
  }
}