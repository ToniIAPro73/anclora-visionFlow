import { describe, it, expect } from "vitest";
import { hasRole, requireRole } from "./rbac";

describe("hasRole", () => {
  it("viewer has viewer access", () => {
    expect(hasRole("viewer", "viewer")).toBe(true);
  });

  it("viewer does not have editor access", () => {
    expect(hasRole("viewer", "editor")).toBe(false);
  });

  it("editor has editor access", () => {
    expect(hasRole("editor", "editor")).toBe(true);
  });

  it("editor does not have reviewer access", () => {
    expect(hasRole("editor", "reviewer")).toBe(false);
  });

  it("reviewer has reviewer access", () => {
    expect(hasRole("reviewer", "reviewer")).toBe(true);
  });

  it("reviewer does not have admin access", () => {
    expect(hasRole("reviewer", "admin")).toBe(false);
  });

  it("admin has all access levels", () => {
    expect(hasRole("admin", "viewer")).toBe(true);
    expect(hasRole("admin", "editor")).toBe(true);
    expect(hasRole("admin", "reviewer")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
  });

  it("unknown role returns false for any minRole", () => {
    expect(hasRole("superuser", "viewer")).toBe(false);
    expect(hasRole("", "viewer")).toBe(false);
  });
});

describe("requireRole", () => {
  it("throws 401 when session is null", () => {
    expect(() => requireRole(null, "viewer")).toThrow("Unauthorized");
    try {
      requireRole(null, "viewer");
    } catch (err) {
      expect((err as { statusCode: number }).statusCode).toBe(401);
    }
  });

  it("throws 403 when role is insufficient", () => {
    const session = { user: { role: "viewer" } };
    expect(() => requireRole(session, "editor")).toThrow("Forbidden");
    try {
      requireRole(session, "editor");
    } catch (err) {
      expect((err as { statusCode: number }).statusCode).toBe(403);
    }
  });

  it("does not throw when role is sufficient", () => {
    const session = { user: { role: "admin" } };
    expect(() => requireRole(session, "admin")).not.toThrow();
  });

  it("does not throw when role exactly meets minimum", () => {
    const session = { user: { role: "reviewer" } };
    expect(() => requireRole(session, "reviewer")).not.toThrow();
  });

  it("does not throw when role exceeds minimum", () => {
    const session = { user: { role: "admin" } };
    expect(() => requireRole(session, "editor")).not.toThrow();
  });
});
