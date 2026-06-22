import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_WORKSPACE_ID,
  CANONICAL_WORKSPACE_SLUG,
  CATALOG_STATUSES,
  isCatalogStatus,
  isVisionMapStatus,
  isWorkspaceRole,
  resolveServerWorkspaceId,
  VISION_MAP_STATUSES,
  WORKSPACE_ROLES,
} from "./workspace-context";

function sqlite(dbPath: string, sql: string): string {
  return execFileSync("sqlite3", [dbPath], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function createLegacyDb(dbPath: string) {
  sqlite(
    dbPath,
    `
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "VisionMapRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "idea" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "appsJson" TEXT NOT NULL DEFAULT '[]',
  "nodesJson" TEXT NOT NULL,
  "connectionsJson" TEXT NOT NULL DEFAULT '[]',
  "palette" TEXT NOT NULL DEFAULT 'anclora',
  "tags" TEXT NOT NULL DEFAULT '',
  "starred" BOOLEAN NOT NULL DEFAULT false,
  "promptVersion" TEXT,
  "llmModel" TEXT,
  "tokensUsed" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "AncloraAppRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "family" TEXT NOT NULL DEFAULT 'Tool',
  "tagline" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "stackJson" TEXT NOT NULL DEFAULT '[]',
  "capabilitiesJson" TEXT NOT NULL DEFAULT '[]',
  "accent" TEXT NOT NULL DEFAULT '#1dab89',
  "domain" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "githubUrl" TEXT,
  "readme" TEXT NOT NULL DEFAULT '',
  "agentsMd" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "AncloraAppRecord_slug_key" ON "AncloraAppRecord"("slug");
INSERT INTO "VisionMapRecord" (
  "id",
  "title",
  "idea",
  "summary",
  "appsJson",
  "nodesJson",
  "connectionsJson",
  "palette",
  "tags",
  "starred",
  "promptVersion",
  "llmModel",
  "tokensUsed",
  "createdAt",
  "updatedAt"
) VALUES (
  'map_legacy_1',
  'Mapa legacy',
  'Idea legacy',
  'Resumen legacy',
  '["nexus","syncxml"]',
  '[{"id":"n1","category":"idea","title":"Nodo","description":"Descripcion","x":1,"y":2}]',
  '[{"from":"n1","to":"n2"}]',
  'premium',
  'legacy,ai',
  1,
  'v1.0.0',
  'test/model',
  321,
  '2026-06-21 10:00:00',
  '2026-06-21 10:05:00'
);
INSERT INTO "AncloraAppRecord" (
  "id",
  "slug",
  "name",
  "family",
  "tagline",
  "description",
  "stackJson",
  "capabilitiesJson",
  "accent",
  "domain",
  "source",
  "githubUrl",
  "readme",
  "agentsMd",
  "createdAt",
  "updatedAt"
) VALUES (
  'app_legacy_1',
  'nexus',
  'Anclora Nexus',
  'Platform',
  'Ops',
  'Descripcion',
  '["Next.js","Prisma"]',
  '["Gestion","Auditoria"]',
  '#1dab89',
  'ops',
  'github-import',
  'https://github.com/ToniIAPro73/anclora-nexus',
  '# Anclora Nexus',
  '[AGENTS.md] contexto',
  '2026-06-21 09:00:00',
  '2026-06-21 09:10:00'
);
`
  );
}

describe("workspace governance constants", () => {
  it("resolves only the canonical server-side workspace", () => {
    expect(resolveServerWorkspaceId()).toBe(CANONICAL_WORKSPACE_ID);
    expect(CANONICAL_WORKSPACE_SLUG).toBe("anclora-internal");
  });

  it("validates only approved roles and states", () => {
    expect(WORKSPACE_ROLES).toEqual(["viewer", "editor", "admin"]);
    expect(VISION_MAP_STATUSES).toEqual([
      "draft",
      "review",
      "approved",
      "handed_off",
      "archived",
    ]);
    expect(CATALOG_STATUSES).toEqual(["active", "archived"]);
    expect(isWorkspaceRole("admin")).toBe(true);
    expect(isWorkspaceRole("owner")).toBe(false);
    expect(isVisionMapStatus("approved")).toBe(true);
    expect(isVisionMapStatus("published")).toBe(false);
    expect(isCatalogStatus("active")).toBe(true);
    expect(isCatalogStatus("review")).toBe(false);
  });
});

describe("TASK-1001 migration SQL", () => {
  it("assigns legacy maps and catalog records to the canonical workspace without data loss", () => {
    const dir = mkdtempSync(join(tmpdir(), "visionflow-task1001-"));
    const dbPath = join(dir, "legacy.sqlite");
    try {
      createLegacyDb(dbPath);
      const beforeCounts = sqlite(
        dbPath,
        "SELECT (SELECT COUNT(*) FROM VisionMapRecord) || '|' || (SELECT COUNT(*) FROM AncloraAppRecord);"
      );
      const migrationSql = readFileSync(
        "prisma/migrations/20260621120000_add_workspace_governance/migration.sql",
        "utf8"
      );

      sqlite(dbPath, migrationSql);

      const afterCounts = sqlite(
        dbPath,
        "SELECT (SELECT COUNT(*) FROM VisionMapRecord) || '|' || (SELECT COUNT(*) FROM AncloraAppRecord);"
      );
      expect(afterCounts).toBe(beforeCounts);
      expect(sqlite(dbPath, "PRAGMA foreign_key_check;")).toBe("");
      expect(
        sqlite(
          dbPath,
          "SELECT id || '|' || slug FROM Workspace WHERE id = 'workspace_anclora_internal';"
        )
      ).toBe("workspace_anclora_internal|anclora-internal");
      expect(
        sqlite(
          dbPath,
          "SELECT workspaceId || '|' || status || '|' || COALESCE(ownerId, 'NULL') || '|' || COALESCE(approvedById, 'NULL') || '|' || promptVersion || '|' || llmModel || '|' || tokensUsed || '|' || appsJson || '|' || connectionsJson FROM VisionMapRecord WHERE id = 'map_legacy_1';"
        )
      ).toBe(
        'workspace_anclora_internal|draft|NULL|NULL|v1.0.0|test/model|321|["nexus","syncxml"]|[{"from":"n1","to":"n2"}]'
      );
      expect(
        sqlite(
          dbPath,
          "SELECT workspaceId || '|' || status || '|' || COALESCE(reviewedById, 'NULL') || '|' || stackJson || '|' || capabilitiesJson FROM AncloraAppRecord WHERE id = 'app_legacy_1';"
        )
      ).toBe('workspace_anclora_internal|active|NULL|["Next.js","Prisma"]|["Gestion","Auditoria"]');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps workspaceId required and allows duplicate catalog slugs only across workspaces", () => {
    const dir = mkdtempSync(join(tmpdir(), "visionflow-task1001-"));
    const dbPath = join(dir, "legacy.sqlite");
    try {
      createLegacyDb(dbPath);
      const migrationSql = readFileSync(
        "prisma/migrations/20260621120000_add_workspace_governance/migration.sql",
        "utf8"
      );
      sqlite(dbPath, migrationSql);

      expect(
        sqlite(
          dbPath,
          "SELECT name || ':' || type || ':' || \"notnull\" FROM pragma_table_info('VisionMapRecord') WHERE name = 'workspaceId';"
        )
      ).toBe("workspaceId:TEXT:1");
      expect(
        sqlite(
          dbPath,
          "SELECT name || ':' || type || ':' || \"notnull\" FROM pragma_table_info('AncloraAppRecord') WHERE name = 'workspaceId';"
        )
      ).toBe("workspaceId:TEXT:1");
      expect(() =>
        sqlite(
          dbPath,
          "INSERT INTO AncloraAppRecord (id, slug, name, workspaceId, createdAt, updatedAt) VALUES ('app_dup_same', 'nexus', 'Duplicate', 'workspace_anclora_internal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
        )
      ).toThrow();
      sqlite(
        dbPath,
        "INSERT INTO Workspace (id, name, slug, updatedAt) VALUES ('workspace_other', 'Other', 'other', CURRENT_TIMESTAMP);"
      );
      sqlite(
        dbPath,
        "INSERT INTO AncloraAppRecord (id, slug, name, workspaceId, createdAt, updatedAt) VALUES ('app_dup_other', 'nexus', 'Duplicate other', 'workspace_other', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
      );
      expect(
        sqlite(dbPath, "SELECT COUNT(*) FROM AncloraAppRecord WHERE slug = 'nexus';")
      ).toBe("2");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
