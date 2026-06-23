"use client";
import { useSession } from "next-auth/react";

export function WorkspaceRoleBadge() {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <span
      aria-label={`Rol en workspace: ${session.user.role}`}
      className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium"
    >
      {session.user.role}
    </span>
  );
}
