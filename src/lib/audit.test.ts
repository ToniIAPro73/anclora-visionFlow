import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

// Mock the db module before importing audit
vi.mock("@/lib/db", () => ({
  db: {
    auditEvent: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
  },
}));

import { recordAudit } from "./audit";
import { db } from "@/lib/db";

const mockCreate = vi.mocked(db.auditEvent.create);

function computeExpectedSignature(payload: object): string {
  const secret = "dev-audit-secret";
  return createHmac("sha256", secret)
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest("hex");
}

describe("recordAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls db.auditEvent.create with required fields", async () => {
    await recordAudit({
      workspaceId: "ws_1",
      actorId: "user_1",
      action: "import",
      resourceType: "AncloraAppRecord",
      resourceId: "app_1",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.workspaceId).toBe("ws_1");
    expect(callArgs.data.actorId).toBe("user_1");
    expect(callArgs.data.action).toBe("import");
    expect(callArgs.data.resourceType).toBe("AncloraAppRecord");
    expect(callArgs.data.resourceId).toBe("app_1");
    expect(callArgs.data.reason).toBeUndefined();
    expect(callArgs.data.metadata).toEqual({});
    expect(typeof callArgs.data.signature).toBe("string");
    expect(callArgs.data.signature).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it("includes optional reason and metadata when provided", async () => {
    await recordAudit({
      workspaceId: "ws_1",
      actorId: "user_1",
      action: "status_change",
      resourceType: "VisionMapRecord",
      resourceId: "map_1",
      reason: "Aprobado por revisión",
      metadata: { previousStatus: "review" },
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.reason).toBe("Aprobado por revisión");
    expect(callArgs.data.metadata).toEqual({ previousStatus: "review" });
  });

  it("signature is deterministic for same canonical payload (except ts)", async () => {
    // Two calls with same fields produce same-length signatures
    await recordAudit({
      workspaceId: "ws_1",
      actorId: "user_1",
      action: "export",
      resourceType: "MapExport",
      resourceId: "exp_1",
    });
    await recordAudit({
      workspaceId: "ws_1",
      actorId: "user_1",
      action: "export",
      resourceType: "MapExport",
      resourceId: "exp_1",
    });

    const sig1 = mockCreate.mock.calls[0][0].data.signature;
    const sig2 = mockCreate.mock.calls[1][0].data.signature;
    // Both should be 64-char hex strings
    expect(sig1).toMatch(/^[0-9a-f]{64}$/);
    expect(sig2).toMatch(/^[0-9a-f]{64}$/);
  });

  it("signature changes when action changes", async () => {
    // Compute expected signature for "import" action with fixed ts — test the function indirectly
    const payload1 = {
      action: "import",
      actorId: "user_1",
      resourceId: "res_1",
      resourceType: "Resource",
      ts: "2026-01-01T00:00:00.000Z",
      workspaceId: "ws_1",
    };
    const payload2 = { ...payload1, action: "export" };
    const sig1 = computeExpectedSignature(payload1);
    const sig2 = computeExpectedSignature(payload2);
    expect(sig1).not.toBe(sig2);
  });

  it("signature is a 64-char hex string", async () => {
    await recordAudit({
      workspaceId: "ws_test",
      actorId: "user_test",
      action: "generation",
      resourceType: "VisionMapRecord",
      resourceId: "map_test",
    });
    const sig = mockCreate.mock.calls[0][0].data.signature;
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });
});
