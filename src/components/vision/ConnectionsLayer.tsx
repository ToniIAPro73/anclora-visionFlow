"use client";

import { memo, useMemo } from "react";
import type { VisionConnection, VisionNode } from "@/lib/vision-map";

interface Props {
  nodes: VisionNode[];
  connections: VisionConnection[];
  activeNodeId?: string;
  width: number;
  height: number;
}

/**
 * Renders curved bezier connections between nodes.
 * Cards are ~320px wide and ~150-180px tall; we approximate centers.
 */
function ConnectionsLayerInner({
  nodes,
  connections,
  activeNodeId,
  width,
  height,
}: Props) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, VisionNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // Card dimensions (must match VisionNodeCard)
  const CARD_W = 320;
  const CARD_H = 150;
  const IDEA_W = 360;
  const IDEA_H = 180;

  function getCenter(id: string) {
    const n = nodeMap.get(id);
    if (!n) return null;
    const w = n.category === "idea" ? IDEA_W : CARD_W;
    const h = n.category === "idea" ? IDEA_H : CARD_H;
    return { x: n.x + w / 2, y: n.y + h / 2 };
  }

  return (
    <svg className="connection-svg" width={width} height={height}>
      <defs>
        <linearGradient id="conn-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1dab89" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#6C48C5" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.7" />
        </linearGradient>
        <marker
          id="arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L6,3 L0,6 z" fill="currentColor" opacity="0.6" />
        </marker>
      </defs>

      {connections.map((conn, idx) => {
        const from = getCenter(conn.from);
        const to = getCenter(conn.to);
        if (!from || !to) return null;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return null;

        // Curved bezier control point
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        // Slight perpendicular offset for curve
        const offsetMag = Math.min(60, dist * 0.18);
        const nx = -dy / dist;
        const ny = dx / dist;
        const ctrlX = midX + nx * offsetMag;
        const ctrlY = midY + ny * offsetMag;

        const path = `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`;

        const isHighlighted =
          activeNodeId &&
          (conn.from === activeNodeId || conn.to === activeNodeId);

        return (
          <g key={idx}>
            <path
              d={path}
              className={`connection-path ${isHighlighted ? "highlighted" : ""}`}
              stroke={isHighlighted ? "url(#conn-grad)" : "url(#conn-grad)"}
              markerEnd="url(#arrow)"
              style={
                isHighlighted
                  ? { opacity: 1, strokeDasharray: "6 4" }
                  : { opacity: 0.55 }
              }
            />
            {conn.label && isHighlighted && (
              <text
                x={ctrlX}
                y={ctrlY - 6}
                textAnchor="middle"
                className="fill-foreground"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  opacity: 0.85,
                }}
              >
                <tspan
                  dy="0"
                  style={{
                    paintOrder: "stroke",
                    stroke: "var(--background)",
                    strokeWidth: 3,
                  }}
                >
                  {conn.label}
                </tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const ConnectionsLayer = memo(ConnectionsLayerInner);
