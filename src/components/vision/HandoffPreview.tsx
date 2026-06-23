"use client";
import type { HandoffPayload } from "@/lib/schemas/handoff";

interface Props {
  draftId: string;
  payload: HandoffPayload;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function HandoffPreview({ draftId: _draftId, payload, onConfirm, isLoading }: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 dark:border-border space-y-4">
      <h2 className="font-semibold text-lg">Previsualización del handoff</h2>
      <p className="text-sm text-muted-foreground">
        Este handoff creará un <strong>borrador</strong> en Nexus. No ejecuta operaciones.
      </p>
      <div className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">
        <pre>{JSON.stringify(payload, null, 2)}</pre>
      </div>
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Enviando…" : "Confirmar y enviar a Nexus"}
      </button>
    </div>
  );
}
