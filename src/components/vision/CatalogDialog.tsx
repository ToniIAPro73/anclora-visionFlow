"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Database,
  ExternalLink,
  Github,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface CatalogAppItem {
  id?: string;
  slug: string;
  name: string;
  family: string;
  tagline: string;
  description: string;
  stack: string[];
  capabilities: string[];
  accent: string;
  domain: string;
  source?: string;
  githubUrl?: string | null;
  updatedAt?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCatalogChanged?: () => void;
}

export function CatalogDialog({ open, onOpenChange, onCatalogChanged }: Props) {
  const [apps, setApps] = useState<CatalogAppItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<CatalogAppItem>>({});
  const [importing, setImporting] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const txtFileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vision/catalog", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setApps(data.apps || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const filtered = apps.filter((a) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q) ||
      a.tagline.toLowerCase().includes(q) ||
      a.capabilities.some((c) => c.toLowerCase().includes(q))
    );
  });

  const startEdit = (app: CatalogAppItem) => {
    setEditingId(app.id || app.slug);
    setEditDraft({
      name: app.name,
      tagline: app.tagline,
      description: app.description,
      family: app.family,
      accent: app.accent,
      domain: app.domain,
      stack: [...app.stack],
      capabilities: [...app.capabilities],
      githubUrl: app.githubUrl || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async (app: CatalogAppItem) => {
    if (!app.id) {
      toast.error("Solo se pueden editar apps guardadas en la base de datos.");
      return;
    }
    try {
      const res = await fetch("/api/vision/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id, fields: editDraft }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success(`${app.name} actualizado`);
      cancelEdit();
      await refresh();
      onCatalogChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (app: CatalogAppItem) => {
    if (!app.id) {
      toast.error("Esta app es un default y no se puede eliminar.");
      return;
    }
    if (!confirm(`¿Eliminar "${app.name}" del catálogo?`)) return;
    try {
      const res = await fetch(`/api/vision/catalog/${app.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success(`${app.name} eliminada`);
      await refresh();
      onCatalogChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const handleImportTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImporting(true);
    try {
      const filePayload: Array<{ filename: string; content: string }> = [];
      for (const f of files) {
        // Read first 200KB — the README heading can be ~120KB into the file
        // because the .txt dumps start with a long directory tree.
        const slice = f.slice(0, 200_000);
        const content = await slice.text();
        filePayload.push({ filename: f.name, content });
      }
      const res = await fetch("/api/vision/catalog/import-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: filePayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en la importación");
      const ok = data.imported?.length || 0;
      const errs = data.errors?.length || 0;
      if (ok > 0) toast.success(`${ok} app(s) importada(s) desde .txt`);
      if (errs > 0) toast.warning(`${errs} archivo(s) con errores`);
      if (ok === 0 && errs === 0) toast.info("No se importó nada");
      await refresh();
      onCatalogChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setImporting(false);
      if (txtFileRef.current) txtFileRef.current.value = "";
    }
  };

  const handleImportGithub = async () => {
    const url = githubUrl.trim();
    if (!url) {
      toast.error("Pega una URL de GitHub primero");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/vision/catalog/import-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en la importación");
      const ok = data.imported?.length || 0;
      const errs = data.errors?.length || 0;
      if (ok > 0) {
        toast.success(`${ok} app(s) importada(s) desde GitHub`);
        setGithubUrl("");
      }
      if (errs > 0) toast.error(data.errors[0]);
      await refresh();
      onCatalogChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[80] ${
          open ? "flex" : "hidden"
        } items-center justify-center p-4 bg-black/70 backdrop-blur-sm`}
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="glass-strong border border-border/60 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1dab89] via-[#6C48C5] to-[#D4AF37] flex items-center justify-center">
                <Database size={16} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-base flex items-center gap-2">
                  Catálogo del ecosistema Anclora
                  <Badge variant="secondary" className="text-[10px]">
                    {apps.length}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Importa, edita y mantén actualizadas las apps que el LLM usa al generar mapas
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline ml-1">Refrescar</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Import bar */}
          <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Import .txt */}
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Importar desde .txt
                </div>
                <div className="text-[11px] text-muted-foreground/80 mb-2 leading-snug">
                  Sube uno o varios .txt con el contenido de un repo Anclora (README + AGENTS.md).
                </div>
                <input
                  ref={txtFileRef}
                  type="file"
                  accept=".txt,text/plain"
                  multiple
                  className="hidden"
                  onChange={handleImportTxt}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8"
                  disabled={importing}
                  onClick={() => txtFileRef.current?.click()}
                >
                  <Upload size={13} />
                  <span className="ml-1">
                    {importing ? "Importando…" : "Subir .txt (uno o varios)"}
                  </span>
                </Button>
              </div>

              {/* Import from GitHub URL */}
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Importar desde GitHub
                </div>
                <div className="text-[11px] text-muted-foreground/80 mb-2 leading-snug">
                  Pega la URL del repo (lee README.md, AGENTS.md y MEMORY.md).
                </div>
                <div className="flex gap-1.5">
                  <Input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/ToniIAPro73/anclora-nexus"
                    className="h-8 text-xs"
                    disabled={importing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleImportGithub();
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-gradient-to-r from-[#1dab89] to-[#6C48C5] text-white border-0"
                    disabled={importing || !githubUrl.trim()}
                    onClick={handleImportGithub}
                  >
                    <Github size={13} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 md:px-5 py-3 border-b border-border/40">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, slug, capacidad…"
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          {/* App list */}
          <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-5">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-50" />
                Cargando catálogo…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Search size={28} className="mx-auto mb-2 text-muted-foreground/50" />
                <div className="text-sm text-muted-foreground">
                  No se encontraron apps con ese filtro.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {filtered.map((app) => (
                  <AppCard
                    key={app.id || app.slug}
                    app={app}
                    isEditing={editingId === (app.id || app.slug)}
                    editDraft={editDraft}
                    onEdit={() => startEdit(app)}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={() => saveEdit(app)}
                    onDelete={() => handleDelete(app)}
                    onDraftChange={(patch) => setEditDraft((p) => ({ ...p, ...patch }))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 md:px-5 py-3 border-t border-border/40 bg-muted/10 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={11} className="text-[#6C48C5]" />
              <span>
                Las apps importadas/editadas se usan automáticamente al generar nuevos mapas visuales.
              </span>
            </div>
            <div className="text-[10px]">
              {apps.filter((a) => a.source === "default").length} defaults ·{" "}
              {apps.filter((a) => a.source !== "default").length} personalizadas
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function AppCard({
  app,
  isEditing,
  editDraft,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onDraftChange,
}: {
  app: CatalogAppItem;
  isEditing: boolean;
  editDraft: Partial<CatalogAppItem>;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onDraftChange: (patch: Partial<CatalogAppItem>) => void;
}) {
  const sourceColor: Record<string, string> = {
    default: "text-muted-foreground/60",
    manual: "text-[#1dab89]",
    "txt-import": "text-[#F59E0B]",
    "github-import": "text-[#06b6d4]",
  };
  const sourceLabel: Record<string, string> = {
    default: "default",
    manual: "manual",
    "txt-import": ".txt",
    "github-import": "github",
  };

  if (isEditing) {
    return (
      <div
        className="rounded-lg border-2 p-3"
        style={{ borderColor: app.accent, background: `${app.accent}08` }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: app.accent }}>
            ✎ Editando {app.slug}
          </span>
          <div className="flex gap-1">
            <button onClick={onCancelEdit} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted" title="Cancelar">
              <X size={12} />
            </button>
            <button onClick={onSaveEdit} className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ background: app.accent }} title="Guardar">
              <Check size={12} />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Nombre</label>
            <Input value={editDraft.name || ""} onChange={(e) => onDraftChange({ name: e.target.value })} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Tagline</label>
            <Input value={editDraft.tagline || ""} onChange={(e) => onDraftChange({ tagline: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Familia</label>
              <select
                value={editDraft.family || "Tool"}
                onChange={(e) => onDraftChange({ family: e.target.value })}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2"
              >
                <option>Premium</option>
                <option>Internal</option>
                <option>Tool</option>
                <option>Platform</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Accent</label>
              <Input value={editDraft.accent || ""} onChange={(e) => onDraftChange({ accent: e.target.value })} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Descripción</label>
            <textarea
              value={editDraft.description || ""}
              onChange={(e) => onDraftChange({ description: e.target.value })}
              className="w-full text-xs bg-background border border-border rounded-md px-2 py-1 resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Stack (coma-separado)</label>
            <Input
              value={(editDraft.stack || []).join(", ")}
              onChange={(e) =>
                onDraftChange({
                  stack: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Capacidades (coma-separado)</label>
            <Input
              value={(editDraft.capabilities || []).join(", ")}
              onChange={(e) =>
                onDraftChange({
                  capabilities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          {app.id && (
            <div>
              <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">GitHub URL (opcional)</label>
              <Input
                value={editDraft.githubUrl || ""}
                onChange={(e) => onDraftChange({ githubUrl: e.target.value || null })}
                className="h-8 text-xs"
                placeholder="https://github.com/..."
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="group rounded-lg border border-border/50 bg-background/40 hover:bg-muted/20 transition p-3"
      style={{ borderLeft: `3px solid ${app.accent}` }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{app.name}</span>
            {app.source && (
              <span className={`text-[9px] uppercase tracking-wider font-bold ${sourceColor[app.source] || "text-muted-foreground"}`}>
                {sourceLabel[app.source] || app.source}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">{app.slug}</div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center" title="Editar">
            <Pencil size={11} className="text-muted-foreground" />
          </button>
          {app.id && (
            <button onClick={onDelete} className="w-6 h-6 rounded hover:bg-destructive/15 flex items-center justify-center" title="Eliminar">
              <Trash2 size={11} className="text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground/90 mb-1.5 leading-snug">{app.tagline}</div>
      <div className="text-[10px] text-muted-foreground/70 line-clamp-2 mb-2 leading-snug">
        {app.description}
      </div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {app.capabilities.slice(0, 3).map((c, i) => (
          <span
            key={i}
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: `${app.accent}22`, color: app.accent }}
          >
            {c}
          </span>
        ))}
        {app.capabilities.length > 3 && (
          <span className="text-[9px] text-muted-foreground">+{app.capabilities.length - 3}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {app.stack.slice(0, 4).map((s, i) => (
          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">
            {s}
          </span>
        ))}
        {app.githubUrl && (
          <a
            href={app.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 ml-auto"
            title={app.githubUrl}
          >
            <Github size={9} /> repo
          </a>
        )}
      </div>
    </div>
  );
}
