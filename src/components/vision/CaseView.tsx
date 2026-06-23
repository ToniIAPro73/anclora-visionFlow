"use client";

interface Props {
  caseData: {
    id: string;
    title: string;
    status: string;
    type: string;
    brief: unknown;
  };
  userRole?: string;
}

export function CaseView({ caseData, userRole }: Props) {
  const brief = caseData.brief as Record<string, unknown>;
  return (
    <div className="rounded-xl border bg-card p-6 dark:border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">{caseData.title}</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium uppercase">
          {caseData.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{String(brief.objetivo ?? "")}</p>
      {userRole && (
        <p className="text-xs text-muted-foreground mt-2">Rol: {userRole}</p>
      )}
    </div>
  );
}
