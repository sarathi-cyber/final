import { NextResponse } from "next/server";
import { timetableService } from "@/lib/server/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sectionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { sectionId } = await context.params;
  try {
    return NextResponse.json({ sectionId, subjects: timetableService.getSubjectsForSection(sectionId) });
  } catch {
    return NextResponse.json({ error: "Unknown section ID." }, { status: 404 });
  }
}
