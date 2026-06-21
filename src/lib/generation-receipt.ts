import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { VisionMap } from "@/lib/vision-map";

const RECEIPT_VERSION = "g1";
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const BOOT_SECRET = randomBytes(32).toString("hex");

export interface GenerationReceiptPayload {
  v: 1;
  promptVersion: string;
  llmModel: string;
  tokensUsed: number | null;
  issuedAt: string;
  expiresAt: string;
  mapHash: string;
  nonce: string;
}

export interface VerifiedGenerationMetadata {
  promptVersion: string | null;
  llmModel: string | null;
  tokensUsed: number | null;
}

interface ReceiptOptions {
  now?: number;
  ttlMs?: number;
  secret?: string;
}

const NULL_METADATA: VerifiedGenerationMetadata = {
  promptVersion: null,
  llmModel: null,
  tokensUsed: null,
};

export function createGenerationReceipt(
  map: VisionMap,
  metadata: Pick<GenerationReceiptPayload, "promptVersion" | "llmModel" | "tokensUsed">,
  options: ReceiptOptions = {}
): string {
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const payload: GenerationReceiptPayload = {
    v: 1,
    promptVersion: metadata.promptVersion,
    llmModel: metadata.llmModel,
    tokensUsed: metadata.tokensUsed,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    mapHash: hashVisionMapForReceipt(map),
    nonce: randomBytes(16).toString("hex"),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${RECEIPT_VERSION}.${encodedPayload}.${sign(encodedPayload, options.secret)}`;
}

export function getVerifiedGenerationMetadata(
  map: VisionMap,
  receipt: unknown,
  options: ReceiptOptions = {}
): VerifiedGenerationMetadata {
  const payload = verifyGenerationReceipt(map, receipt, options);
  if (!payload) {
    return { ...NULL_METADATA };
  }
  return {
    promptVersion: payload.promptVersion,
    llmModel: payload.llmModel,
    tokensUsed: payload.tokensUsed,
  };
}

export function verifyGenerationReceipt(
  map: VisionMap,
  receipt: unknown,
  options: ReceiptOptions = {}
): GenerationReceiptPayload | null {
  if (typeof receipt !== "string") {
    return null;
  }

  const [version, encodedPayload, signature, extra] = receipt.split(".");
  if (version !== RECEIPT_VERSION || !encodedPayload || !signature || extra) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, options.secret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  let payload: GenerationReceiptPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as GenerationReceiptPayload;
  } catch {
    return null;
  }

  if (!isValidPayloadShape(payload)) {
    return null;
  }

  const now = options.now ?? Date.now();
  const issuedAt = Date.parse(payload.issuedAt);
  const expiresAt = Date.parse(payload.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    return null;
  }
  if (expiresAt <= issuedAt || now > expiresAt) {
    return null;
  }
  if (payload.mapHash !== hashVisionMapForReceipt(map)) {
    return null;
  }

  return payload;
}

export function hashVisionMapForReceipt(map: VisionMap): string {
  const auditableMap = {
    idea: map.idea,
    summary: map.summary,
    nodes: map.nodes,
    connections: map.connections,
    apps: map.apps,
    generatedAt: map.generatedAt,
    palette: map.palette,
  };
  return createHash("sha256")
    .update(stableStringify(auditableMap))
    .digest("base64url");
}

function isValidPayloadShape(payload: GenerationReceiptPayload): boolean {
  return (
    payload?.v === 1 &&
    typeof payload.promptVersion === "string" &&
    typeof payload.llmModel === "string" &&
    (payload.tokensUsed === null ||
      (Number.isInteger(payload.tokensUsed) && payload.tokensUsed >= 0)) &&
    typeof payload.issuedAt === "string" &&
    typeof payload.expiresAt === "string" &&
    typeof payload.mapHash === "string" &&
    typeof payload.nonce === "string"
  );
}

function sign(encodedPayload: string, secret?: string): string {
  return createHmac("sha256", secret ?? getReceiptSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getReceiptSecret(): string {
  return process.env.VISIONFLOW_GENERATION_RECEIPT_SECRET ?? BOOT_SECRET;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
