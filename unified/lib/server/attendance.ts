/**
 * Pure attendance calculation engine.
 *
 * All class counts are integers. Percentages are derived from exact integer
 * inequalities rather than floating-point target comparisons.
 *
 * Assumptions:
 * - 75% is inclusive: >= 75% is sufficient to avoid detention.
 * - "Reach 90%" is inclusive: >= 90%.
 * - "Above 90%" is strict: > 90%.
 * - R is supplied by the timetable/scheduling layer. This module never
 *   estimates or derives R from dates.
 * - The semester end date is used only to validate planningDate <= semesterEndDate.
 * - If C = 0, A must also be 0. Current percentage is reported as 0 rather
 *   than NaN/Infinity.
 */

export type AttendanceStatus =
  | "SAFE"
  | "AT_RISK"
  | "RECOVERABLE"
  | "IRREVERSIBLE_DETENTION";

export type Target90Status =
  | "ALREADY_REACHED"
  | "REACHABLE"
  | "TARGET_UNREACHABLE";

export interface AttendanceInput {
  subjectId: string;
  attendedClasses: number;       // A
  conductedClasses: number;      // C
  remainingClasses: number;      // R
  planningDate: string | Date;
  semesterEndDate: string | Date;
}

export interface AttendanceResult {
  subjectId: string;

  current: {
    attendedClasses: number;
    conductedClasses: number;
    percentage: number;
  };

  remainingClasses: number;

  finishIfAttendAll: {
    attendedClasses: number;
    conductedClasses: number;
    percentage: number;
  };

  detention: {
    status: AttendanceStatus;
    canReach75: boolean;
    minimumClassesToAttend: number;
    classesMayMissWhileStillReaching75: number;
  };

  target90: {
    status: Target90Status;
    canReach90: boolean;
    minimumClassesToAttend: number | null;
    classesMayMissAndStillReach90: number | null;
  };

  above90: {
    canFinishAbove90: boolean;
    minimumClassesToAttend: number | null;
  };

  dates: {
    planningDate: string;
    semesterEndDate: string;
  };
}

export class AttendanceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttendanceInputError";
  }
}

const TARGET_75_NUMERATOR = 3;
const TARGET_75_DENOMINATOR = 4;

const TARGET_90_NUMERATOR = 9;
const TARGET_90_DENOMINATOR = 10;

/** Returns the smallest integer x >= 0 satisfying (A+x)/(C+R) >= target. */
function minimumClassesForInclusiveTarget(
  attended: number,
  totalConductedAtEnd: number,
  targetNumerator: number,
  targetDenominator: number,
): number {
  const numeratorNeeded =
    targetNumerator * totalConductedAtEnd -
    targetDenominator * attended;

  if (numeratorNeeded <= 0) return 0;

  return Math.ceil(numeratorNeeded / targetDenominator);
}

/** Returns the smallest integer x >= 0 satisfying (A+x)/(C+R) > 90%. */
function minimumClassesForStrict90(
  attended: number,
  totalConductedAtEnd: number,
): number {
  // 10(A+x) > 9(C+R)
  // x > (9(C+R) - 10A) / 10
  // smallest integer x is floor(n / 10) + 1.
  const numeratorNeeded =
    TARGET_90_NUMERATOR * totalConductedAtEnd -
    TARGET_90_DENOMINATOR * attended;

  if (numeratorNeeded < 0) return 0;

  return Math.floor(numeratorNeeded / TARGET_90_DENOMINATOR) + 1;
}

function parseDate(value: string | Date, fieldName: string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AttendanceInputError(`${fieldName} must be a valid date.`);
  }
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString();
}

function percentage(attended: number, conducted: number): number {
  return conducted === 0 ? 0 : (attended / conducted) * 100;
}

