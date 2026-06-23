export const CANONICAL_WORKSPACE_ID = "workspace_anclora_internal";
export const CANONICAL_WORKSPACE_SLUG = "anclora-internal";
export const CANONICAL_WORKSPACE_NAME = "Anclora Internal";

export const WORKSPACE_ROLES = ["viewer", "editor", "reviewer", "admin"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const VISION_MAP_STATUSES = [
  "draft",
  "review",
  "approved",
  "handed_off",
  "archived",
] as const;
export type VisionMapStatus = (typeof VISION_MAP_STATUSES)[number];

export const CATALOG_STATUSES = ["active", "archived"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export function resolveServerWorkspaceId(): string {
  return CANONICAL_WORKSPACE_ID;
}

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === "string" && WORKSPACE_ROLES.includes(value as WorkspaceRole);
}

export function isVisionMapStatus(value: unknown): value is VisionMapStatus {
  return (
    typeof value === "string" &&
    VISION_MAP_STATUSES.includes(value as VisionMapStatus)
  );
}

export function isCatalogStatus(value: unknown): value is CatalogStatus {
  return typeof value === "string" && CATALOG_STATUSES.includes(value as CatalogStatus);
}
