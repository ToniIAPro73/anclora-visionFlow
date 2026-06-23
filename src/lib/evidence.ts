import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { InsightCardSchema, EnergyReferenceSchema } from "@/lib/schemas/activation";
import { FileManifestSchema } from "@/lib/schemas/depth";
import type { EvidenceKind, EvidenceSensitivity } from "@prisma/client";

export async function attachInsightCard(
  caseId: string,
  workspaceId: string,
  actorId: string,
  cardData: unknown
) {
  const parsed = InsightCardSchema.safeParse(cardData);
  if (!parsed.success) {
    throw new Error("Invalid insight card: " + JSON.stringify(parsed.error.issues));
  }

  const card = parsed.data;

  // Check expiry
  if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
    throw new Error("Evidence card has expired");
  }

  const ref = await db.evidenceReference.create({
    data: {
      caseId,
      source: "data-lab",
      externalRef: card.cardId,
      hash: card.version,
      sensitivity: "internal",
      kind: "datalab_insight_card" as EvidenceKind,
      sourceVersion: card.version,
      issuedAt: new Date(card.issuedAt),
      expiresAt: card.expiresAt ? new Date(card.expiresAt) : undefined,
      reviewState: "approved",
    },
  });

  await recordAudit({
    workspaceId,
    actorId,
    action: "import",
    resourceType: "EvidenceReference",
    resourceId: ref.id,
    metadata: { kind: "datalab_insight_card", cardId: card.cardId },
  });

  return ref;
}

export async function attachEnergyReference(
  caseId: string,
  workspaceId: string,
  actorId: string,
  refData: unknown
) {
  const parsed = EnergyReferenceSchema.safeParse(refData);
  if (!parsed.success) {
    throw new Error("Invalid energy reference: " + JSON.stringify(parsed.error.issues));
  }

  const ref = parsed.data;

  const evidence = await db.evidenceReference.create({
    data: {
      caseId,
      source: "energyscan",
      externalRef: ref.assessmentId,
      sensitivity: "internal",
      kind: "energyscan_reference" as EvidenceKind,
      sourceVersion: ref.scenarioId,
      issuedAt: new Date(ref.issuedAt),
      reviewState: "approved",
    },
  });

  await recordAudit({
    workspaceId,
    actorId,
    action: "import",
    resourceType: "EvidenceReference",
    resourceId: evidence.id,
    metadata: { kind: "energyscan_reference", assessmentId: ref.assessmentId },
  });

  return evidence;
}

export async function attachManifest(
  caseId: string,
  workspaceId: string,
  actorId: string,
  manifestData: unknown
) {
  const parsed = FileManifestSchema.safeParse(manifestData);
  if (!parsed.success) {
    throw new Error("Invalid FileStudio manifest: " + JSON.stringify(parsed.error.issues));
  }

  const manifest = parsed.data;

  // Security gate: manifests that require exif stripping must have it confirmed
  if (!manifest.exifStripped) {
    throw new Error("Manifest rejected: exifStripped must be true (EXIF must be removed at origin)");
  }

  const ref = await db.evidenceReference.create({
    data: {
      caseId,
      source: "filestudio",
      externalRef: manifest.manifestId,
      hash: manifest.sha256,
      sensitivity: manifest.classification as EvidenceSensitivity,
      kind: "filestudio_manifest" as EvidenceKind,
      sourceVersion: manifest.sha256.slice(0, 12),
      issuedAt: new Date(manifest.issuedAt),
      reviewState: manifest.classification === "restricted" ? "pending" : "approved",
    },
  });

  await recordAudit({
    workspaceId,
    actorId,
    action: "import",
    resourceType: "EvidenceReference",
    resourceId: ref.id,
    metadata: {
      kind: "filestudio_manifest",
      manifestId: manifest.manifestId,
      classification: manifest.classification,
      ocrAvailable: manifest.ocrAvailable,
      hasPermittedExtract: Boolean(manifest.permittedExtract),
    },
  });

  return ref;
}
