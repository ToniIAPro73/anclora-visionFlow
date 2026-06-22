import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const dbMocks = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    visionMapRecord: {
      findMany: dbMocks.findManyMock,
      findFirst: dbMocks.findFirstMock,
      update: dbMocks.updateMock,
      create: dbMocks.createMock,
    },
  },
}));

vi.mock("@/lib/generation-receipt", () => ({
  getVerifiedGenerationMetadata: vi.fn(() => ({
    promptVersion: null,
    llmModel: null,
    tokensUsed: null,
  })),
}));

afterEach(() => {
  dbMocks.findManyMock.mockReset();
  dbMocks.findFirstMock.mockReset();
  dbMocks.updateMock.mockReset();
  dbMocks.createMock.mockReset();
});

describe("POST /api/vision/maps workspace governance", () => {
  it("lists only maps from the server-resolved workspace", async () => {
    dbMocks.findManyMock.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(dbMocks.findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "workspace_anclora_internal" },
      })
    );
  });

  it("ignores forged workspace, status, and approval fields when creating a map", async () => {
    dbMocks.createMock.mockResolvedValue({
      id: "map_1",
      createdAt: new Date("2026-06-21T10:00:00.000Z"),
      updatedAt: new Date("2026-06-21T10:00:00.000Z"),
    });
    const req = new NextRequest("http://localhost/api/vision/maps", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "workspace_attacker",
        status: "approved",
        approvedById: "user_attacker",
        approvedAt: "2026-06-21T10:00:00.000Z",
        map: {
          idea: "Idea",
          summary: "Resumen",
          nodes: [],
          connections: [],
          apps: [],
          generatedAt: "2026-06-21T10:00:00.000Z",
          palette: "anclora",
          status: "approved",
        },
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(dbMocks.createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace_anclora_internal",
        title: "Idea",
      }),
    });
    expect(dbMocks.createMock.mock.calls[0][0].data).not.toHaveProperty("status");
    expect(dbMocks.createMock.mock.calls[0][0].data).not.toHaveProperty("approvedById");
    expect(dbMocks.createMock.mock.calls[0][0].data).not.toHaveProperty("approvedAt");
  });

  it("updates existing maps only after a workspace-scoped lookup", async () => {
    dbMocks.findFirstMock.mockResolvedValue({ id: "map_1" });
    dbMocks.updateMock.mockResolvedValue({
      id: "map_1",
      updatedAt: new Date("2026-06-21T10:00:00.000Z"),
    });
    const req = new NextRequest("http://localhost/api/vision/maps", {
      method: "POST",
      body: JSON.stringify({
        id: "map_1",
        status: "approved",
        approvedById: "user_attacker",
        starred: true,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(dbMocks.findFirstMock).toHaveBeenCalledWith({
      where: { id: "map_1", workspaceId: "workspace_anclora_internal" },
      select: { id: true },
    });
    expect(dbMocks.updateMock.mock.calls[0][0].data).toEqual({ starred: true });
  });
});
