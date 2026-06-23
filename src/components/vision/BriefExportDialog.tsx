"use client";
import { useState } from "react";
import type { ContentBrief } from "@/lib/schemas/activation";

interface Props {
  caseId: string;
}

export function BriefExportDialog({ caseId }: Props) {
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/vision/cases/${caseId}/brief`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al exportar");
        return;
      }
      const data = await res.json();
      setBrief(data);
      setOpen(true);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={loading}
        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Exportando…" : "Exportar brief"}
      </button>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      {open && brief && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl border bg-card dark:border-border w-full max-w-2xl shadow-lg">
            <div className="flex items-center justify-between p-4 border-b dark:border-border">
              <h3 className="font-semibold">Content Brief — Vista previa</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Audiencia</dt>
                  <dd>{brief.audience}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Propuesta de valor</dt>
                  <dd>{brief.valueProposition}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">CTA</dt>
                  <dd>{brief.cta}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Canales</dt>
                  <dd>{brief.channels.join(", ")}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Evidencia permitida</dt>
                  <dd>
                    {brief.allowedEvidence.length === 0
                      ? "Ninguna"
                      : brief.allowedEvidence.join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Afirmaciones prohibidas</dt>
                  <dd>{brief.prohibitedClaims.join(", ")}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
