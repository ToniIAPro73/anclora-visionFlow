import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/case-templates";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ templates: listTemplates() });
}
