import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { attachInsightCard, attachEnergyReference } from "@/lib/evidence";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import type { MemberRole } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireRole(session, "editor" as MemberRole);
  } catch (e: unknown) {
    const err = e as { message: string; statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { kind, data } = body;

  try {
    let ref;
    if (kind === "datalab_insight_card") {
      ref = await attachInsightCard(id, CANONICAL_WORKSPACE_ID, session!.user.id, data);
    } else if (kind === "energyscan_reference") {
      ref = await attachEnergyReference(id, CANONICAL_WORKSPACE_ID, session!.user.id, data);
    } else {
      return NextResponse.json({ error: "Unknown evidence kind" }, { status: 400 });
    }
    return NextResponse.json(ref, { status: 201 });
  } catch (err: unknown) {
    const error = err as { message: string };
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
