# Implementation Log — AncloraVisionFlow Fase 0

**Inicio:** 2026-06-21

## Plantilla de entrada por tarea

### TASK-XXXX — [ESTADO]

- Requisitos: REQ-...
- Diseño: DES-...
- Archivos modificados: ...
- Verificación: ...
- Riesgo residual: ...
- Rollback: git revert `<hash>`
- Commit: `<hash>`

---

## TASK-0007 — DONE (escaneo de secretos, sin cambios de código)

- Requisitos: REQ-SEC-008
- Diseño: DES-DEVOPS-002
- Archivos modificados: ninguno (verificación)
- Verificación: `git grep` scan ejecutado sobre todo el repo excluyendo .env*, node_modules, bun.lock
  - Hallazgos: upload/*.txt contiene strings placeholder (sk-ant-..., sk-ant-test, sk-ant-xxxxx, sk-ant-prod-key)
  - Evaluación: NO son claves reales — son strings de ejemplo/documentación en archivos de dump de repos importados
  - Ninguna clave API real hardcodeada en código fuente
- .gitignore: .env* cubierto — OK
- Riesgo residual: ninguno identificado (placeholders documentales, no secretos activos)
- Rollback: N/A (no hay cambios)
- Commit: N/A (tarea de verificación)

---

## TASK-0000 — DONE (preflight completo — setup de rama y artefactos)

- Fecha: 2026-06-21
- Rama creada: feat/visionflow-fase0-hardening (desde development, commit 48a5df2)
- Bun instalado: ~/.bun/bin/bun (849 packages en 26.97s)
- tsc --noEmit: 2 errores solo en examples/ (socket.io types) — src/ limpio
- Archivos creados: docs/implementation/{baseline,risk-register,decision-register,implementation-log,verification-matrix}.md
- Rollback: N/A
- Commit: N/A (batch de artefactos, sin código)

---

---

## TASK-0001 — DONE

- Requisitos: REQ-SEC-001
- Diseño: DES-SEC-001
- Archivos: Caddyfile
- Verificación: git grep "XTransformPort" → 0 líneas. Header block presente.
- Riesgo residual: ninguno para este vector. Auth sigue pendiente (TASK-0005).
- Rollback: git revert 93772ff
- Commit: 93772ff

## TASK-0008 — DONE

- Requisitos: REQ-SEC-009
- Diseño: DES-SEC-004
- Archivos: next.config.ts
- Verificación: headers() async presente con 5 cabeceras. Config existente intacta.
- Riesgo residual: headers requieren verificación con `curl -I` en entorno real tras bun run dev.
- Rollback: git revert 6443811
- Commit: 6443811

## TASK-0004 — DONE

- Requisitos: REQ-AI-006, REQ-ECOSYSTEM-006
- Diseño: DES-AI-004
- Archivos: src/lib/sanitize.ts (NUEVO), src/lib/sanitize.test.ts (NUEVO), src/app/api/vision/generate/route.ts
- Verificación: 9 test cases escritos (requieren vitest — TASK-1008). sanitizeCatalogContent aplicado en agentsMd línea 188 de generate/route.ts.
- Riesgo residual: anclora-catalog.ts tiene slice(0,300) en agentsMd en getCatalogForPrompt() pero ese path no se usa en el prompt final (sobreescrito por orderedCatalogText). No es riesgo activo.
- Rollback: git revert 7b977a8
- Commit: 7b977a8

## TASK-0006 — DONE

- Requisitos: REQ-SEC-004, REQ-SEC-007
- Diseño: DES-SEC-003
- Archivos: generate/route.ts, maps/route.ts, maps/[id]/route.ts, catalog/route.ts, catalog/[id]/route.ts
- Verificación: TS clean (excepto vitest types en sanitize.test.ts — preexistente). 5 rutas con safeParse. Errores internos no exponen err.message.
- Riesgo residual: schemas Zod validan forma del body pero no autorización — TASK-0005 pendiente.
- Rollback: git revert 2e56091
- Commit: 2e56091

---

## TASK-0002 — DONE

- Requisitos: REQ-SEC-002, DES-DEVOPS-001
- Archivos: next.config.ts
- Verificación: `ignoreBuildErrors: false`. `bun run build` pasa en verde (verificado 2026-06-21).
- Commit: 409bedd (cherry-pick desde feat/visionflow-fase0-hardening)

## TASK-0003 — DONE (DEC-OSS-001 resuelta)

- Requisitos: REQ-OSS-001, REQ-OSS-002, DES-AI-002
- Archivos: src/lib/llm-client.ts (nuevo), package.json, src/app/api/vision/generate/route.ts
- Decisión: OpenRouter + `openai` npm (OSS). Modelo default: `google/gemini-flash-1.5`.
- Nota: cliente inicializado lazy (factory `getLlmClient()`) para evitar validación en build.
- Commit: 409bedd + e9ac3aa

## TASK-0005 — DONE (DEC-AUTH-001 resuelta: API key interna)

- Requisitos: REQ-AUTH-001, REQ-SEC-003, DES-SEC-002
- Archivos: src/proxy.ts (nuevo — renombrado de middleware.ts por Next.js 16)
- Implementación: cabecera `x-api-key` verificada contra `VISIONFLOW_API_KEY` en todas las rutas `/api/vision/*`. Retorna 401 si falta o no coincide; 503 si la variable no está configurada.
- Commit: 409bedd + e9ac3aa

---

## TASK-1006 — DONE

- Requisitos: REQ-AI-002, REQ-AI-007, DES-AI-003
- Archivos:
  - src/lib/llm-client.ts — añadida constante exportada `PROMPT_VERSION = "v1.0.0"`
  - src/lib/vision-map.ts — añadidos campos opcionales `promptVersion?`, `llmModel?`, `tokensUsed?` a `VisionMap`
  - src/lib/generation-receipt.ts — recibo HMAC server-side con TTL y hash del mapa generado
  - prisma/schema.prisma — añadidos `promptVersion String?`, `llmModel String?`, `tokensUsed Int?` a `VisionMapRecord`
  - prisma/migrations/20260621062333_add_generation_metadata/ — migración versionada (inicial baseline + nuevos campos)
  - src/app/api/vision/generate/route.ts — captura `completion.usage?.total_tokens`, emite `generationReceipt`; GET devuelve `promptVersion` y `llmModel`
  - src/app/api/vision/maps/route.ts — persiste metadatos solo si `generationReceipt` es válido; incluye en GET list
  - src/app/api/vision/maps/[id]/route.ts — incluye metadatos en respuesta GET
  - src/lib/generation-metadata.test.ts — cobertura de recibo válido, alterado, caducado, sin recibo, `usage.total_tokens` ausente y privacidad
- Interpretación: `/api/vision/generate` devuelve un mapa con un recibo firmado y de vida corta. El recibo contiene solo `promptVersion`, `llmModel`, `tokensUsed`, `issuedAt`, `expiresAt`, `mapHash`, `nonce` y versión del recibo. No contiene prompt completo, API keys ni contenido del usuario.
- `tokensUsed`: usa `completion.usage?.total_tokens ?? null`. Nunca estimado ni aceptado desde payload libre del cliente.
- `promptVersion`, `llmModel` y `tokensUsed`: server-verifiable en POST /maps — el servidor ignora siempre los tres valores del cliente y solo persiste los valores del recibo si la firma, TTL y hash del mapa coinciden. Sin recibo, recibo caducado, alterado o no correspondiente al mapa, persiste `null` en los tres campos (mapa importado/no verificado).
- Compatibilidad histórica: campos nullable en schema — registros existentes quedan con null.
- Migración:
  - Entorno nuevo sin tablas existentes: `bunx prisma migrate deploy`.
  - Entorno legacy con tablas existentes y sin `_prisma_migrations`: backup verificable de SQLite, validación del esquema anterior esperado, tres `ALTER TABLE ... ADD COLUMN ...`, inspección real con `PRAGMA table_info('VisionMapRecord')`, verificación de conteo/muestra de datos y solo entonces `bunx prisma migrate resolve --applied 20260621062333_add_generation_metadata`.
- Rama: `feat/visionflow-task-1006-integrated` basada en `0783055` (tip de TASK-1008) para preservar continuidad de commits.
- Verificación correctiva: test focal 18/18 PASS, typecheck PASS, prueba legacy temporal PASS. Gates completos ejecutados en cierre correctivo.

---

## TASK-1007 — DONE

- Requisitos: REQ-AI-005, REQ-SEC-005
- Archivos:
  - src/lib/generation-rate-limit.ts — limitador local en memoria por proceso, TTL por ventana, capacidad máxima y modo explícito de proxy confiable
  - src/app/api/vision/generate/route.ts — aplica rate limit al inicio de `POST` antes de leer body, catálogo o LLM
  - src/lib/generation-rate-limit.test.ts — casos unitarios de límite, TTL, evicción, aislamiento y privacidad
  - src/app/api/vision/generate/route.test.ts — prueba 429 y no llamada al cliente LLM
  - package.json — script `typecheck` para el gate solicitado y `start` ligado a `127.0.0.1`
- Política aplicada: 10 peticiones por 60 segundos por clave, configurable por entorno.
- Variables:
  - `VISIONFLOW_GENERATE_RATE_LIMIT_REQUESTS`: default `10`, rango `1..1000`.
  - `VISIONFLOW_GENERATE_RATE_LIMIT_WINDOW_SECONDS`: default `60`, rango `1..3600`.
  - `VISIONFLOW_GENERATE_RATE_LIMIT_MAX_KEYS`: default `1000`, rango `10..100000`.
  - `VISIONFLOW_TRUST_PROXY_HEADERS`: default `false`; solo `true` permite usar `X-Real-IP`/`X-Forwarded-For`.
  - Valores ausentes o fuera de rango usan defaults seguros.
- Validación proxy: el standalone generado usa `HOSTNAME || '0.0.0.0'`; por tanto el estado previo era
  `DIRECT_ACCESS_POSSIBLE`. Corrección: `bun run start` define `HOSTNAME=127.0.0.1`.
- Clave: sin autenticación de usuario/workspace aprobada, se usa IP solo si
  `VISIONFLOW_TRUST_PROXY_HEADERS=true`. Detrás de Caddy confiable se prioriza `X-Real-IP`, que el
  Caddyfile sobrescribe con `{remote_host}`; fallback a primer `X-Forwarded-For`; sin proxy/headers se
  agrupa como `ip:local`. En modo directo/no confiable se ignoran headers y se usa `ip:direct`.
- Respuesta 429: JSON seguro en español con `code: "RATE_LIMITED"` y header `Retry-After`.
- Privacidad: el estado del limitador solo guarda clave IP normalizada, contador, reset y último uso.
  No guarda prompts, mapas, API keys ni contenido libre.
- Limitación conocida: control local por proceso, se reinicia con la instancia y no coordina réplicas.
- Nota operativa TASK-1006: `VISIONFLOW_GENERATION_RECEIPT_SECRET` debe configurarse persistente
  en staging/producción; secreto efímero solo para desarrollo local.
- Verificación focal: 9/9 tests PASS, typecheck PASS. Gates completos ejecutados en cierre.

---

## TASK-1001 — DONE

- Requisitos: REQ-AUTH-002, REQ-AUTH-003, REQ-PROP-001, REQ-PROP-002
- Diseño: DES-DATA-002, GATE-DB-001 aprobado con condiciones vinculantes
- Alcance: fundación de datos/gobernanza sin auth completa, sin selector de workspace, sin UI de
  miembros, sin Nexus, sin SyncXML y sin handoffs externos.
- Workspace canónico: `workspace_anclora_internal`, slug `anclora-internal`, creado por migración de
  forma determinista e idempotente para bases nuevas.
- Archivos:
  - prisma/schema.prisma — modelos `Workspace`, `WorkspaceMember`, relaciones de ownership,
    aprobación y revisión, `workspaceId` obligatorio en mapas/catálogo, `@@unique([workspaceId, slug])`.
  - prisma/migrations/20260621120000_add_workspace_governance/migration.sql — migración versionada
    con reconstrucción SQLite para `workspaceId NOT NULL`, preservación de filas y metadata TASK-1006.
  - src/lib/workspace-context.ts — workspace canónico server-side y validadores centrales de roles/estados.
  - src/app/api/vision/maps/route.ts y maps/[id]/route.ts — list/read/update/delete/save scoped por
    workspace resuelto en servidor; `workspaceId`, estados y aprobaciones del payload libre se ignoran.
  - src/lib/anclora-catalog.ts — catálogo scoped por workspace, upsert por `[workspaceId, slug]`,
    update/delete con comprobación scoped previa.
  - Tests TASK-1001 — migración legacy SQLite, base canónica, scoped maps, catálogo scoped, rechazo de
    governance forged, validación de roles/estados y privacidad de scope.
- Estrategia sin autenticación: single-workspace compatibility mode. Las rutas actuales resuelven
  `workspace_anclora_internal` internamente y no aceptan workspace desde body/query/cookies/UI.
- Datos históricos: mapas a `draft`, catálogo a `active`, `ownerId`, `approvedById` y `reviewedById`
  quedan `null` al no existir identidad verificable. No se inventan usuarios ni memberships.
- Nueva base: `DATABASE_URL=file:./new-test.sqlite bunx prisma migrate deploy` aplicado en copia temporal;
  workspace canónico creado, `PRAGMA foreign_key_check` limpio, `workspaceId` obligatorio verificado.
- Legacy temporal: `/tmp/visionflow-task1001-legacy-QOmZ4X/legacy.sqlite`, 1 `VisionMapRecord` y 1
  `AncloraAppRecord`; conteos `1|1->1|1`, JSON/connections/tags/catálogo/metadata TASK-1006 preservados.
- Gates: lint PASS, typecheck PASS, test PASS (72/72), build PASS, `prisma validate` PASS.
- Riesgo residual: no es multitenancy real hasta TASK-1002/auth/selector; el workspace canónico es modo
  compatibilidad de un solo workspace.
- Rollback: revertir commits TASK-1001 y restaurar backup SQLite previo a migración.

### Runbook de migración SQLite — TASK-1001 (GATE-DB-001)

**PROHIBICIÓN ABSOLUTA:** No usar `prisma db push` en ninguna ruta. `prisma migrate status` informa del estado del historial de migraciones, pero no sustituye las verificaciones SQLite reales con `PRAGMA`.

**Verificaciones SQLite obligatorias** (aplicar en las tres rutas antes y después):

```bash
# Contar filas ANTES (anotar para comparar)
sqlite3 "$DB" "SELECT COUNT(*) FROM VisionMapRecord; SELECT COUNT(*) FROM AncloraAppRecord;" 2>/dev/null || true

# Verificar esquema de tablas clave
sqlite3 "$DB" "PRAGMA table_info('VisionMapRecord');"
sqlite3 "$DB" "PRAGMA table_info('AncloraAppRecord');"
sqlite3 "$DB" "PRAGMA table_info('Workspace');"

# Verificar integridad referencial
sqlite3 "$DB" "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"  # debe devolver 0 filas

# Verificar índices
sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;"

# Contar filas DESPUÉS y comparar
sqlite3 "$DB" "SELECT COUNT(*) FROM VisionMapRecord; SELECT COUNT(*) FROM AncloraAppRecord; SELECT COUNT(*) FROM Workspace;"
```

**Condición de abortar:** Si `PRAGMA foreign_key_check` devuelve cualquier fila, o si `COUNT(*)` post-migración es menor al pre-migración → detener y restaurar desde backup.

---

#### Ruta 1: Base nueva (sin tablas)

**Precondiciones:** Base SQLite vacía o inexistente. Sin `_prisma_migrations`.

**Procedimiento:**

```bash
# 1. Aplicar ambas migraciones en orden
DATABASE_URL="file:./dev.db" bunx prisma migrate deploy

# 2. Verificar
sqlite3 dev.db "SELECT COUNT(*) FROM Workspace;"                  # debe devolver 1
sqlite3 dev.db "SELECT slug FROM Workspace;"                      # 'anclora-internal'
sqlite3 dev.db "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;" # 0 filas
sqlite3 dev.db "PRAGMA table_info('VisionMapRecord');" | grep -E "workspaceId|promptVersion"
```

**Rollback:** No aplica (base vacía nueva).

---

#### Ruta 2: Base legacy anterior a TASK-1006 (tablas sin `_prisma_migrations`)

**Precondiciones:** Tablas `User`, `VisionMapRecord` (sin `promptVersion/llmModel/tokensUsed/workspaceId`), `AncloraAppRecord` (sin `workspaceId`) presentes. Sin tabla `_prisma_migrations`.

**Backup:**

```bash
cp dev.db dev.db.backup-pre-task1001-$(date +%Y%m%d%H%M%S)
```

**Procedimiento:**

```bash
DB="dev.db"
# 1. Anotar conteos pre-migración
MAPS_BEFORE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM VisionMapRecord;")
APPS_BEFORE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM AncloraAppRecord;")
echo "Antes: VisionMapRecord=$MAPS_BEFORE, AncloraAppRecord=$APPS_BEFORE"

# 2. Verificar que las columnas TASK-1006 NO existen aún
sqlite3 "$DB" "PRAGMA table_info('VisionMapRecord');" | awk -F'|' '{print $2}' | grep -E "promptVersion|llmModel|tokensUsed" \
  && echo "COLUMNAS YA PRESENTES — omitir paso 3" \
  || echo "Columnas ausentes — aplicar paso 3"

# 3. Añadir columnas de TASK-1006 (nullable, no destructivo)
sqlite3 "$DB" "ALTER TABLE VisionMapRecord ADD COLUMN promptVersion TEXT;"
sqlite3 "$DB" "ALTER TABLE VisionMapRecord ADD COLUMN llmModel TEXT;"
sqlite3 "$DB" "ALTER TABLE VisionMapRecord ADD COLUMN tokensUsed INTEGER;"

# 4. Verificar columnas añadidas
sqlite3 "$DB" "PRAGMA table_info('VisionMapRecord');" | awk -F'|' '{print $2}' | grep -E "promptVersion|llmModel|tokensUsed"

# 5. Marcar baseline de TASK-1006 como ya aplicada (sin ejecutar su SQL)
DATABASE_URL="file://$DB" bunx prisma migrate resolve \
  --applied 20260621062333_add_generation_metadata

# 6. Aplicar migración de TASK-1001 (workspace governance)
DATABASE_URL="file://$DB" bunx prisma migrate deploy

# 7. Verificaciones post-migración
MAPS_AFTER=$(sqlite3 "$DB" "SELECT COUNT(*) FROM VisionMapRecord;")
APPS_AFTER=$(sqlite3 "$DB" "SELECT COUNT(*) FROM AncloraAppRecord;")
echo "Después: VisionMapRecord=$MAPS_AFTER, AncloraAppRecord=$APPS_AFTER"
[ "$MAPS_AFTER" = "$MAPS_BEFORE" ] && [ "$APPS_AFTER" = "$APPS_BEFORE" ] \
  && echo "CONTEOS OK" || echo "ERROR: pérdida de filas"

sqlite3 "$DB" "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"
sqlite3 "$DB" "SELECT slug FROM Workspace;"                       # anclora-internal
sqlite3 "$DB" "PRAGMA table_info('VisionMapRecord');" | awk -F'|' '{print $2}' | grep workspaceId
sqlite3 "$DB" "SELECT workspaceId FROM VisionMapRecord LIMIT 3;"  # workspace_anclora_internal
```

**Rollback:**

```bash
cp dev.db.backup-pre-task1001-<TIMESTAMP> dev.db
```

---

#### Ruta 3: Base actualizada hasta TASK-1006 (con `_prisma_migrations`)

**Precondiciones:** Tablas con `promptVersion/llmModel/tokensUsed` presentes. `_prisma_migrations` tiene entrada para `20260621062333_add_generation_metadata`. Sin `Workspace` ni `workspaceId`.

**Backup:**

```bash
cp dev.db dev.db.backup-pre-task1001-$(date +%Y%m%d%H%M%S)
```

**Procedimiento:**

```bash
DB="dev.db"
# 1. Validar estado actual de migraciones
DATABASE_URL="file://$DB" bunx prisma migrate status
# Debe mostrar: 1 migration already applied, 1 pending

# 2. Anotar conteos
MAPS_BEFORE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM VisionMapRecord;")
APPS_BEFORE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM AncloraAppRecord;")

# 3. Aplicar migración de TASK-1001
DATABASE_URL="file://$DB" bunx prisma migrate deploy

# 4. Verificaciones post-migración (idénticas a Ruta 2 desde el paso 7)
MAPS_AFTER=$(sqlite3 "$DB" "SELECT COUNT(*) FROM VisionMapRecord;")
APPS_AFTER=$(sqlite3 "$DB" "SELECT COUNT(*) FROM AncloraAppRecord;")
[ "$MAPS_AFTER" = "$MAPS_BEFORE" ] && [ "$APPS_AFTER" = "$APPS_BEFORE" ] \
  && echo "CONTEOS OK" || echo "ERROR: pérdida de filas"

sqlite3 "$DB" "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"
sqlite3 "$DB" "SELECT slug FROM Workspace;"
sqlite3 "$DB" "SELECT workspaceId FROM VisionMapRecord LIMIT 3;"
```

**Rollback:**

```bash
cp dev.db.backup-pre-task1001-<TIMESTAMP> dev.db
```

---

#### Matriz resumen

| Estado de base | Ruta | Migración 1 | Migración 2 |
| --- | --- | --- | --- |
| Nueva, sin tablas | Ruta 1 | `migrate deploy` la crea | `migrate deploy` la aplica |
| Legacy sin `_prisma_migrations` | Ruta 2 | ALTER TABLE manual + `resolve --applied` | `migrate deploy` la aplica |
| Ya actualizada a TASK-1006 | Ruta 3 | Ya aplicada | `migrate deploy` la aplica |

---

## TASK-1008 — DONE

- Requisitos: REQ-QA-001, REQ-QA-002, DES-DEC-009
- Archivos:
  - vitest.config.ts (nuevo)
  - vitest.setup.ts (nuevo)
  - src/lib/llm-utils.ts (nuevo — repairTruncatedJson extraído de generate/route.ts)
  - src/lib/llm-utils.test.ts (nuevo — 7 casos)
  - src/lib/vision-map.test.ts (nuevo — 9 casos)
  - src/components/vision/VisionNodeCard.test.tsx (nuevo — 4 casos)
  - src/lib/sanitize.test.ts — 9 casos (ya existía desde TASK-0004, commit 7b977a8)
  - package.json — scripts `test` y `test:watch`
- Verificación: 29/29 tests PASS. lint PASS. typecheck PASS. build PASS.
- Gates:
  - lint: `eslint .` → 0 errores
  - typecheck: `bunx tsc --noEmit` → 0 errores
  - test: `vitest run` → 29/29
  - build: `bun run build` → compilación exitosa
- Fixes incluidos en cierre correctivo:
  - getLlmClient() lazy (evita SDK key validation en build)
  - middleware.ts → proxy.ts (Next.js 16 convention)
- Commits: 513b951 + e9ac3aa
