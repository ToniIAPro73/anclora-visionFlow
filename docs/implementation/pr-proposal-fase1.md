# PR Proposal — Fase 1 Foundations

**Fecha de preparación:** 2026-06-21
**Rama origen:** `feat/visionflow-task-1001-gate-db-proposal`
**Rama destino:** `development`
**Estado:** LISTO PARA REVISIÓN HUMANA — no crear ni fusionar sin aprobación explícita

---

## Título

`feat(visionflow/fase1): complete foundations for verification, AI governance and workspace scope`

---

## Resumen

Este PR consolida cuatro tareas de Fase 1 completadas y verificadas formalmente. Ningún cambio
toca `REQUIREMENTS.md` ni `DESIGN.md`. No se añaden dependencias propietarias. No se modifica
Nexus, SyncXML, autenticación completa ni CI.

### TASK-1008 — Suite de tests (Vitest 4.1.9)

Infraestructura de tests a partir de cero: `vitest.config.ts`, `vitest.setup.ts`, mocks de
Next.js, helper `repairTruncatedJson` extraído a `src/lib/llm-utils.ts`. Tests iniciales en
`llm-utils.test.ts` (7), `vision-map.test.ts` (9), `VisionNodeCard.test.tsx` (4) y el
`sanitize.test.ts` preexistente (9). Scripts `test` y `test:watch` añadidos a `package.json`.
Gate REQ-QA-001/QA-002 PASS. Suite total al cierre de TASK-1008: 29/29.

### TASK-1006 — Versionado y trazabilidad de generación IA

Constante semver `PROMPT_VERSION` exportada desde `src/lib/llm-client.ts` (DES-AI-003).
`/api/vision/generate` emite `generationReceipt` HMAC con TTL y `mapHash` canónico.
`POST /api/vision/maps` ignora metadatos libres del cliente y solo persiste `promptVersion`,
`llmModel` y `tokensUsed` si el recibo es válido, no ha caducado y corresponde al mapa; sin
recibo válido los tres campos quedan como `null`. `promptVersion` y `llmModel` son
server-authoritative (no pueden ser forjados). Primera migración Prisma: baseline
`20260621062333_add_generation_metadata`. Nuevos tests: `generation-metadata.test.ts` y
`generation-receipt.test.ts`. Gates REQ-AI-002/AI-007 PASS. Suite al cierre: 46/46.

### TASK-1007 — Rate limiting en endpoint de generación

Rate limiting OSS en memoria (`lru-cache`) por IP en `POST /api/vision/generate`, ejecutado
antes de leer el body o llamar al LLM. Default: 10 peticiones / 60 s; configurable con
variables de entorno. Devuelve 429 con `Retry-After` y mensaje seguro en español. Modo proxy
confiable (`VISIONFLOW_TRUST_PROXY_HEADERS=true`) activa lectura de `X-Real-IP` y
`X-Forwarded-For` saneados por Caddy; modo directo usa clave conservadora `ip:direct`. Corrección
`HOSTNAME=127.0.0.1` en `bun run start` para que el standalone de Next.js no escuche en
`0.0.0.0`. Nuevos tests: `generation-rate-limit.test.ts` y `route.test.ts`. Gate REQ-AI-005/
SEC-005 PASS. Suite al cierre: confirmar en TASK-1007.

### TASK-1001 — Workspace governance foundation

Modelos `Workspace` y `WorkspaceMember` en `prisma/schema.prisma`. `workspaceId NOT NULL` y
FK `onDelete: Restrict` en `VisionMapRecord` y `AncloraAppRecord`. Workspace canónico
`workspace_anclora_internal` (slug `anclora-internal`) seedeado en migración
`20260621120000_add_workspace_governance`. Nuevo `src/lib/workspace-context.ts` con resolución
server-side; las rutas actuales no aceptan `workspaceId`, estados, aprobadores ni reviewers desde
cliente. Unicidad global de `AncloraAppRecord.slug` eliminada; sustituida por índice compuesto
`[workspaceId, slug]`. Tests nuevos: `workspace-governance.test.ts`, `maps/route.test.ts`,
`maps/[id]/route.test.ts`, `anclora-catalog.test.ts`. GATE-DB-001 PASS. Suite al cierre:
**72/72 (11 archivos, estado actual)**.

---

## Migraciones incluidas

| Nombre | Tipo | Contenido |
| --- | --- | --- |
| `20260621062333_add_generation_metadata` | Baseline (CREATE TABLE completo) | User, VisionMapRecord con promptVersion/llmModel/tokensUsed, AncloraAppRecord |
| `20260621120000_add_workspace_governance` | Incremental (table recreation SQLite) | Workspace, WorkspaceMember; recrea VisionMapRecord y AncloraAppRecord con workspaceId NOT NULL; índices compuestos; seed workspace_anclora_internal |

