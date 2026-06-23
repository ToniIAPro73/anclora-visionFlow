import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { reindexAll } from "@/lib/rag/indexer";
import type { MemberRole } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const session = await getSession();
  try {
    requireRole(session, "admin" as MemberRole);
  } catch (e: unknown) {
    const err = e as { message: string; statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 403 });
  }

  try {
    const result = await reindexAll(session!.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
