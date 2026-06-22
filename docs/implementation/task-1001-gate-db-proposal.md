# TASK-1001 — Propuesta para GATE-DB-001

**Estado:** READY_FOR_HUMAN_APPROVAL

## Alcance

Esta propuesta es solo diseño y evidencia. No modifica `prisma/schema.prisma`, no crea
migraciones, no ejecuta Prisma y no toca Nexus, SyncXML ni integraciones externas.

## Requisitos aplicables

- `TASK-1001`: añadir `Workspace`, `WorkspaceMember` y campos de gobernanza.
- `REQ-AUTH-002`: cada `VisionMapRecord` y `AncloraAppRecord` debe pertenecer a un workspace.
- `REQ-AUTH-003`: roles mínimos `viewer`, `editor`, `admin`.
- `REQ-PROP-001`: estados `draft`, `review`, `approved`, `handed_off`, `archived`.
- `REQ-PROP-002`: metadatos de aprobación y responsable verificable.
- `DES-DATA-002`: propuesta base de relaciones workspace/miembros/mapas/catálogo.
- `GATE-DB-001`: migración revisada y aprobada por Staff Architect + DBA antes de aplicar.

## Esquema propuesto

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships WorkspaceMember[]
  ownedMaps   VisionMapRecord[] @relation("MapOwner")
  approvedMaps VisionMapRecord[] @relation("MapApprover")
}

model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     WorkspaceMember[]
  visionMaps  VisionMapRecord[]
  catalogApps AncloraAppRecord[]
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  role        String   @default("viewer")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId])
  @@index([workspaceId, role])
}

model VisionMapRecord {
  id              String   @id @default(cuid())
  title           String
  idea            String
  summary         String
  appsJson        String   @default("[]")
  nodesJson       String
  connectionsJson String   @default("[]")
  palette         String   @default("anclora")
  tags            String   @default("")
  starred         Boolean  @default(false)

  workspaceId  String
  ownerId      String?
  status       String   @default("draft")
  approvedAt   DateTime?
  approvedById String?

  promptVersion String?
  llmModel      String?
  tokensUsed    Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  workspace  Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  owner      User?     @relation("MapOwner", fields: [ownerId], references: [id], onDelete: SetNull)
  approvedBy User?     @relation("MapApprover", fields: [approvedById], references: [id], onDelete: SetNull)

  @@index([workspaceId, updatedAt])
  @@index([workspaceId, status])
  @@index([workspaceId, starred])
  @@index([ownerId])
  @@index([approvedById])
}

model AncloraAppRecord {
  id               String   @id @default(cuid())
  slug             String
  name             String
  family           String   @default("Tool")
  tagline          String   @default("")
  description      String   @default("")
  stackJson        String   @default("[]")
  capabilitiesJson String   @default("[]")
  accent           String   @default("#1dab89")
  domain           String   @default("")
  source           String   @default("manual")
  githubUrl        String?
  readme           String   @default("")
  agentsMd         String   @default("")

  workspaceId String
  reviewedBy  String?
  reviewedAt  DateTime?
  status      String   @default("active")
  commitSha   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@unique([workspaceId, slug])
  @@index([workspaceId, family])
  @@index([workspaceId, source])
  @@index([workspaceId, status])
  @@index([reviewedBy])
}
```

## Estrategia de datos históricos

- Crear un workspace inicial canónico, por ejemplo:
  - `slug = "legacy-default"`
  - `name = "Legacy Default Workspace"`
- Asignar todos los `VisionMapRecord` y `AncloraAppRecord` existentes a ese workspace.
- No inventar usuarios. Si no existe identidad verificable, `ownerId`, `approvedById` y
  `reviewedBy` quedan `null`.
- Los mapas históricos quedan en `status = "draft"` salvo que una evidencia externa aprobada indique
  otro estado. No se deben marcar como aprobados por inferencia.
- Los registros de catálogo existentes quedan `status = "active"` y `reviewedBy = null`.

## Plan de migración propuesto

1. Backup verificable de SQLite y conteo de filas por tabla.
2. Crear tablas `Workspace` y `WorkspaceMember`.
3. Insertar workspace inicial si no existe.
4. Añadir columnas nullable nuevas a `VisionMapRecord` y `AncloraAppRecord`.
5. Poblar `workspaceId` de registros existentes con el workspace inicial.
6. Validar que no quedan filas sin `workspaceId`.
7. Reconstruir tablas si se decide hacer `workspaceId` obligatorio en SQLite.
8. Crear índices y restricciones únicas.
9. Ejecutar `prisma generate`, `prisma validate`, tests y build.
10. Ejecutar `migration-reviewer` y pedir aprobación humana antes de aplicar.

## Riesgos clave

- SQLite requiere reconstrucción de tabla para algunas restricciones y cambios a NOT NULL.
- `ownerId` no puede poblarse sin identidad verificable.
- `AncloraAppRecord.slug` globalmente único pasaría a `@@unique([workspaceId, slug])`; hay que decidir
  si se conserva también unicidad global temporal para evitar duplicados inesperados.
- Cambiar APIs a workspace scope sin auth completa puede bloquear flujos existentes.
- Borrado en cascada de workspace destruiría mapas/catálogo; por eso se propone `Restrict` en recursos.

## Confirmaciones fuera de alcance

- No tocar Nexus.
- No tocar SyncXML.
- No activar handoff externo.
- No generar migración Prisma hasta aprobación de `GATE-DB-001`.