### Runbook SQLite — tres rutas

**PROHIBICIÓN ABSOLUTA: no usar `prisma db push` en ninguna ruta.**

#### Ruta 1 — Base nueva (sin tablas)

Precondición: SQLite vacía o inexistente, sin `_prisma_migrations`.

```bash
DATABASE_URL="file:./dev.db" bunx prisma migrate deploy
# Verifica:
sqlite3 dev.db "SELECT slug FROM Workspace;"                         # anclora-internal
sqlite3 dev.db "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"  # 0 filas
sqlite3 dev.db "PRAGMA table_info('VisionMapRecord');" | grep workspaceId
```

Rollback: no aplica (base vacía).

#### Ruta 2 — Base legacy sin historial Prisma

Precondición: tablas `VisionMapRecord` y `AncloraAppRecord` existen sin columnas de TASK-1006
ni `_prisma_migrations`.

```bash
# 1. Backup verificable
cp dev.db dev.db.backup-$(date +%Y%m%d%H%M%S)

# 2. Anotar conteos pre-migración
MAPS=$(sqlite3 dev.db "SELECT COUNT(*) FROM VisionMapRecord;")
APPS=$(sqlite3 dev.db "SELECT COUNT(*) FROM AncloraAppRecord;")

# 3. Añadir columnas TASK-1006 (nullable, no destructivo)
sqlite3 dev.db "ALTER TABLE VisionMapRecord ADD COLUMN promptVersion TEXT;"
sqlite3 dev.db "ALTER TABLE VisionMapRecord ADD COLUMN llmModel TEXT;"
sqlite3 dev.db "ALTER TABLE VisionMapRecord ADD COLUMN tokensUsed INTEGER;"

# 4. Marcar baseline como ya aplicada (sin ejecutar su SQL)
DATABASE_URL="file:./dev.db" bunx prisma migrate resolve \
  --applied 20260621062333_add_generation_metadata

# 5. Aplicar migración TASK-1001
DATABASE_URL="file:./dev.db" bunx prisma migrate deploy

# 6. Verificar
sqlite3 dev.db "SELECT COUNT(*) FROM VisionMapRecord;"   # debe igualar $MAPS
sqlite3 dev.db "SELECT COUNT(*) FROM AncloraAppRecord;"  # debe igualar $APPS
sqlite3 dev.db "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"  # 0 filas
sqlite3 dev.db "SELECT slug FROM Workspace;"             # anclora-internal
```

Condición de abortar: `foreign_key_check` devuelve filas, o COUNT post < COUNT pre.
Rollback: `cp dev.db.backup-<TIMESTAMP> dev.db`.

#### Ruta 3 — Base ya actualizada hasta TASK-1006

Precondición: columnas `promptVersion/llmModel/tokensUsed` presentes, `_prisma_migrations`
contiene `20260621062333_add_generation_metadata`.

```bash
# 1. Backup
cp dev.db dev.db.backup-$(date +%Y%m%d%H%M%S)

# 2. Anotar conteos y aplicar
DATABASE_URL="file:./dev.db" bunx prisma migrate deploy

# 3. Verificar (idéntico a Ruta 2 desde paso 6)
sqlite3 dev.db "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"  # 0 filas
sqlite3 dev.db "SELECT slug FROM Workspace;"
sqlite3 dev.db "SELECT workspaceId FROM VisionMapRecord LIMIT 3;"   # workspace_anclora_internal
```

Rollback: `cp dev.db.backup-<TIMESTAMP> dev.db`.

---

## Variables operativas requeridas en staging/producción

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `HOSTNAME=127.0.0.1` | Sí | Evita que Next.js standalone escuche en 0.0.0.0; Caddy proxea a localhost:3000 |
| `VISIONFLOW_TRUST_PROXY_HEADERS=true` | Sí (detrás de Caddy) | Habilita X-Real-IP / X-Forwarded-For para rate limiting correcto |
| `VISIONFLOW_GENERATION_RECEIPT_SECRET=<secreto persistente>` | Sí | HMAC para generationReceipt; secreto efímero de arranque solo aceptable en desarrollo |
| `OPENROUTER_API_KEY` | Sí | Clave OpenRouter para generación LLM |
| `DATABASE_URL` | Sí | Ruta SQLite, ej. `file:./dev.db` |
| `OPENROUTER_MODEL` | No (default: `google/gemini-flash-1.5`) | Override de modelo LLM |
| `VISIONFLOW_GENERATE_RATE_LIMIT_REQUESTS` | No (default: 10) | Peticiones por ventana |
| `VISIONFLOW_GENERATE_RATE_LIMIT_WINDOW_SECONDS` | No (default: 60) | Tamaño de ventana en segundos |
| `VISIONFLOW_GENERATE_RATE_LIMIT_MAX_KEYS` | No (default: 1000) | Claves IP máximas en memoria |

