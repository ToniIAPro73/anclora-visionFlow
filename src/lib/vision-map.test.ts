import { describe, it, expect } from "vitest";
import { layoutVisionMap, autoConnect } from "./vision-map";
import type { VisionNode } from "./vision-map";

function makeNode(id: string, category: VisionNode["category"]): VisionNode {
  return { id, category, title: id, description: "desc", x: 0, y: 0 };
}

describe("layoutVisionMap", () => {
  it("places idea node near canvas center", () => {
    const nodes = [makeNode("idea-1", "idea"), makeNode("obj-1", "objective")];
    const result = layoutVisionMap(nodes);
    const idea = result.find((n) => n.category === "idea")!;
    expect(idea).toBeDefined();
    expect(idea.x).toBeGreaterThan(0);
    expect(idea.y).toBeGreaterThan(0);
  });

  it("returns same number of nodes as input", () => {
    const nodes = [
      makeNode("idea-1", "idea"),
      makeNode("obj-1", "objective"),
      makeNode("step-1", "step"),
      makeNode("risk-1", "risk"),
    ];
    expect(layoutVisionMap(nodes)).toHaveLength(4);
  });

  it("assigns distinct positions to all nodes", () => {
    const nodes = [
      makeNode("idea-1", "idea"),
      makeNode("obj-1", "objective"),
      makeNode("obj-2", "objective"),
      makeNode("step-1", "step"),
    ];
    const result = layoutVisionMap(nodes);
    const positions = result.map((n) => `${n.x},${n.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(result.length);
  });

  it("works with empty node list", () => {
    expect(layoutVisionMap([])).toEqual([]);
  });

  it("respects custom canvas dimensions", () => {
    const nodes = [makeNode("idea-1", "idea")];
    const result = layoutVisionMap(nodes, { canvasWidth: 800, canvasHeight: 600 });
    const idea = result[0];
    expect(idea.x).toBeLessThan(800);
    expect(idea.y).toBeLessThan(600);
  });
});

describe("autoConnect", () => {
  it("connects idea to objectives", () => {
    const nodes = [
      makeNode("idea-1", "idea"),
      makeNode("obj-1", "objective"),
      makeNode("obj-2", "objective"),
    ];
    const conns = autoConnect(nodes);
    const fromIdea = conns.filter((c) => c.from === "idea-1");
    expect(fromIdea.length).toBeGreaterThan(0);
  });

  it("returns empty array with no nodes", () => {
    expect(autoConnect([])).toEqual([]);
  });

  it("returns empty array with only one node", () => {
    expect(autoConnect([makeNode("idea-1", "idea")])).toEqual([]);
  });

  it("does not create self-connections", () => {
    const nodes = [makeNode("idea-1", "idea"), makeNode("obj-1", "objective")];
    const conns = autoConnect(nodes);
    expect(conns.every((c) => c.from !== c.to)).toBe(true);
  });
});
