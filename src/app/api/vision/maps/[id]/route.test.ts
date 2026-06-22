import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

const dbMocks = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  deleteManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    visionMapRecord: {
      findFirst: dbMocks.findFirstMock,
      update: dbMocks.updateMock,
      deleteMany: dbMocks.deleteManyMock,
    },
  },
}));

afterEach(() => {
  dbMocks.findFirstMock.mockReset();
  dbMocks.updateMock.mockReset();
  dbMocks.deleteManyMock.mockReset();
});

describe("/api/vision/maps/[id] workspace governance", () => {
  it("reads a map only from the server-resolved workspace", async () => {
    dbMocks.findFirstMock.mockResolvedValue({
      id: "map_1",
      title: "Mapa",
      idea: "Idea",
      summary: "Resumen",
      nodesJson: "[]",
      connectionsJson: "[]",
      appsJson: "[]",
      palette: "anclora",
      promptVersion: null,
      llmModel: null,
      tokensUsed: null,
      tags: "",
      starred: false,
      createdAt: new Date("2026-06-21T10:00:00.000Z"),
      updatedAt: new Date("2026-06-21T10:00:00.000Z"),
    });

    const res = await GET(new NextRequest("http://localhost/api/vision/maps/map_1"), {
      params: Promise.resolve({ id: "map_1" }),
    });

    expect(res.status).toBe(200);
    expect(dbMocks.findFirstMock).toHaveBeenCalledWith({
      where: { id: "map_1", workspaceId: "workspace_anclora_internal" },
    });
  });

  it("ignores forged governance fields on patch and scopes the lookup first", async () => {
    dbMocks.findFirstMock.mockResolvedValue({ id: "map_1" });
    dbMocks.updateMock.mockResolvedValue({
      id: "map_1",
      updatedAt: new Date("2026-06-21T10:00:00.000Z"),
    });
    const req = new NextRequest("http://localhost/api/vision/maps/map_1", {
      method: "PATCH",
      body: JSON.stringify({
        title: "Nuevo titulo",
        workspaceId: "workspace_attacker",
        status: "approved",
        approvedById: "user_attacker",
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "map_1" }) });

    expect(res.status).toBe(200);
    expect(dbMocks.findFirstMock).toHaveBeenCalledWith({
      where: { id: "map_1", workspaceId: "workspace_anclora_internal" },
    });
    expect(dbMocks.updateMock.mock.calls[0][0].data).toEqual({
      title: "Nuevo titulo",
    });
  });

  it("deletes only maps from the server-resolved workspace", async () => {
    dbMocks.deleteManyMock.mockResolvedValue({ count: 1 });

    const res = await DELETE(new NextRequest("http://localhost/api/vision/maps/map_1"), {
      params: Promise.resolve({ id: "map_1" }),
    });

    expect(res.status).toBe(200);
    expect(dbMocks.deleteManyMock).toHaveBeenCalledWith({
      where: { id: "map_1", workspaceId: "workspace_anclora_internal" },
    });
  });
});
