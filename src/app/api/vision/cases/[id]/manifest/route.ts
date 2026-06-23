import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { attachManifest } from "@/lib/evidence";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import type { MemberRole } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    requireRole(session, "editor" as MemberRole);
  } catch (e: unknown) {
    const err = e as { message: string; statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const ref = await attachManifest(id, CANONICAL_WORKSPACE_ID, session!.user.id, body);
    return NextResponse.json(ref, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
