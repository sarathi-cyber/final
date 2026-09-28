export type AttendanceState = 'safe' | 'warning' | 'risk' | 'irreversible';

export interface Subject {
  id: string;
  name: string;
  attended: number;
  conducted: number;
  currentPercentage?: number;
  code?: string;
  slotCode?: string;
  faculty?: string;
  credits?: string;
}

export interface Section { id: string; name: string; sourcePdf?: string; sourceAcademicYear?: string; timetableStatus?: string; predictionEnabled?: boolean; }

export interface TimetableEntry {
  id: string;
  sectionId: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  room?: string;
  faculty?: string;
}

export interface AttendanceResult {
  percentage: number;
  state: AttendanceState;
  classesTo75: number;
  classesTo90: number;
  canReach90: boolean;
}

export interface DashboardSummary {
  overallPercentage: number;
  conducted: number;
  attended: number;
  remainingClasses: number;
  classesTo75: number;
  classesTo90: number;
  state: AttendanceState;
}
