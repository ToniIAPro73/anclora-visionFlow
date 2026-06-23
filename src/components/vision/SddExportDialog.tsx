"use client";
import { useState } from "react";

interface Props {
  caseId: string;
}

export function SddExportDialog({ caseId }: Props) {
  const [document, setDocument] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/vision/cases/${caseId}/sdd`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al generar SDD");
        return;
      }
      const data = await res.json();
      setDocument(data.document);
      setPrUrl(data.prUrl ?? null);
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
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-lg border bg-card text-foreground px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 dark:border-border"
      >
        {loading ? "Generando SDD…" : "Generar SDD"}
      </button>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      {open && document && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl border bg-card dark:border-border w-full max-w-3xl shadow-lg">
            <div className="flex items-center justify-between p-4 border-b dark:border-border">
              <h3 className="font-semibold">Software Design Document</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="text-xs font-mono bg-muted rounded-lg p-4 whitespace-pre-wrap">
                {document}
              </pre>
              {prUrl && (
                <div className="mt-4">
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Ver PR en GitHub →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
