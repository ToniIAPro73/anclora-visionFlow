import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { buildBriefExport } from "@/lib/brief-export";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import type { MemberRole } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireRole(session, "reviewer" as MemberRole);
  } catch (e: unknown) {
    const err = e as { message: string; statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
  }

  const { id } = await params;
  try {
    const brief = await buildBriefExport(id, CANONICAL_WORKSPACE_ID, session!.user.id);
    return NextResponse.json(brief, { status: 201 });
  } catch (err: unknown) {
    const error = err as { message: string };
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
