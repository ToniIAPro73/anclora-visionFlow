import { createHmac } from "crypto";

export function signHandoffPayload(payload: object): string {
  const secret = process.env.NEXUS_HANDOFF_HMAC_SECRET;
  if (!secret) throw new Error("NEXUS_HANDOFF_HMAC_SECRET not configured");
  const canonical = JSON.stringify(
    payload,
    Object.keys(payload as Record<string, unknown>).sort()
  );
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function verifyHandoffSignature(payload: object, signature: string): boolean {
  try {
    const expected = signHandoffPayload(payload);
    return expected === signature;
  } catch {
    return false;
  }
}
