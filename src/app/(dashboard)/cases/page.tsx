export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";
import { CaseView } from "@/components/vision/CaseView";

export default async function CasesPage() {
  const cases = await db.case.findMany({
    where: { workspaceId: CANONICAL_WORKSPACE_ID },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold mb-6">Casos</h1>
      {cases.length === 0 ? (
        <p className="text-muted-foreground">
          No hay casos.{" "}
          <a href="/cases/new" className="text-primary underline">
            Crear el primero
          </a>
        </p>
      ) : (
        <div className="grid gap-4">
          {cases.map((c) => (
            <CaseView key={c.id} caseData={c as Parameters<typeof CaseView>[0]["caseData"]} />
          ))}
        </div>
      )}
    </main>
  );
}