---

## Gates verificados

| Gate | Comando / evidencia | Resultado |
| --- | --- | --- |
| lint | `eslint .` | 0 errores |
| typecheck | `bunx tsc --noEmit` | 0 errores |
| tests | `bun run test` | **72/72 — 11 archivos** |
| build | `bun run build` | exitoso |
| Prisma validate | `bunx prisma validate` | PASS |
| `PRAGMA foreign_key_check` | base nueva temporal + base legacy temporal | 0 filas |
| Preservación de datos legacy | conteos 1\|1 → 1\|1; JSON, connections, tags, catálogo y metadata TASK-1006 preservados | PASS |
| diff --check | `git diff --check development...HEAD` | exit 0 (sin whitespace errors) |
| GATE-DB-001 | Aprobación humana formal | PASS |

---

## Riesgos residuales

| ID | Severidad | Descripción |
| --- | --- | --- |
| RISK-AUTH-001 | CRÍTICA | Sin autenticación ni RBAC efectivo todavía; todas las rutas API son accesibles sin sesión. Bloqueado hasta DEC-AUTH-001 + GATE-AUTH-001. |
| RISK-WORKSPACE-001 | MEDIA | Single-workspace compatibility mode; no hay selector de workspace ni membresías verificables hasta TASK-1002/auth. |
| RISK-RATE-002 | MEDIA | Rate limit local por proceso; no coordina múltiples réplicas ni sobrevive reinicios. Aceptado para instancia única actual. |
| RISK-WORKSPACE-002 | ALTA | Migración TASK-1001 reconstruye tablas SQLite; backup obligatorio antes de aplicar en cualquier entorno con datos reales. |
| RISK-RECEIPT-SECRET-001 | BAJA | `VISIONFLOW_GENERATION_RECEIPT_SECRET` efímero invalida recibos tras restart; secreto persistente obligatorio en staging/producción. |

---

## Rollback lógico

1. Restaurar backup SQLite creado antes de `prisma migrate deploy`:
   ```bash
   cp dev.db.backup-<TIMESTAMP> dev.db
   ```
2. Revertir los commits de TASK-1001 en la rama (en orden inverso si aplica):
   ```bash
   git revert <SHA-c611e58>  # feat: add workspace governance foundation
   # o restaurar development al estado anterior al merge de esta rama
   ```
3. Regenerar cliente Prisma:
   ```bash
   bunx prisma generate
   ```
4. Verificar suite y build:
   ```bash
   bun run test && bun run build
   ```

No existe rollback automático de migraciones SQLite vía Prisma. El backup es el único mecanismo
seguro para revertir datos.

---

## Checklist de revisión humana

- [ ] Validar migración `20260621120000_add_workspace_governance` sobre copia de base real de staging antes de aplicar en producción
- [ ] Configurar `VISIONFLOW_GENERATION_RECEIPT_SECRET` como secreto persistente fuera de Git (vault, env cifrado, secrets manager)
- [ ] Revisar que `HOSTNAME`, `VISIONFLOW_TRUST_PROXY_HEADERS` y `OPENROUTER_API_KEY` están configuradas en el entorno de destino
- [ ] Confirmar que no hay claves o secretos en ninguno de los 16 archivos modificados
- [ ] Revisar cambios en `prisma/schema.prisma` y las dos migraciones
- [ ] Revisar runbook SQLite completo en `docs/implementation/implementation-log.md`
- [ ] Ejecutar `bun run test` en el entorno de destino antes de aprobar merge
- [ ] Aprobar promoción a `development`

---

## Commits incluidos en esta rama (development..HEAD)

| SHA | Mensaje |
| --- | --- |
| `2be7872` | docs(visionflow): reconcile phase one evidence and risk records |
| `816d732` | docs(visionflow): finalize workspace migration runbook |
| `5bbdf35` | docs(visionflow): record workspace migration evidence |
| `79391f5` | test(visionflow): cover workspace data isolation |
| `c611e58` | feat(visionflow): add workspace governance foundation |
| `2cb2637` | docs(visionflow): propose TASK-1001 database gate |

*Nota: TASK-1008, TASK-1006 y TASK-1007 fueron mergeadas previamente a `development` (PR #5
squash + integration branches). Esta rama añade únicamente TASK-1001 y la documentación de
cierre de Fase 1.*
