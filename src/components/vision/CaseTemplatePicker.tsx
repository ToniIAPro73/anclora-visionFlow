"use client";
import type { CaseTemplate } from "@/lib/case-templates";

interface Props {
  templates: CaseTemplate[];
  onSelect: (t: CaseTemplate) => void;
}

export function CaseTemplatePicker({ templates, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => (
        <button
          key={t.slug}
          onClick={() => onSelect(t)}
          className="p-4 rounded-xl border bg-card hover:bg-accent text-left transition-colors dark:border-border"
        >
          <h3 className="font-semibold text-sm">{t.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
          <div className="flex gap-1 flex-wrap mt-2">
            {t.appsImplicadas.map((a) => (
              <span
                key={a}
                className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
              >
                {a}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
