export type ProposalStatus =
  | "draft"
  | "review"
  | "approved"
  | "handed_off"
  | "archived";

const TRANSITIONS: Record<
  ProposalStatus,
  { to: ProposalStatus; minRole: string }[]
> = {
  draft: [{ to: "review", minRole: "editor" }],
  review: [
    { to: "approved", minRole: "reviewer" },
    { to: "draft", minRole: "reviewer" },
  ],
  approved: [
    { to: "handed_off", minRole: "reviewer" },
    { to: "archived", minRole: "admin" },
  ],
  handed_off: [{ to: "archived", minRole: "admin" }],
  archived: [],
};

const ROLE_HIERARCHY = ["viewer", "editor", "reviewer", "admin"];

function isRoleAtLeast(role: string, minRole: string): boolean {
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole);
}

export function canTransition(
  from: ProposalStatus,
  to: ProposalStatus,
  role: string
): boolean {
  const allowed = TRANSITIONS[from] ?? [];
  return allowed.some((t) => t.to === to && isRoleAtLeast(role, t.minRole));
}

export function transition(
  from: ProposalStatus,
  to: ProposalStatus,
  role: string,
  _motivo?: string
): ProposalStatus {
  if (!canTransition(from, to, role)) {
    throw new Error(`Transición inválida: ${from} → ${to} para rol ${role}`);
  }
  return to;
}
