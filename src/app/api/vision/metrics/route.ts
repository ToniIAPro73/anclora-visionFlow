import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTemplateMetrics } from "@/lib/metrics";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metrics = await getTemplateMetrics(CANONICAL_WORKSPACE_ID);
  return NextResponse.json(metrics);
}
