"use client";
import { useState } from "react";
import type { CaseBrief } from "@/lib/schemas/case";

interface Props {
  onSubmit: (brief: CaseBrief) => void;
}

export function CaseBriefForm({ onSubmit }: Props) {
  const [objetivo, setObjetivo] = useState("");
  const [responsable, setResponsable] = useState("");
  const [accion, setAccion] = useState("");
  const [kpiNombre, setKpiNombre] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!objetivo || !responsable || !accion || !kpiNombre) {
      setError("Objetivo, KPI, acción y responsable son obligatorios");
      return;
    }
    setError("");
    onSubmit({
      objetivo,
      supuestos: ["Por definir"],
      riesgos: ["Por definir"],
      evidenciaDisponible: [],
      evidenciaPendiente: [],
      appsImplicadas: ["nexus"],
      kpis: [{ nombre: kpiNombre }],
      proximoPaso: { accion, responsable },
      sensibilidad: "internal",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Objetivo
        <textarea
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          rows={2}
          className="rounded border p-2 bg-background text-foreground dark:border-border"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        KPI principal
        <input
          value={kpiNombre}
          onChange={(e) => setKpiNombre(e.target.value)}
          className="rounded border p-2 bg-background text-foreground dark:border-border"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Próximo paso
        <input
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
          className="rounded border p-2 bg-background text-foreground dark:border-border"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Responsable
        <input
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          className="rounded border p-2 bg-background text-foreground dark:border-border"
        />
      </label>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <button
        type="submit"
        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium hover:opacity-90"
      >
        Crear caso
      </button>
    </form>
  );
}
