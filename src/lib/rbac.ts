import type { MemberRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  viewer: 0,
  editor: 1,
  reviewer: 2,
  admin: 3,
};

export function hasRole(userRole: string, minRole: MemberRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as MemberRole] ?? -1;
  const minLevel = ROLE_HIERARCHY[minRole];
  return userLevel >= minLevel;
}

export function requireRole(
  session: { user: { role: string } } | null,
  minRole: MemberRole
): void {
  if (!session) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  if (!hasRole(session.user.role, minRole))
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
}
