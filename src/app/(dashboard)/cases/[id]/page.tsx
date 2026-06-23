export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import { CaseView } from "@/components/vision/CaseView";
import { notFound } from "next/navigation";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await db.case.findFirst({
    where: { id, workspaceId: CANONICAL_WORKSPACE_ID },
  });
  if (!c) notFound();
  return (
    <main className="p-6 overflow-y-auto h-full">
      <CaseView caseData={c as Parameters<typeof CaseView>[0]["caseData"]} />
    </main>
  );
}
