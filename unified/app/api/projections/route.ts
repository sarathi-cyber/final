import { NextRequest, NextResponse } from "next/server";
import { calculateAttendance, AttendanceInputError } from "@/lib/server/attendance";
import { timetableService, SEMESTER_START, SEMESTER_END, todayInIndia, isISODate, planningReferenceTime } from "@/lib/server/service";

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const { sectionId, planningDate = todayInIndia(), subjects } = body ?? {};
  if (typeof sectionId !== "string" || !sectionId.trim()) return NextResponse.json({ error: "sectionId is required." }, { status: 400 });
  if (!isISODate(planningDate)) return NextResponse.json({ error: "planningDate must be a real date in YYYY-MM-DD format." }, { status: 400 });
  if (planningDate > SEMESTER_END) return NextResponse.json({ error: "planningDate cannot be after semester end." }, { status: 400 });
  if (!Array.isArray(subjects) || subjects.length === 0) return NextResponse.json({ error: "subjects must be a non-empty array." }, { status: 400 });
  let metrics;
  try { metrics = timetableService.getSubjectAttendanceMetrics(sectionId, planningDate, { now: planningReferenceTime(planningDate), eodCutoff: false }); }
  catch { return NextResponse.json({ error: "Unknown section ID." }, { status: 404 }); }
  const seen = new Set<string>();
  try {
    const results = subjects.map((s: any) => {
      if (!s || typeof s.subjectId !== "string" || !metrics[s.subjectId]) throw new Error(`Unknown subject ID: ${s?.subjectId ?? "(missing)"}.`);
      if (seen.has(s.subjectId)) throw new Error(`Duplicate subject ID: ${s.subjectId}.`);
      seen.add(s.subjectId);
      const m = metrics[s.subjectId];
      return { subject: m, projection: calculateAttendance({ subjectId: s.subjectId, attendedClasses: s.attendedClasses, conductedClasses: s.conductedClasses, remainingClasses: m.remaining, planningDate, semesterEndDate: SEMESTER_END }) };
    });
    return NextResponse.json({ sectionId, planningDate, semesterStart: SEMESTER_START, semesterEnd: SEMESTER_END, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid projection input.";
    const status = error instanceof AttendanceInputError || message.startsWith("Unknown subject") || message.startsWith("Duplicate subject") ? 400 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