function validateInput(input: AttendanceInput): { planningDate: Date; semesterEndDate: Date } {
  if (!input.subjectId.trim()) {
    throw new AttendanceInputError("subjectId must not be empty.");
  }

  for (const [name, value] of [
    ["attendedClasses", input.attendedClasses],
    ["conductedClasses", input.conductedClasses],
    ["remainingClasses", input.remainingClasses],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new AttendanceInputError(`${name} must be a non-negative integer.`);
    }
  }

  if (input.attendedClasses > input.conductedClasses) {
    throw new AttendanceInputError(
      "attendedClasses cannot exceed conductedClasses.",
    );
  }

  if (input.conductedClasses === 0 && input.attendedClasses !== 0) {
    throw new AttendanceInputError(
      "attendedClasses must be 0 when conductedClasses is 0.",
    );
  }

  const planningDate = parseDate(input.planningDate, "planningDate");
  const semesterEndDate = parseDate(input.semesterEndDate, "semesterEndDate");

  if (planningDate > semesterEndDate) {
    throw new AttendanceInputError(
      "planningDate cannot be after semesterEndDate.",
    );
  }

  return { planningDate, semesterEndDate };
}

export function calculateAttendance(input: AttendanceInput): AttendanceResult {
  const { planningDate, semesterEndDate } = validateInput(input);

  const A = input.attendedClasses;
  const C = input.conductedClasses;
  const R = input.remainingClasses;
  const finalConducted = C + R;
  const finalAttendedIfAll = A + R;

  const currentPercentage = percentage(A, C);
  const finalMaxPercentage = percentage(finalAttendedIfAll, finalConducted);

  const minimum75 = minimumClassesForInclusiveTarget(
    A,
    finalConducted,
    TARGET_75_NUMERATOR,
    TARGET_75_DENOMINATOR,
  );

  const canReach75 = minimum75 <= R;
  const minimum90Raw = minimumClassesForInclusiveTarget(
    A,
    finalConducted,
    TARGET_90_NUMERATOR,
    TARGET_90_DENOMINATOR,
  );
  const canReach90 = minimum90Raw <= R;
  const minimum90 = canReach90 ? minimum90Raw : null;

  const minimumAbove90Raw = minimumClassesForStrict90(A, finalConducted);
  const canFinishAbove90 = minimumAbove90Raw <= R;
  const minimumAbove90 = canFinishAbove90 ? minimumAbove90Raw : null;

  let detentionStatus: AttendanceStatus;

  if (!canReach75) {
    detentionStatus = "IRREVERSIBLE_DETENTION";
  } else if (currentPercentage < 75) {
    detentionStatus = "RECOVERABLE";
  } else if (minimum75 > 0) {
    detentionStatus = "AT_RISK";
  } else {
    detentionStatus = "SAFE";
  }

  let target90Status: Target90Status;
  if (currentPercentage >= 90) {
    target90Status = "ALREADY_REACHED";
  } else if (canReach90) {
    target90Status = "REACHABLE";
  } else {
    target90Status = "TARGET_UNREACHABLE";
  }

  return {
    subjectId: input.subjectId,
    current: {
      attendedClasses: A,
      conductedClasses: C,
      percentage: currentPercentage,
    },
    remainingClasses: R,
    finishIfAttendAll: {
      attendedClasses: finalAttendedIfAll,
      conductedClasses: finalConducted,
      percentage: finalMaxPercentage,
    },
    detention: {
      status: detentionStatus,
      canReach75,
      minimumClassesToAttend: canReach75 ? minimum75 : 0,
      classesMayMissWhileStillReaching75: canReach75 ? R - minimum75 : 0,
    },
    target90: {
      status: target90Status,
      canReach90,
      minimumClassesToAttend: minimum90,
      classesMayMissAndStillReach90:
        canReach90 && minimum90 !== null ? R - minimum90 : null,
    },
    above90: {
      canFinishAbove90,
      minimumClassesToAttend: minimumAbove90,
    },
    dates: {
      planningDate: isoDate(planningDate),
      semesterEndDate: isoDate(semesterEndDate),
    },
  };
}
