import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { publishLeadStatus, type LeadStatusEvent } from "@/lib/realtime/channel";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const event: LeadStatusEvent = {
    caseId: id,
    workspaceId: CANONICAL_WORKSPACE_ID,
    nodeId: body.nodeId,
    leadStatus: body.leadStatus,
    source: "manual",
    timestamp: new Date().toISOString(),
  };

  publishLeadStatus(event);
  return NextResponse.json({ published: true });
}
