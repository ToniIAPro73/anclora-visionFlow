"use client";

import { memo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpWideNarrow,
  Calendar,
  Check,
  Euro,
  Footprints,
  Lightbulb,
  Pencil,
  Rocket,
  Target,
  TrendingUp,
  Users,
  Wrench,
  X,
  Clock,
  User,
  type LucideIcon,
} from "lucide-react";
import type { VisionNode, NodeCategory, Priority } from "@/lib/vision-map";
import { getCategoryMeta } from "@/lib/vision-map";
import type { PaletteId } from "@/lib/vision-map";

const ICONS: Record<string, LucideIcon> = {
  Lightbulb,
  Target,
  Footprints,
  AlertTriangle,
  Wrench,
  Euro,
  ArrowUpWideNarrow,
  Rocket,
  TrendingUp,
  Users,
  Calendar,
};

interface Props {
  node: VisionNode;
  isActive: boolean;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onUpdate: (id: string, patch: Partial<VisionNode>) => void;
  presentationMode?: boolean;
  palette?: PaletteId;
}

function VisionNodeCardInner({
  node,
  isActive,
  isHighlighted,
  onSelect,
  onDragStart,
  onUpdate,
  presentationMode = false,
  palette = "anclora",
}: Props) {
  const meta = getCategoryMeta(node.category, palette);
  const Icon = ICONS[meta.icon] || Target;
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<VisionNode>(node);

  const cardWidth = node.category === "idea" ? 360 : 320;
  const isIdea = node.category === "idea";

  useEffect(() => {
    setDraft(node);
  }, [node]);

  function handleMouseDown(e: React.MouseEvent) {
    if (presentationMode || editing) return;
    setDragging(true);
    onDragStart(node.id, e);
    document.addEventListener(
      "mouseup",
      () => setDragging(false),
      { once: true }
    );
  }

  function saveDraft() {
    onUpdate(node.id, {
      title: draft.title,
      description: draft.description,
      cost: draft.cost,
      priority: draft.priority,
      owner: draft.owner,
      time: draft.time,
      target: draft.target,
      current: draft.current,
      unit: draft.unit,
      role: draft.role,
      contact: draft.contact,
      date: draft.date,
      milestone: draft.milestone,
      bullets: draft.bullets,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(node);
    setEditing(false);
  }

  return (
    <div
      className={`node-card node-${node.category} ${dragging ? "dragging" : ""} ${isActive ? "is-active" : ""}`}
      style={{
        left: node.x,
        top: node.y,
        width: cardWidth,
        opacity: isHighlighted || isActive ? 1 : undefined,
        filter: isHighlighted ? `drop-shadow(0 0 16px ${meta.color}99)` : undefined,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!presentationMode) setEditing(true);
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="node-card-inner p-4 cursor-pointer select-none relative"
        style={{
          boxShadow: isActive
            ? `0 12px 28px -8px ${meta.color}55, 0 0 0 1.5px ${meta.color}`
            : `0 8px 22px -10px ${meta.color}33`,
        }}
      >
        {isActive && !presentationMode && !editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-md bg-background/80 hover:bg-background border border-border/60 flex items-center justify-center z-10"
            title="Editar (doble clic)"
          >
            <Pencil size={12} className="text-muted-foreground" />
          </button>
        )}

        {editing ? (
          <EditorView
            node={draft}
            setDraft={setDraft}
            onSave={saveDraft}
            onCancel={cancelEdit}
            metaColor={meta.color}
            metaLabel={meta.labelSingular}
          />
        ) : (
          <ReadView
            node={node}
            meta={meta}
            Icon={Icon}
            isIdea={isIdea}
          />
        )}
      </motion.div>
    </div>
  );
}

function ReadView({
  node,
  meta,
  Icon,
  isIdea,
}: {
  node: VisionNode;
  meta: ReturnType<typeof getCategoryMeta>;
  Icon: LucideIcon;
  isIdea: boolean;
}) {
  return (
    <>
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className="flex items-center justify-center rounded-md shrink-0"
          style={{
            width: 32,
            height: 32,
            background: `${meta.color}22`,
            color: meta.color,
          }}
        >
          <Icon size={17} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] uppercase tracking-wider font-semibold mb-0.5"
            style={{ color: meta.color }}
          >
            {meta.labelSingular}
          </div>
          <div className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
            {node.title}
          </div>
        </div>
        {node.priority && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0"
            style={{
              background:
                node.priority === "alta"
                  ? "rgba(255,107,91,0.18)"
                  : node.priority === "media"
                  ? "rgba(245,158,11,0.18)"
                  : "rgba(125,211,252,0.18)",
              color:
                node.priority === "alta"
                  ? "#FF6B5B"
                  : node.priority === "media"
                  ? "#F59E0B"
                  : "#7DD3FC",
            }}
          >
            {node.priority}
          </span>
        )}
        {node.milestone && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0"
            style={{ background: `${meta.color}22`, color: meta.color }}
            title="Hito crítico"
          >
            ★
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-3">
        {node.description}
      </p>

      {/* KPI progress */}
      {node.category === "kpi" && node.target && node.current && (
        <div className="mb-2">
          {(() => {
            const target = parseFloat(node.target);
            const current = parseFloat(node.current);
            const pct = isNaN(target) || target === 0
              ? 0
              : Math.min(100, Math.round((current / target) * 100));
            return (
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[11px] font-mono font-semibold">
                    {node.current}{node.unit || ""} <span className="text-muted-foreground">/ {node.target}{node.unit || ""}</span>
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: meta.color }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`,
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {node.bullets && node.bullets.length > 0 && (
        <ul className="text-[11px] text-muted-foreground space-y-1 mb-2 pl-3">
          {node.bullets.slice(0, 4).map((b, i) => (
            <li key={i} className="relative leading-snug">
              <span
                className="absolute -left-3 top-1.5 w-1 h-1 rounded-full"
                style={{ background: meta.color }}
              />
              {b}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-2 pt-2 border-t border-border/40">
        {node.cost !== undefined && (
          <span className="text-[11px] font-semibold text-foreground/80">
            {node.cost.toLocaleString("es-ES")} €
          </span>
        )}
        {node.time && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={11} /> {node.time}
          </span>
        )}
        {node.owner && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <User size={11} /> {node.owner}
          </span>
        )}
        {node.role && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: `${meta.color}22`, color: meta.color }}
          >
            {node.role}
          </span>
        )}
        {node.date && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar size={11} /> {node.date}
          </span>
        )}
        {node.contact && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={node.contact}>
            ✉ {node.contact}
          </span>
        )}
        {node.appSlug && (
          <span
            className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: `${meta.color}22`,
              color: meta.color,
            }}
          >
            {node.appSlug}
          </span>
        )}
      </div>
    </>
  );
}

function EditorView({
  node,
  setDraft,
  onSave,
  onCancel,
  metaColor,
  metaLabel,
}: {
  node: VisionNode;
  setDraft: (fn: (prev: VisionNode) => VisionNode) => void;
  onSave: () => void;
  onCancel: () => void;
  metaColor: string;
  metaLabel: string;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const inputCls =
    "w-full text-xs bg-background/70 border border-border/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: metaColor }}
        >
          ✎ Editar {metaLabel}
        </span>
        <div className="flex gap-1">
          <button
            onClick={onCancel}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted"
            title="Cancelar"
          >
            <X size={12} />
          </button>
          <button
            onClick={onSave}
            className="w-6 h-6 rounded flex items-center justify-center text-white"
            style={{ background: metaColor }}
            title="Guardar"
          >
            <Check size={12} />
          </button>
        </div>
      </div>

      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        Título
      </label>
      <input
        ref={titleRef}
        type="text"
        value={node.title}
        onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
        className={inputCls + " mb-2 font-medium"}
        maxLength={120}
      />

      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        Descripción
      </label>
      <textarea
        value={node.description}
        onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
        className={inputCls + " mb-2 resize-none"}
        rows={3}
        maxLength={500}
      />

      {/* Category-specific fields */}
      {(node.category === "cost" || node.cost !== undefined) && (
        <div className="mb-2">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Coste (€)
          </label>
          <input
            type="number"
            value={node.cost ?? ""}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                cost: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            className={inputCls}
          />
        </div>
      )}

      {node.category === "priority" && (
        <div className="mb-2">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Prioridad
          </label>
          <select
            value={node.priority || "media"}
            onChange={(e) =>
              setDraft((p) => ({ ...p, priority: e.target.value as Priority }))
            }
            className={inputCls}
          >
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      )}

      {node.category === "kpi" && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Actual</label>
            <input
              type="text"
              value={node.current || ""}
              onChange={(e) => setDraft((p) => ({ ...p, current: e.target.value }))}
              className={inputCls}
              placeholder="42"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Meta</label>
            <input
              type="text"
              value={node.target || ""}
              onChange={(e) => setDraft((p) => ({ ...p, target: e.target.value }))}
              className={inputCls}
              placeholder="85"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Unidad</label>
            <input
              type="text"
              value={node.unit || ""}
              onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
              className={inputCls}
              placeholder="%"
            />
          </div>
        </div>
      )}

      {node.category === "stakeholder" && (
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Rol</label>
            <select
              value={node.role || "Contributor"}
              onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))}
              className={inputCls}
            >
              <option>Sponsor</option>
              <option>Owner</option>
              <option>Contributor</option>
              <option>External</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Contacto</label>
            <input
              type="text"
              value={node.contact || ""}
              onChange={(e) => setDraft((p) => ({ ...p, contact: e.target.value }))}
              className={inputCls}
              placeholder="email@anclora.es"
            />
          </div>
        </div>
      )}

      {node.category === "timeline" && (
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Fecha</label>
            <input
              type="text"
              value={node.date || ""}
              onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
              className={inputCls}
              placeholder="Q1 2026"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={!!node.milestone}
                onChange={(e) => setDraft((p) => ({ ...p, milestone: e.target.checked }))}
                className="accent-current"
                style={{ accentColor: metaColor }}
              />
              Hito crítico
            </label>
          </div>
        </div>
      )}

      {(node.category === "step" || node.time !== undefined) && (
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Tiempo</label>
            <input
              type="text"
              value={node.time || ""}
              onChange={(e) => setDraft((p) => ({ ...p, time: e.target.value }))}
              className={inputCls}
              placeholder="2 semanas"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-muted-foreground mb-0.5">Owner</label>
            <input
              type="text"
              value={node.owner || ""}
              onChange={(e) => setDraft((p) => ({ ...p, owner: e.target.value }))}
              className={inputCls}
              placeholder="Backend"
            />
          </div>
        </div>
      )}

      {node.bullets && node.bullets.length > 0 && (
        <div className="mb-2">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Bullets (uno por línea)
          </label>
          <textarea
            value={(node.bullets || []).join("\n")}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              }))
            }
            className={inputCls + " resize-none"}
            rows={Math.min(5, (node.bullets || []).length + 1)}
          />
        </div>
      )}
    </div>
  );
}

export const VisionNodeCard = memo(VisionNodeCardInner);
