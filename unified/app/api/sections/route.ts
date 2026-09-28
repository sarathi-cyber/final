import { NextResponse } from "next/server";
import { timetableService } from "@/lib/server/service";
import { validateDataset } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
export async function GET() {
  const errors = validateDataset((await import("@/lib/server/dataset")).timetableDataset);
  if (errors.length) return NextResponse.json({ error: "Timetable dataset is invalid.", details: errors }, { status: 500 });
  return NextResponse.json({ sections: timetableService.getAvailableSections() });
}
