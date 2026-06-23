import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { Prisma, type AuditAction } from "@prisma/client";

function computeSignature(payload: object): string {
  const secret = process.env.AUDIT_HMAC_SECRET || "dev-audit-secret";
  return createHmac("sha256", secret)
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest("hex");
}

export async function recordAudit(params: {
  workspaceId: string;
  actorId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const canonical = {
    workspaceId: params.workspaceId,
    actorId: params.actorId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    ts: new Date().toISOString(),
  };
  const signature = computeSignature(canonical);
  await db.auditEvent.create({
    data: {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      reason: params.reason,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      signature,
    },
  });
}
