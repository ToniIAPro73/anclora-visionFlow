import { afterEach, describe, expect, it, vi } from "vitest";
import { updateCatalogAppFields, upsertCatalogApp } from "./anclora-catalog";
import type { ParsedApp } from "./anclora-catalog";

const dbMocks = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  deleteManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    ancloraAppRecord: {
      findMany: dbMocks.findManyMock,
      upsert: dbMocks.upsertMock,
      findFirst: dbMocks.findFirstMock,
      update: dbMocks.updateMock,
      deleteMany: dbMocks.deleteManyMock,
    },
  },
}));

afterEach(() => {
  dbMocks.upsertMock.mockReset();
  dbMocks.findManyMock.mockReset();
  dbMocks.findFirstMock.mockReset();
  dbMocks.updateMock.mockReset();
  dbMocks.deleteManyMock.mockReset();
});

function parsedApp(): ParsedApp {
  return {
    slug: "nexus",
    name: "Anclora Nexus",
    tagline: "Ops",
    description: "Descripcion",
    family: "Platform",
    stack: ["Next.js"],
    capabilities: ["Gestion"],
    accent: "#1dab89",
    domain: "ops",
    readme: "# Anclora Nexus",
    agentsMd: "[AGENTS.md] contexto",
    warnings: [],
  };
}

describe("catalog workspace governance", () => {
  it("upserts catalog apps by workspace and slug, never by global slug", async () => {
    dbMocks.upsertMock.mockResolvedValue({ id: "app_1" });

    await upsertCatalogApp(parsedApp(), "github-import", "https://github.com/test/repo");

    expect(dbMocks.upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId_slug: {
            workspaceId: "workspace_anclora_internal",
            slug: "nexus",
          },
        },
        create: expect.objectContaining({
          workspaceId: "workspace_anclora_internal",
          slug: "nexus",
        }),
      })
    );
  });

  it("does not accept forged review/status governance fields in editable updates", async () => {
    dbMocks.findFirstMock.mockResolvedValue({ id: "app_1" });
    dbMocks.updateMock.mockResolvedValue({ id: "app_1" });

    await updateCatalogAppFields("app_1", {
      name: "Anclora Nexus Updated",
      reviewedById: "user_attacker",
      status: "active",
    } as Parameters<typeof updateCatalogAppFields>[1] & {
      reviewedById: string;
      status: string;
    });

    expect(dbMocks.findFirstMock).toHaveBeenCalledWith({
      where: { id: "app_1", workspaceId: "workspace_anclora_internal" },
      select: { id: true },
    });
    expect(dbMocks.updateMock.mock.calls[0][0].data).toEqual({
      name: "Anclora Nexus Updated",
    });
  });
});
