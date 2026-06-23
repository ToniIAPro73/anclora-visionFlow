import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { buildHandoffPayload } from "@/lib/handoff-builder";
import { signHandoffPayload } from "@/lib/handoff-signature";
import { db } from "@/lib/db";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import type { MemberRole } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    requireRole(session, "reviewer" as MemberRole);
  } catch (e: unknown) {
    const err = e as { message: string; statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
  }

  const { caseId } = await req.json();

  try {
    const payload = await buildHandoffPayload(caseId);

    // Compute signature (may fail if secret not set — return payload without it for preview)
    let signature = "";
    try {
      signature = signHandoffPayload(payload);
    } catch {
      /* preview without signature */
    }

    const draft = await db.handoffDraft.create({
      data: {
        caseId,
        workspaceId: CANONICAL_WORKSPACE_ID,
        payload: payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
        signature,
        idempotencyKey: payload.idempotencyKey,
        createdById: session!.user.id,
      },
    });

    return NextResponse.json({ draftId: draft.id, payload, signature }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { message: string };
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
