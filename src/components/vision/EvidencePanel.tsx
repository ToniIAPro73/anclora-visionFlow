"use client";

interface EvidenceRef {
  id: string;
  source: string;
  externalRef: string;
  sensitivity: string;
  kind: string;
  reviewState: string;
  issuedAt: string | null;
  expiresAt: string | null;
}

interface Props {
  evidences: EvidenceRef[];
}

const SENSITIVITY_CLASSES: Record<string, string> = {
  public: "bg-green-500/10 text-green-500",
  internal: "bg-blue-500/10 text-blue-400",
  confidential: "bg-yellow-500/10 text-yellow-500",
  restricted: "bg-destructive/10 text-destructive",
};

export function EvidencePanel({ evidences }: Props) {
  if (evidences.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 dark:border-border">
        <p className="text-sm text-muted-foreground">No hay evidencias adjuntas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card dark:border-border overflow-hidden">
      <div className="px-4 py-3 border-b dark:border-border">
        <h3 className="font-semibold text-sm">Evidencias ({evidences.length})</h3>
      </div>
      <ul className="divide-y dark:divide-border">
        {evidences.map((e) => {
          const isExpired = e.expiresAt && new Date(e.expiresAt) < new Date();
          return (
            <li key={e.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.externalRef}</p>
                <p className="text-xs text-muted-foreground">{e.source} · {e.kind}</p>
                {isExpired && (
                  <p className="text-xs text-destructive mt-0.5">Expirada</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    SENSITIVITY_CLASSES[e.sensitivity] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {e.sensitivity}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
