# Risk Register — AncloraVisionFlow Fase 0
**Fecha:** 2026-06-21

| ID | Descripción | Severidad | Estado | Tarea | Gate |
|---|---|---|---|---|---|
| RISK-CADDY-001 | Proxy XTransformPort permite SSRF vía query param a cualquier localhost:PORT | CRÍTICA | ACTIVO → TASK-0001 | TASK-0001 | GATE-CADDY-001 |
| RISK-TS-001 | ignoreBuildErrors: true en producción — errores TS silenciados | ALTA | ACTIVO → TASK-0002 | TASK-0002 | GATE-TS-001 |
| RISK-AUTH-001 | Sin auth en ninguna ruta API (maps, catalog, generate) | CRÍTICA | BLOQUEADO | TASK-0005 | GATE-AUTH-001/DEC-AUTH-001 |
| RISK-SDK-001 | z-ai-web-dev-sdk propietario y opaco (sin repositorio OSS verificable) | ALTA | BLOQUEADO | TASK-0003 | GATE-OSS-001/DEC-OSS-001 |
| RISK-INJ-001 | agentsMd/readme incluidos en prompts LLM sin sanitizar (slice no es sanitización) | CRÍTICA | ACTIVO → TASK-0004 | TASK-0004 | — |
| RISK-SCHEMA-001 | VisionMapRecord sin userId/workspaceId — datos no aislados por workspace | ALTA | MITIGADO PARCIAL | TASK-1001 | GATE-DB-001 |
| RISK-NEXUS-001 | Sin contrato Nexus firmado | ALTA | BLOQUEADO | TASK-1004 | GATE-NEXUS-001/DEC-NEXUS-001 |
| RISK-ZOD-001 | Rutas POST maps y catalog aceptan body sin validación Zod | ALTA | ACTIVO → TASK-0006 | TASK-0006 | — |
| RISK-HEADERS-001 | Sin security headers HTTP (CSP, X-Frame-Options, etc.) en next.config.ts | MEDIA | ACTIVO → TASK-0008 | TASK-0008 | — |
| RISK-MIGRATE-001 | Migración baseline no es auto-aplicable a DBs preexistentes sin historial Prisma | MEDIA | MITIGADO | TASK-1006 | — |
| RISK-TOKENS-001 | tokensUsed era client-reported en POST /maps — no verificable server-side post-generación | BAJA | MITIGADO | TASK-1006 | — |
| RISK-RATE-001 | Sin rate limit en `/api/vision/generate` permite abuso/coste LLM accidental | ALTA | MITIGADO | TASK-1007 | — |
| RISK-RATE-002 | Rate limit local no coordina múltiples réplicas ni sobrevive reinicios | MEDIA | ACEPTADO | TASK-1007 | DEC-DB-001 |
| RISK-RATE-003 | Next.js standalone escucha en `0.0.0.0` si se arranca sin `HOSTNAME` explícito | ALTA | MITIGADO | TASK-1007 | — |
| RISK-RECEIPT-SECRET-001 | `VISIONFLOW_GENERATION_RECEIPT_SECRET` efímero invalida recibos tras restart | BAJA | OPERATIVO | TASK-1006 | — |
| RISK-WORKSPACE-001 | Modo compatibilidad usa un único workspace canónico hasta auth/workspace selector | MEDIA | ACEPTADO | TASK-1001 | GATE-DB-001 |
| RISK-WORKSPACE-002 | Migración TASK-1001 reconstruye tablas SQLite; requiere backup y validación real antes de producción | ALTA | MITIGADO | TASK-1001 | GATE-DB-001 |

## Notas de evidencia

### RISK-CADDY-001
Caddyfile líneas 2-13: `@transform_port_query { query XTransformPort=* }` → `reverse_proxy localhost:{query.XTransformPort}`. Cualquier cliente puede hacer `GET /?XTransformPort=6379` para acceder a Redis local.

