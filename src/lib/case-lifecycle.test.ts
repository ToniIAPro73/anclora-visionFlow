import { describe, it, expect } from "vitest";
import { canTransition, transition } from "./case-lifecycle";
import type { ProposalStatus } from "./case-lifecycle";

describe("canTransition", () => {
  it("editor can move draft → review", () => {
    expect(canTransition("draft", "review", "editor")).toBe(true);
  });

  it("viewer cannot move draft → review", () => {
    expect(canTransition("draft", "review", "viewer")).toBe(false);
  });

  it("admin can move draft → review (has editor level)", () => {
    expect(canTransition("draft", "review", "admin")).toBe(true);
  });

  it("reviewer can approve review → approved", () => {
    expect(canTransition("review", "approved", "reviewer")).toBe(true);
  });

  it("editor cannot approve review → approved", () => {
    expect(canTransition("review", "approved", "editor")).toBe(false);
  });

  it("reviewer can reject review → draft", () => {
    expect(canTransition("review", "draft", "reviewer")).toBe(true);
  });

  it("reviewer can hand off approved → handed_off", () => {
    expect(canTransition("approved", "handed_off", "reviewer")).toBe(true);
  });

  it("admin can archive approved → archived", () => {
    expect(canTransition("approved", "archived", "admin")).toBe(true);
  });

  it("reviewer cannot archive approved → archived", () => {
    expect(canTransition("approved", "archived", "reviewer")).toBe(false);
  });

  it("admin can archive handed_off → archived", () => {
    expect(canTransition("handed_off", "archived", "admin")).toBe(true);
  });

  it("no transitions from archived", () => {
    const statuses: ProposalStatus[] = ["draft", "review", "approved", "handed_off", "archived"];
    for (const to of statuses) {
      expect(canTransition("archived", to, "admin")).toBe(false);
    }
  });

  it("invalid same-status transition returns false", () => {
    expect(canTransition("draft", "draft", "admin")).toBe(false);
  });
});

describe("transition", () => {
  it("returns new status on valid transition", () => {
    expect(transition("draft", "review", "editor")).toBe("review");
  });

  it("throws on invalid transition", () => {
    expect(() => transition("draft", "approved", "admin")).toThrow(
      "Transición inválida"
    );
  });

  it("throws when role is insufficient", () => {
    expect(() => transition("draft", "review", "viewer")).toThrow(
      "Transición inválida"
    );
  });

  it("accepts optional motivo without throwing", () => {
    expect(transition("review", "approved", "reviewer", "Looks good")).toBe(
      "approved"
    );
  });
});
