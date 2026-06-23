"use client";
import { useState } from "react";
import type { FileManifest } from "@/lib/schemas/depth";

interface ManifestEntry {
  id: string;
  externalRef: string;
  hash?: string | null;
  sensitivity: string;
  createdAt: string;
}

interface Props {
  caseId: string;
  manifests?: ManifestEntry[];
  onAttach?: (manifest: FileManifest) => Promise<void>;
}

const SENSITIVITY_COLORS: Record<string, string> = {
  public: "bg-green-500/10 text-green-500",
  internal: "bg-blue-500/10 text-blue-500",
  confidential: "bg-yellow-500/10 text-yellow-600",
  restricted: "bg-red-500/10 text-red-500",
};

export function ManifestPanel({ caseId, manifests = [], onAttach }: Props) {
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleAttach() {
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const parsed = JSON.parse(json);
      const res = await fetch(`/api/vision/cases/${caseId}/manifest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error adjuntando manifiesto");
      setSuccess(true);
      setJson("");
      if (onAttach) await onAttach(parsed);
    } catch (e: unknown) {
      const err = e as { message: string };
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 dark:border-border space-y-4">
      <h3 className="font-semibold text-sm">Manifiestos FileStudio</h3>

      {manifests.length > 0 && (
        <ul className="space-y-2">
          {manifests.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted"
            >
              <div>
                <span className="font-mono text-muted-foreground">
                  {m.externalRef.slice(0, 16)}&hellip;
                </span>
                {m.hash && (
                  <span className="ml-2 text-muted-foreground">
                    sha: {m.hash.slice(0, 8)}&hellip;
                  </span>
                )}
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full font-medium text-[10px] ${SENSITIVITY_COLORS[m.sensitivity] ?? ""}`}
              >
                {m.sensitivity}
              </span>
            </li>
          ))}
        </ul>
      )}

      {manifests.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin manifiestos adjuntados.</p>
      )}

      {onAttach && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Pegar JSON del manifiesto:
          </label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={4}
            className="w-full rounded-lg border p-2 text-xs font-mono bg-background text-foreground dark:border-border focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder='{"contractVersion":"filestudio-manifest-v1",...}'
            aria-label="JSON del manifiesto FileStudio"
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          {success && (
            <p className="text-green-500 text-xs">Manifiesto adjuntado correctamente</p>
          )}
          <button
            onClick={handleAttach}
            disabled={loading || !json.trim()}
            className="rounded-lg bg-primary text-primary-foreground text-sm px-3 py-1.5 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Adjuntando…" : "Adjuntar manifiesto"}
          </button>
        </div>
      )}
    </div>
  );
}