### RISK-INJ-001
`anclora-catalog.ts` línea 73: `a.agentsMd.slice(0, 300).replace(/\s+/g, " ")` — el replace de espacios no es sanitización. Contenido de AGENTS.md importado desde repos externos (via import-github) se incluye verbatim en el system prompt del LLM.

### RISK-MIGRATE-001

La migración `20260621062333_add_generation_metadata` es una migración baseline inicial: su SQL contiene `CREATE TABLE` para los tres modelos completos. No puede aplicarse directamente sobre una base SQLite preexistente (la que fue creada antes de TASK-1006 con `prisma db push` o raw SQL sin historial `_prisma_migrations`). Intento de `prisma migrate deploy` sobre base preexistente falla con `P3005`.

**Ruta A — entorno nuevo, sin tablas existentes:**

```bash
bunx prisma migrate deploy
```

**Ruta B — entorno legacy, con tablas existentes y sin `_prisma_migrations`:**

1. Crear una copia de seguridad verificable de SQLite:

   ```bash
   sqlite3 db.sqlite ".backup 'db.sqlite.backup'"
   sqlite3 db.sqlite.backup "PRAGMA integrity_check;"
   ```

2. Validar que las tablas y columnas preexistentes coinciden con el esquema anterior esperado:

   ```bash
   sqlite3 db.sqlite "PRAGMA table_info('VisionMapRecord');"
   sqlite3 db.sqlite "SELECT COUNT(*) FROM VisionMapRecord;"
   ```

3. Aplicar las tres columnas nuevas en la base real legacy:

   ```bash
   sqlite3 db.sqlite "ALTER TABLE VisionMapRecord ADD COLUMN promptVersion TEXT;"
   sqlite3 db.sqlite "ALTER TABLE VisionMapRecord ADD COLUMN llmModel TEXT;"
   sqlite3 db.sqlite "ALTER TABLE VisionMapRecord ADD COLUMN tokensUsed INTEGER;"
   ```

4. Verificar con inspección SQLite real que existen exactamente las columnas nuevas y son nullable:

   ```bash
   sqlite3 db.sqlite "PRAGMA table_info('VisionMapRecord');"
   ```

   Los campos nuevos deben aparecer como `promptVersion TEXT notnull=0`,
   `llmModel TEXT notnull=0` y `tokensUsed INTEGER notnull=0`.

5. Comprobar preservación del número de filas y una muestra de datos:

   ```bash
   sqlite3 db.sqlite "SELECT COUNT(*) FROM VisionMapRecord;"
   sqlite3 db.sqlite "SELECT id,title,idea,summary,promptVersion,llmModel,tokensUsed FROM VisionMapRecord LIMIT 5;"
   ```

6. Solo entonces marcar la migración como aplicada:

   ```bash
   DATABASE_URL="file:./db.sqlite" bunx prisma migrate resolve --applied 20260621062333_add_generation_metadata
   ```

7. Regenerar cliente, validar Prisma, tests y build:

   ```bash
   bunx prisma generate
   bunx prisma validate
   bun run test
   bun run build
   ```

`prisma migrate status` puede complementar el cierre, pero no es prueba única de que el esquema real sea correcto. Debe ir precedido por `PRAGMA table_info('VisionMapRecord')` y verificación de filas/datos.

Probado en copia temporal `/tmp/visionflow-legacy-Hpt7m9/legacy.sqlite`: una fila legacy preservada, columnas nuevas nullable (`notnull=0`) y `migrate resolve` ejecutado después del `ALTER`.

### RISK-TOKENS-001

Mitigación aplicada: `/api/vision/generate` emite `generationReceipt`, un recibo HMAC de vida corta ligado al hash canónico del mapa generado. `POST /api/vision/maps` ignora siempre `promptVersion`, `llmModel` y `tokensUsed` del payload libre y solo persiste los metadatos si el recibo es válido, no ha caducado y corresponde al mapa. Sin recibo válido, los tres campos se persisten como `null`.

### RISK-RATE-001

Mitigación aplicada: `POST /api/vision/generate` ejecuta un rate limit en memoria antes de leer
el body, cargar catálogo o llamar al proveedor LLM. Default: 10 peticiones por 60 segundos por IP,
con `Retry-After` en respuestas 429. Variables configurables:

