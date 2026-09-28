import { NextRequest, NextResponse } from "next/server";
import { timetableService, SEMESTER_START, SEMESTER_END, todayInIndia, isISODate, planningReferenceTime } from "@/lib/server/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sectionId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { sectionId } = await context.params;
  const startDate = request.nextUrl.searchParams.get("startDate") ?? todayInIndia();
  const endDate = request.nextUrl.searchParams.get("endDate") ?? SEMESTER_END;

  if (!isISODate(startDate) || !isISODate(endDate)) {
    return NextResponse.json({ error: "startDate and endDate must be real dates in YYYY-MM-DD format." }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate cannot be after endDate." }, { status: 400 });
  }

  try {
    const entries = timetableService.generateSchedule(sectionId, startDate, endDate, {
      now: planningReferenceTime(startDate),
    });
    return NextResponse.json({ sectionId, startDate, endDate, semesterStart: SEMESTER_START, semesterEnd: SEMESTER_END, entries });
  } catch {
    return NextResponse.json({ error: "Unknown section ID." }, { status: 404 });
  }
}
