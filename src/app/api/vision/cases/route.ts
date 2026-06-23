import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { createCase } from "@/lib/case-service";
import { CreateCaseSchema } from "@/lib/schemas/case";
import { db } from "@/lib/db";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import type { MemberRole } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    requireRole(session, "editor" as MemberRole);
  } catch (e: unknown) {
    const err = e as { message: string; statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
  }

  const body = await req.json();
  const parsed = CreateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const newCase = await createCase(parsed.data, session!.user.id);
  return NextResponse.json(newCase, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const cases = await db.case.findMany({
    where: {
      workspaceId: CANONICAL_WORKSPACE_ID,
      ...(type ? { type: type as import("@prisma/client").CaseType } : {}),
      ...(status ? { status: status as import("@prisma/client").CaseStatus } : {}),
    },
    include: { mapVersions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ cases });
}
