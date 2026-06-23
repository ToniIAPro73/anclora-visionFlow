import { db } from "@/lib/db";

export async function upsertCaseMetric(
  caseId: string,
  workspaceId: string,
  templateSlug: string
) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { evidences: true },
  });
  if (!c) return;

  const reachedApproved =
    c.status === "approved" || c.status === "handed_off" || c.status === "archived";
  const handedOff = c.status === "handed_off";

  await db.caseMetric.upsert({
    where: { caseId },
    create: {
      caseId,
      workspaceId,
      templateSlug,
      reachedApproved,
      handedOff,
      evidenceCount: c.evidences.length,
    },
    update: {
      reachedApproved,
      handedOff,
      evidenceCount: c.evidences.length,
    },
  });
}

export async function getTemplateMetrics(workspaceId: string) {
  const metrics = await db.caseMetric.groupBy({
    by: ["templateSlug"],
    where: { workspaceId },
    _count: { caseId: true },
    _sum: { reworkCount: true, evidenceCount: true },
    _avg: { reworkCount: true, evidenceCount: true },
  });

  // Prisma does not support _sum on boolean fields — use count queries instead
  const [totalCount, approvedCount, handedOffCount] = await Promise.all([
    db.caseMetric.count({ where: { workspaceId } }),
    db.caseMetric.count({ where: { workspaceId, reachedApproved: true } }),
    db.caseMetric.count({ where: { workspaceId, handedOff: true } }),
  ]);

  const byTemplate = await Promise.all(
    metrics.map(async (m) => {
      const approved = await db.caseMetric.count({
        where: { workspaceId, templateSlug: m.templateSlug, reachedApproved: true },
      });
      const total = m._count.caseId ?? 0;
      return {
        templateSlug: m.templateSlug,
        totalCases: total,
        approvedCases: approved,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        avgRework: Math.round((m._avg.reworkCount ?? 0) * 10) / 10,
        avgEvidence: Math.round((m._avg.evidenceCount ?? 0) * 10) / 10,
      };
    })
  );

  return {
    overall: {
      total: totalCount,
      approved: approvedCount,
      handedOff: handedOffCount,
    },
    byTemplate,
  };
}
