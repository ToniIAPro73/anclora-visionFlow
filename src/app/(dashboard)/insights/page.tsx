import { getTemplateMetrics } from "@/lib/metrics";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  let metrics;
  try {
    metrics = await getTemplateMetrics(CANONICAL_WORKSPACE_ID);
  } catch {
    metrics = { overall: { total: 0, approved: 0, handedOff: 0 }, byTemplate: [] };
  }

  const approvalRate =
    metrics.overall.total > 0
      ? Math.round((metrics.overall.approved / metrics.overall.total) * 100)
      : 0;
  const handoffRate =
    metrics.overall.approved > 0
      ? Math.round((metrics.overall.handedOff / metrics.overall.approved) * 100)
      : 0;

  return (
    <main className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold mb-2">Panel de aprendizaje</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Solo métricas agregadas — sin PII
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border bg-card p-4 dark:border-border">
          <p className="text-xs text-muted-foreground">Total casos</p>
          <p className="text-3xl font-bold mt-1">{metrics.overall.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 dark:border-border">
          <p className="text-xs text-muted-foreground">Tasa de aprobación</p>
          <p className="text-3xl font-bold mt-1 text-primary">{approvalRate}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4 dark:border-border">
          <p className="text-xs text-muted-foreground">Aprobados con handoff</p>
          <p className="text-3xl font-bold mt-1 text-green-500">{handoffRate}%</p>
        </div>
      </div>

      {metrics.byTemplate.length > 0 ? (
        <div>
          <h2 className="font-semibold text-sm mb-3">Por plantilla</h2>
          <div className="rounded-xl border bg-card overflow-hidden dark:border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Plantilla
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                    Casos
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                    Aprobados
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                    Tasa
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                    Retrabajo avg
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                    Evidencias avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.byTemplate.map((t, i) => (
                  <tr key={t.templateSlug} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="p-3 font-mono text-xs">{t.templateSlug}</td>
                    <td className="p-3 text-right">{t.totalCases}</td>
                    <td className="p-3 text-right">{t.approvedCases}</td>
                    <td className="p-3 text-right text-primary font-medium">
                      {t.approvalRate}%
                    </td>
                    <td className="p-3 text-right">{t.avgRework}</td>
                    <td className="p-3 text-right">{t.avgEvidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sin datos de plantillas aún. Los datos aparecerán a medida que los casos avancen.
        </p>
      )}
    </main>
  );
}
