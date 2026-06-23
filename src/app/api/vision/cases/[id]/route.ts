import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { transitionCase } from "@/lib/case-service";
import { TransitionSchema, CaseBriefSchema } from "@/lib/schemas/case";
import { db } from "@/lib/db";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import type { MemberRole, CaseStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const c = await db.case.findFirst({
    where: { id, workspaceId: CANONICAL_WORKSPACE_ID },
    include: {
      mapVersions: { orderBy: { version: "desc" }, take: 1 },
      evidences: true,
    },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Transition request
  if (body.to) {
    const parsed = TransitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
    }
    // reviewer required for approve/handoff, editor for review
    const minRole: MemberRole =
      parsed.data.to === "approved" || parsed.data.to === "handed_off"
        ? "reviewer"
        : "editor";
    try {
      requireRole(session, minRole);
    } catch (e: unknown) {
      const err = e as { message: string; statusCode?: number };
      return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
    }
    try {
      const updated = await transitionCase(
        id,
        parsed.data.to as CaseStatus,
        session.user.id,
        session.user.role,
        parsed.data.motivo
      );
      return NextResponse.json(updated);
    } catch (e: unknown) {
      const err = e as { message: string };
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  // Brief update
  if (body.brief) {
    try {
      requireRole(session, "editor" as MemberRole);
    } catch (e: unknown) {
      const err = e as { message: string; statusCode?: number };
      return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
    }
    const parsed = CaseBriefSchema.safeParse(body.brief);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid brief", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const updated = await db.case.update({ where: { id }, data: { brief: parsed.data } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
}
