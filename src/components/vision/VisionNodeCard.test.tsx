import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { VisionNodeCard } from "./VisionNodeCard";
import type { VisionNode } from "@/lib/vision-map";

vi.mock("framer-motion", () => {
  const Passthrough = ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", rest, children);
  return {
    motion: { div: Passthrough },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
  };
});

const baseNode: VisionNode = {
  id: "node-1",
  category: "idea",
  title: "Mi idea principal",
  description: "Descripción de la idea central del mapa visual.",
  x: 100,
  y: 100,
};

const noop = () => {};

describe("VisionNodeCard", () => {
  it("renders without crashing", () => {
    render(
      <VisionNodeCard
        node={baseNode}
        isSelected={false}
        onSelect={noop}
        onUpdate={noop}
        onDelete={noop}
        palette="anclora"
      />
    );
  });

  it("displays the node title", () => {
    render(
      <VisionNodeCard
        node={baseNode}
        isSelected={false}
        onSelect={noop}
        onUpdate={noop}
        onDelete={noop}
        palette="anclora"
      />
    );
    expect(screen.getByText("Mi idea principal")).toBeDefined();
  });

  it("renders an objective node without crashing", () => {
    const node: VisionNode = { ...baseNode, id: "obj-1", category: "objective", title: "Objetivo 1" };
    render(
      <VisionNodeCard node={node} isSelected={false} onSelect={noop} onUpdate={noop} onDelete={noop} palette="anclora" />
    );
    expect(screen.getByText("Objetivo 1")).toBeDefined();
  });

  it("renders a risk node with bullets", () => {
    const node: VisionNode = {
      ...baseNode,
      id: "risk-1",
      category: "risk",
      title: "Riesgo de seguridad",
      bullets: ["Mitigación 1", "Mitigación 2"],
    };
    render(
      <VisionNodeCard node={node} isSelected={false} onSelect={noop} onUpdate={noop} onDelete={noop} palette="nexus" />
    );
    expect(screen.getByText("Riesgo de seguridad")).toBeDefined();
  });
});
