"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpWideNarrow,
  Euro,
  Footprints,
  Lightbulb,
  Rocket,
  Target,
  Wrench,
  Clock,
  User,
  type LucideIcon,
} from "lucide-react";
import type { VisionNode } from "@/lib/vision-map";
import { CATEGORY_META } from "@/lib/vision-map";

const ICONS: Record<string, LucideIcon> = {
  Lightbulb,
  Target,
  Footprints,
  AlertTriangle,
  Wrench,
  Euro,
  ArrowUpWideNarrow,
  Rocket,
};

interface Props {
  node: VisionNode;
  isActive: boolean;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  presentationMode?: boolean;
}

function VisionNodeCardInner({
  node,
  isActive,
  isHighlighted,
  onSelect,
  onDragStart,
  presentationMode = false,
}: Props) {
  const meta = CATEGORY_META[node.category];
  const Icon = ICONS[meta.icon] || Target;
  const [dragging, setDragging] = useState(false);

  const cardWidth = node.category === "idea" ? 360 : 320;

  function handleMouseDown(e: React.MouseEvent) {
    if (presentationMode) return;
    setDragging(true);
    onDragStart(node.id, e);
    document.addEventListener(
      "mouseup",
      () => setDragging(false),
      { once: true }
    );
  }

  return (
    <div
      className={`node-card node-${node.category} ${dragging ? "dragging" : ""} ${isActive ? "is-active" : ""}`}
      style={{
        left: node.x,
        top: node.y,
        width: cardWidth,
        opacity: isHighlighted || isActive ? 1 : undefined,
        filter: isHighlighted
          ? `drop-shadow(0 0 16px ${meta.color}99)`
          : undefined,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="node-card-inner p-4 cursor-pointer select-none"
        style={{
          boxShadow: isActive
            ? `0 12px 28px -8px ${meta.color}55, 0 0 0 1.5px ${meta.color}`
            : `0 8px 22px -10px ${meta.color}33`,
        }}
      >
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
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-3">
          {node.description}
        </p>

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
      </motion.div>
    </div>
  );
}

export const VisionNodeCard = memo(VisionNodeCardInner);
