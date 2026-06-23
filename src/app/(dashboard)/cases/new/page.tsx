"use client";
import { useState } from "react";
import { CaseTemplatePicker } from "@/components/vision/CaseTemplatePicker";
import { CaseBriefForm } from "@/components/vision/CaseBriefForm";
import type { CaseTemplate } from "@/lib/case-templates";
import type { CaseBrief } from "@/lib/schemas/case";

export default function NewCasePage() {
  const [step, setStep] = useState<"template" | "brief">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [templates] = useState<CaseTemplate[]>([]);

  async function handleBriefSubmit(brief: CaseBrief) {
    if (!selectedTemplate) return;
    await fetch("/api/vision/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: selectedTemplate.type,
        templateSlug: selectedTemplate.slug,
        title: brief.objetivo.slice(0, 60),
        brief,
      }),
    });
    window.location.href = "/cases";
  }

  return (
    <main className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold mb-6">Nuevo caso</h1>
      {step === "template" ? (
        <>
          <p className="text-muted-foreground mb-4">
            Selecciona una plantilla para comenzar
          </p>
          <CaseTemplatePicker
            templates={templates}
            onSelect={(t) => {
              setSelectedTemplate(t);
              setStep("brief");
            }}
          />
        </>
      ) : (
        <>
          <p className="text-muted-foreground mb-4">
            Plantilla: <strong>{selectedTemplate?.name}</strong>
          </p>
          <CaseBriefForm onSubmit={handleBriefSubmit} />
        </>
      )}
    </main>
  );
}
