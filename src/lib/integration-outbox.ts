import { db } from "@/lib/db";
import type { HandoffPayload } from "@/lib/schemas/handoff";
import { signHandoffPayload } from "@/lib/handoff-signature";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function createAndSendDelivery(
  handoffDraftId: string,
  payload: HandoffPayload
): Promise<{ status: string; response: unknown }> {
  const endpoint = process.env.NEXUS_WEBHOOK_URL ?? "";

  const delivery = await db.integrationDelivery.create({
    data: {
      handoffDraftId,
      target: "nexus",
      endpoint: endpoint || "mock",
      status: "pending",
    },
  });

  // Mock response if no endpoint configured
  if (!endpoint) {
    const mockResponse = {
      status: "accepted",
      request_id: `mock-${Date.now()}`,
      idempotent: false,
    };
    await db.integrationDelivery.update({
      where: { id: delivery.id },
      data: { status: "acknowledged", response: mockResponse, attempts: 1 },
    });
    return { status: "acknowledged", response: mockResponse };
  }

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let signature: string;
      try {
        signature = signHandoffPayload(payload);
      } catch {
        signature = "";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXUS_INTERNAL_API_KEY ?? "",
          "x-vf-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await res.json();

      await db.integrationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: res.ok ? "acknowledged" : "failed",
          response: responseBody,
          attempts: attempt,
          lastError: res.ok ? null : JSON.stringify(responseBody),
        },
      });

      if (res.ok) return { status: "acknowledged", response: responseBody };
      lastError = JSON.stringify(responseBody);
    } catch (err: unknown) {
      const error = err as { message: string };
      lastError = error.message;
      await db.integrationDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: attempt,
          lastError,
          status: attempt < 3 ? "pending" : "failed",
        },
      });
      if (attempt < 3) {
        await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500);
      }
    }
  }

  return { status: "failed", response: { error: lastError } };
}