- `VISIONFLOW_GENERATE_RATE_LIMIT_REQUESTS`: default `10`, rango `1..1000`.
- `VISIONFLOW_GENERATE_RATE_LIMIT_WINDOW_SECONDS`: default `60`, rango `1..3600`.
- `VISIONFLOW_GENERATE_RATE_LIMIT_MAX_KEYS`: default `1000`, rango `10..100000`.
- `VISIONFLOW_TRUST_PROXY_HEADERS`: default `false`; solo `true` confía en `X-Real-IP` y
  `X-Forwarded-For` saneados por Caddy.

Si faltan o están fuera de rango, se usan defaults. El estado no guarda prompts, mapas, API keys
ni contenido libre; solo clave IP, contador, `resetAt` y `lastSeenAt`.
En modo directo/no confiable se ignoran headers IP enviados por cliente y se usa la clave conservadora
`ip:direct`.

### RISK-RATE-002

Limitación aceptada para TASK-1007: el contador es local por proceso, se reinicia al reiniciar
la instancia y no coordina varias réplicas. Si la app escala horizontalmente, este control no debe
presentarse como rate limit distribuido de producción; requerirá diseño posterior con storage
compartido aprobado.

### RISK-RATE-003

Evidencia: `.next/standalone/server.js` define `hostname = process.env.HOSTNAME || '0.0.0.0'`.
Antes de la corrección, `bun run start` no fijaba `HOSTNAME`, por lo que Next podía quedar expuesto
directamente en el puerto 3000 si la red/firewall lo permitía. Mitigación aplicada: `bun run start`
exporta `HOSTNAME=127.0.0.1`; Caddy permanece como entrada en `:81` y reenvía a `localhost:3000`.
Si staging/producción usan otro supervisor o comando, deben conservar `HOSTNAME=127.0.0.1` o un
aislamiento equivalente. No confiar en headers de IP salvo `VISIONFLOW_TRUST_PROXY_HEADERS=true`
detrás de Caddy confiable.

### RISK-RECEIPT-SECRET-001

Requisito operativo no bloqueante: `VISIONFLOW_GENERATION_RECEIPT_SECRET` debe configurarse de
forma persistente en staging y producción. El secreto efímero de arranque solo es aceptable para
desarrollo local.

### RISK-ZOD-001

`maps/route.ts` línea 41: body destructuring sin schema. `catalog/route.ts` línea 23: `fields` tipado como `Record<string, unknown>` pasado directamente a `updateCatalogAppFields`.

### RISK-SCHEMA-001

Mitigación TASK-1001: `VisionMapRecord` y `AncloraAppRecord` tienen `workspaceId` obligatorio y FK
`onDelete: Restrict` hacia `Workspace`. Todas las rutas actuales resuelven
`workspace_anclora_internal` en servidor y no aceptan workspace desde cliente.

Residual: todavía no hay auth ni selector de workspace; por tanto no se debe presentar como
multitenancy real. TASK-1002/auth debe introducir identidad verificable, membresías efectivas y
autorización por rol.

### RISK-WORKSPACE-001

Aceptado por GATE-DB-001: single-workspace compatibility mode hasta que se aprueben auth, selector y
RBAC efectivo. Los payloads con `workspaceId`, `status`, `approvedById`, `approvedAt` o `reviewedById`
se ignoran en rutas actuales.

### RISK-WORKSPACE-002

Mitigación: migración versionada `20260621120000_add_workspace_governance` probada en base nueva con
`migrate deploy` y en copia legacy temporal con filas no triviales. Evidencia SQLite:

- `VisionMapRecord.workspaceId`: `TEXT notnull=1`.
- `AncloraAppRecord.workspaceId`: `TEXT notnull=1`.
- `PRAGMA foreign_key_check`: sin filas.
- Conteos legacy: `1|1->1|1`.
- Metadata TASK-1006 preservada: `promptVersion`, `llmModel`, `tokensUsed`.
