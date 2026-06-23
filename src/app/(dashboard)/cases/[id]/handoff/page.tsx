"use client";
import { useState } from "react";
import { HandoffPreview } from "@/components/vision/HandoffPreview";
import { HandoffStatus } from "@/components/vision/HandoffStatus";
import type { HandoffPayload } from "@/lib/schemas/handoff";

export default function HandoffPage({ params }: { params: { id: string } }) {
  const [step, setStep] = useState<"preview" | "status">("preview");
  const [draftId, setDraftId] = useState("");
  const [payload, setPayload] = useState<HandoffPayload | null>(null);
  const [status, setStatus] = useState<{
    status: string;
    requestId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPreview() {
    setLoading(true);
    const res = await fetch("/api/vision/handoff/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: params.id }),
    });
    const data = await res.json();
    setDraftId(data.draftId);
    setPayload(data.payload);
    setLoading(false);
  }

  async function confirmHandoff() {
    setLoading(true);
    const res = await fetch("/api/vision/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoffDraftId: draftId }),
    });
    const data = await res.json();
    setStatus({
      status: data.status,
      requestId: (data.response as Record<string, unknown>)?.request_id as string | undefined,
    });
    setStep("status");
    setLoading(false);
  }

  return (
    <main className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold mb-6">Handoff a Nexus</h1>
      {step === "preview" && !payload && (
        <button
          onClick={loadPreview}
          disabled={loading}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium"
        >
          {loading ? "Cargando…" : "Ver preview del handoff"}
        </button>
      )}
      {step === "preview" && payload && (
        <HandoffPreview
          draftId={draftId}
          payload={payload}
          onConfirm={confirmHandoff}
          isLoading={loading}
        />
      )}
      {step === "status" && status && (
        <HandoffStatus
          status={status.status}
          requestId={status.requestId}
          returnLink={`/cases/${params.id}`}
        />
      )}
    </main>
  );
}
