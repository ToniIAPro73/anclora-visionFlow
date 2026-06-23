import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const delivery = await db.integrationDelivery.findUnique({
    where: { id },
    include: { handoffDraft: true },
  });
  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(delivery);
}
