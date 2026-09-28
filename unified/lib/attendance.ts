import { AttendanceResult, AttendanceState, DashboardSummary, Subject } from '@/types/attendance';

export function attendancePercentage(attended: number, conducted: number): number {
  if (conducted <= 0) return 0;
  return (attended / conducted) * 100;
}

export function classesNeeded(attended: number, conducted: number, target: number): number {
  if (conducted < 0 || attended < 0 || attended > conducted || target <= 0 || target > 100) return 0;
  if (attendancePercentage(attended, conducted) >= target) return 0;
  // (attended + x) / (conducted + x) >= target/100
  return Math.ceil(((target / 100) * conducted - attended) / (1 - target / 100));
}

export function getAttendanceState(percentage: number): AttendanceState {
  if (percentage >= 90) return 'safe';
  if (percentage >= 75) return 'warning';
  if (percentage > 0) return 'risk';
  return 'irreversible';
}

export function getAttendanceResult(subject: Subject): AttendanceResult {
  const percentage = attendancePercentage(subject.attended, subject.conducted);
  const classesTo75 = classesNeeded(subject.attended, subject.conducted, 75);
  const classesTo90 = classesNeeded(subject.attended, subject.conducted, 90);
  return { percentage, state: getAttendanceState(percentage), classesTo75, classesTo90, canReach90: true };
}

export function getDashboardSummary(subjects: Subject[], remainingClasses = 0): DashboardSummary {
  const attended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const conducted = subjects.reduce((sum, s) => sum + s.conducted, 0);
  const percentage = attendancePercentage(attended, conducted);
  return {
    overallPercentage: percentage,
    attended,
    conducted,
    remainingClasses,
    classesTo75: classesNeeded(attended, conducted, 75),
    classesTo90: classesNeeded(attended, conducted, 90),
    state: getAttendanceState(percentage),
  };
}

export function projectedPercentage(attended: number, conducted: number, futureAttended: number, futureTotal: number): number {
  return attendancePercentage(attended + futureAttended, conducted + futureTotal);
}
