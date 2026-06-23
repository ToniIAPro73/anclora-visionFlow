import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { createAndSendDelivery } from "@/lib/integration-outbox";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import type { MemberRole } from "@prisma/client";
import type { HandoffPayload } from "@/lib/schemas/handoff";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    requireRole(session, "reviewer" as MemberRole);
  } catch (e: unknown) {
    const err = e as { message: string; statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
  }

  const { handoffDraftId } = await req.json();

  const draft = await db.handoffDraft.findUnique({ where: { id: handoffDraftId } });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  // Mark as confirmed
  await db.handoffDraft.update({
    where: { id: handoffDraftId },
    data: { confirmedById: session!.user.id },
  });

  const result = await createAndSendDelivery(
    handoffDraftId,
    draft.payload as unknown as HandoffPayload
  );

  if (result.status === "acknowledged") {
    // Transition case to handed_off
    await db.case.update({ where: { id: draft.caseId }, data: { status: "handed_off" } });
    await recordAudit({
      workspaceId: CANONICAL_WORKSPACE_ID,
      actorId: session!.user.id,
      action: "handoff",
      resourceType: "Case",
      resourceId: draft.caseId,
      metadata: { handoffDraftId, deliveryStatus: result.status },
    });
  }

  return NextResponse.json(result);
}
