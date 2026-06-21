# DESIGN — AncloraVisionFlow
**Versión:** 1.0.0 | **Fecha:** 2026-06-21 | **Estado:** BORRADOR APROBABLE
**Equipo autor:** Staff Architect · Security/AI Governance · UX/UI Lead · DevOps · OSS Evaluator · Ecosystem Integration Architect

> **Convenciones:** Mismas etiquetas que REQUIREMENTS.md (`[VERIFICADO]`, `[INFERENCIA]`, `[PROPUESTA]`, `[DECISIÓN PENDIENTE]`, `[NO VERIFICADO]`).
> Las decisiones de diseño se identifican con `DES-XXX-NNN`.

---

## 1. Principios de Diseño

| # | Principio | Implicación |
|---|---|---|
| P1 | **Open Source First** | Toda nueva dependencia debe ser OSS, self-hostable y reversible. Propietario solo con gate de aprobación humana. |
| P2 | **Human-in-the-loop** | El sistema propone; el humano decide. Ninguna IA escribe en sistemas externos sin confirmación explícita. |
| P3 | **Seguridad por diseño** | Auth antes de negocio. Validación en boundary. Sanitización de todo contenido importado. |
| P4 | **Trazabilidad** | Cada recurso tiene propietario, workspace, timestamp. Cada acción sensible deja auditoría. |
| P5 | **Modularidad de fases** | El sistema funciona en cada fase sin dependencia de la fase siguiente. No se construye lo que no se necesita ahora. |
| P6 | **SDD (Spec-Driven Development)** | Esta spec es la fuente canónica. Los agentes implementan contra ella. No se añade lógica no especificada. |

---

## 2. Arquitectura General

### DES-ARCH-001 · Topología del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                        │
│   VisionBoard (React 19 + Tailwind v4 + Framer Motion)      │
│   Zustand store · @tanstack/react-query · @dnd-kit          │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────┐
│              CADDY (reverse proxy — puerto 81)               │
│   FASE 0: eliminar bloque XTransformPort [GATE-CADDY-001]   │
│   Modo final: solo → localhost:3000                          │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│               NEXT.JS 16 App Router (puerto 3000)            │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │ /api/vision/ │  │ /api/vision/   │  │ /api/vision/    │ │
│  │   generate   │  │     maps       │  │    catalog      │ │
│  └──────┬───────┘  └───────┬────────┘  └────────┬────────┘ │
│         │                  │                     │          │
│  ┌──────▼──────────────────▼─────────────────────▼────────┐ │
│  │              Prisma Client (ORM)                        │ │
│  └──────────────────────────┬──────────────────────────────┘ │
└─────────────────────────────│───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    SQLite (dev/prod v1)                      │
│   VisionMapRecord · AncloraAppRecord · User                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              LLM Provider (via AI SDK — OSS First)          │
│   DEC-OSS-001 [DECISIÓN PENDIENTE]:                         │
│   Opción A: SDK oficial Anthropic (@anthropic-ai/sdk) ✅ OSS │
│   Opción B: SDK openai npm (multiproveedor) ✅ OSS          │
│   Opción C: z-ai-web-dev-sdk 0.0.18 ⚠️ propietario/opaco   │
└─────────────────────────────────────────────────────────────┘
```

`[VERIFICADO]` Stack actual: Next.js 16.1.1, React 19, Tailwind v4, Prisma 6.11.1 + SQLite, z-ai-web-dev-sdk 0.0.18.

### DES-ARCH-002 · Modo standalone
El build de Next.js usa `output: "standalone"` `[VERIFICADO en next.config.ts]`, lo que permite despliegue como proceso Node/Bun sin servidor Next completo. Compatible con Caddy como reverse proxy.

---

## 3. Dominio y Modelo de Datos

### DES-DATA-001 · Modelos actuales (verificados)

```prisma
// [VERIFICADO en prisma/schema.prisma]

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime
  updatedAt DateTime
  // DEFICIENCIA: no relacionado con VisionMapRecord ni AncloraAppRecord
}

model VisionMapRecord {
  id              String   @id @default(cuid())
  title           String
  idea            String
  summary         String
  appsJson        String   // JSON array de slugs
  nodesJson       String   // JSON array de VisionNode
  connectionsJson String
  palette         String   @default("anclora")
  tags            String   @default("") // comma-separated
  starred         Boolean  @default(false)
  createdAt       DateTime
  updatedAt       DateTime
  // AUSENTE: userId, workspaceId, status, approvedAt, approvedBy
}

model AncloraAppRecord {
  id               String   @id @default(cuid())
  slug             String   @unique
  name             String
  family           String   // Premium | Internal | Tool | Platform
  tagline          String
  description      String
  stackJson        String
  capabilitiesJson String
  accent           String
  domain           String
  source           String   // manual | txt-import | github-import | default
  githubUrl        String?
  readme           String
  agentsMd         String   // ⚠️ incluido en prompts LLM sin sanitización
  createdAt        DateTime
  updatedAt        DateTime
  // AUSENTE: workspaceId, reviewedBy, reviewedAt, status, commitSha
}
```

### DES-DATA-002 · Esquema objetivo Fase 1 (propuesta)

```prisma
// [PROPUESTA — requiere GATE-DB-001]

model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  llmPolicy Json     // { provider, model, maxTokensPerMonth, allowedDataTypes }
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members      WorkspaceMember[]
  visionMaps   VisionMapRecord[]
  catalogApps  AncloraAppRecord[]
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  workspaceId String
  userId      String
  role        String    // viewer | editor | admin
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
  @@unique([workspaceId, userId])
}

// VisionMapRecord ampliado:
model VisionMapRecord {
  // ... campos actuales ...
  workspaceId  String
  ownerId      String
  status       String    @default("draft") // draft | review | approved | handed_off | archived
  approvedAt   DateTime?
  approvedById String?
  promptVersion String?  // versión del prompt usado en generación
  llmModel     String?   // modelo LLM usado
  tokensUsed   Int?
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
  owner        User      @relation("MapOwner", fields: [ownerId], references: [id])
}

// AncloraAppRecord ampliado:
model AncloraAppRecord {
  // ... campos actuales ...
  workspaceId  String
  reviewedBy   String?
  reviewedAt   DateTime?
  status       String   @default("active") // active | deprecated | under_review
  commitSha    String?
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
}
```

---

## 4. API Design

### DES-API-001 · Rutas existentes verificadas

| Método | Ruta | Función | Auth actual | Auth objetivo |
|---|---|---|---|---|
| POST | `/api/vision/generate` | Genera VisionMap via LLM | ❌ ninguna | ✅ editor+ |
| GET | `/api/vision/generate` | Health/info | ❌ ninguna | ✅ viewer+ |
| GET | `/api/vision/maps` | Lista mapas | ❌ ninguna | ✅ viewer+ (workspace) |
| POST | `/api/vision/maps` | Crea mapa | ❌ ninguna | ✅ editor+ |
| GET | `/api/vision/maps/[id]` | Obtiene mapa | ❌ ninguna | ✅ viewer+ (workspace) |
| PUT/PATCH | `/api/vision/maps/[id]` | Actualiza mapa | ❌ ninguna | ✅ editor+ (owner) |
| DELETE | `/api/vision/maps/[id]` | Elimina mapa | ❌ ninguna | ✅ admin o owner |
| GET | `/api/vision/catalog` | Lista catálogo | ❌ ninguna | ✅ viewer+ |
| POST | `/api/vision/catalog` | Crea app catálogo | ❌ ninguna | ✅ admin |
| GET | `/api/vision/catalog/[id]` | Detalle app | ❌ ninguna | ✅ viewer+ |
| PUT | `/api/vision/catalog/[id]` | Actualiza app | ❌ ninguna | ✅ admin |
| DELETE | `/api/vision/catalog/[id]` | Elimina app | ❌ ninguna | ✅ admin |
| POST | `/api/vision/catalog/import-github` | Importa desde GitHub | ❌ ninguna | ✅ admin |
| POST | `/api/vision/catalog/import-txt` | Importa .txt | ❌ ninguna | ✅ admin |

`[VERIFICADO]` — todas las rutas existen en el filesystem pero sin protección de auth.

### DES-API-002 · Rutas nuevas propuestas (Fase 1)

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/vision/maps/[id]/submit` | Cambiar estado → review |
| POST | `/api/vision/maps/[id]/approve` | Cambiar estado → approved (admin) |
| POST | `/api/vision/maps/[id]/handoff/nexus` | Genera borrador Nexus (requiere aprobación previa) |
| GET | `/api/health` | Health check: DB + LLM |
| GET | `/api/auth/[...nextauth]` | Next-auth handler |

### DES-API-003 · Patrón de respuesta de error

```typescript
// Actual (parcial): { error: err.message } — expone internos [VERIFICADO en generate/route.ts:350]
// Objetivo:
interface ApiError {
  code: string;         // "UNAUTHORIZED" | "VALIDATION_ERROR" | "LLM_UNAVAILABLE" | etc.
  message: string;      // mensaje user-facing, sin detalles internos
  requestId?: string;   // para correlación en logs
}
```

---

## 5. Arquitectura del Motor IA

### DES-AI-001 · Flujo de generación actual

```
POST /api/vision/generate
  │
  ├─ 1. Validar body (idea.length >= 3)
  ├─ 2. getCatalogForPrompt(8) → catalogText + allSlugs
  ├─ 3. Filtrar relevantApps por keyword matching sobre idea
  ├─ 4. buildSystemPrompt(catalogText, allSlugs)
  ├─ 5. ZAI.create() → zai.chat.completions.create({ messages, temperature: 0.6, max_tokens: 2400 })
  ├─ 6. Extraer JSON de respuesta (strip markdown fences)
  ├─ 7. repairTruncatedJson() si falla parse
  ├─ 8. Normalizar + validar nodos (categorías, límites de string)
  ├─ 9. layoutVisionMap() → posicionamiento radial
  ├─ 10. autoConnect() → conexiones automáticas
  └─ 11. Retornar VisionMap
```
`[VERIFICADO en src/app/api/vision/generate/route.ts]`

### DES-AI-002 · Decisión OSS para el proveedor LLM

**DEC-OSS-001 [DECISIÓN PENDIENTE — GATE-OSS-001]**

Comparativa:

| Opción | Paquete | OSS | Self-hostable | Auditabilidad | Nota |
|---|---|---|---|---|---|
| A | `@anthropic-ai/sdk` | ✅ | ✅ (via Bedrock/local proxy) | ✅ headers auditables | Recomendada si proveedor = Anthropic |
| B | `openai` npm | ✅ | ✅ (compatible con Ollama, vLLM) | ✅ | Recomendada si multiproveedor |
| C | `z-ai-web-dev-sdk` | ❌ no OSS verificable | ❌ opaco | ❌ sin docs públicos | **Requiere reemplazo en Fase 0 o 1** |
| D | `ai` (Vercel AI SDK) | ✅ | ✅ | ✅ | Alternativa si se usa streaming |

**Recomendación del OSS Evaluator:** Opción A o B. Opción C debe ser reemplazada antes de producción porque viola REQ-OSS-001 y REQ-AI-002.

El reemplazo es drop-in: la interfaz `zai.chat.completions.create({messages, temperature, max_tokens})` es compatible con el SDK oficial de OpenAI y con `@anthropic-ai/sdk` (con adaptador mínimo).

### DES-AI-003 · Versionado del prompt del sistema

```typescript
// [PROPUESTA — actualmente hardcoded sin versión]
const PROMPT_VERSION = "v1.0.0";

interface GenerationMetadata {
  promptVersion: string;
  llmProvider: string;
  llmModel: string;
  tokensIn: number;
  tokensOut: number;
  generatedAt: string;
}
```

El objeto `GenerationMetadata` debe persistirse en `VisionMapRecord.promptVersion` y campos relacionados (ver DES-DATA-002).

### DES-AI-004 · Sanitización de contenido del catálogo

```typescript
// [PROPUESTA — implementar antes de incluir readme/agentsMd en prompts]
function sanitizeCatalogContent(raw: string): string {
  // Elimina patrones de prompt injection conocidos:
  // - "Ignore previous instructions"
  // - Delimitadores de sistema: <system>, [SYSTEM], ###SYSTEM###, etc.
  // - Instrucciones de override de permisos
  // - Patrones de jailbreak comunes
  return raw
    .replace(/<system[^>]*>[\s\S]*?<\/system>/gi, "")
    .replace(/\[SYSTEM\][\s\S]*?\[\/SYSTEM\]/gi, "")
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, "[REDACTADO]")
    .replace(/you\s+are\s+now\s+/gi, "[REDACTADO]")
    .slice(0, 500); // límite hard de 500 chars por campo
}
```
Cumple: REQ-AI-006, REQ-ECOSYSTEM-006, REQ-SEC-006.

---

## 6. Diseño de Seguridad

### DES-SEC-001 · Caddy en Fase 0

**Caddyfile actual (RIESGO CRÍTICO):** `[VERIFICADO]`
```caddy
handle @transform_port_query {
  reverse_proxy localhost:{query.XTransformPort}  // ← ELIMINAR
}
```

**Caddyfile objetivo Fase 0:**
```caddy
:81 {
  handle {
    reverse_proxy localhost:3000 {
      header_up Host {host}
      header_up X-Forwarded-For {remote_host}
      header_up X-Forwarded-Proto {scheme}
      header_up X-Real-IP {remote_host}
    }
  }
  # Headers de seguridad
  header {
    X-Frame-Options "DENY"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
  }
}
```
Cumple: REQ-SEC-001, REQ-SEC-009.

### DES-SEC-002 · Middleware de autenticación Next.js

```typescript
// src/middleware.ts [PROPUESTA]
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ["/api/vision/:path*", "/((?!api/auth|_next|favicon).*)"],
};
```
Cumple: REQ-AUTH-001, REQ-SEC-003.

### DES-SEC-003 · Validación de entrada con Zod

```typescript
// Patrón objetivo para todas las rutas POST [PROPUESTA]
import { z } from "zod";

const GenerateSchema = z.object({
  idea: z.string().min(3).max(2000).trim(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = GenerateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: result.error.message }, { status: 400 });
  }
  // ...
}
```
Cumple: REQ-SEC-004, REQ-SEC-007.

### DES-SEC-004 · Headers de seguridad en Next.js

```typescript
// next.config.ts [PROPUESTA — añadir a la config actual]
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
```
Cumple: REQ-SEC-009.

---

## 7. Diseño del Flujo de Propuestas y Aprobaciones

### DES-FLOW-001 · Máquina de estados de una propuesta

```
                    [editor]              [admin/revisor]
VisionMap generado ──────────► draft ──────────────────► review
                                 │                          │
                                 │◄─── rechazar ────────────┤
                                 │                          │
                                 │                     [admin] aprobar
                                 │                          │
                                 │                          ▼
                                 │                       approved
                                 │                          │
                                 │                    [editor] solicitar handoff
                                 │                          │
                                 │                   [admin] confirmar
                                 │                          │
                                 │                          ▼
                                 │                      handed_off ──► Nexus (borrador)
                                 │
                                 └──────────────────────► archived
```

### DES-FLOW-002 · Handoff a Nexus

El handoff genera un borrador de tarea Nexus (JSON), lo presenta al admin en pantalla para revisión, y solo tras confirmación explícita llama a la API de Nexus.

```typescript
// [PROPUESTA — payload borrador Nexus]
interface NexusDraftTask {
  title: string;
  description: string;
  linkedVisionMapId: string;
  linkedVisionMapTitle: string;
  suggestedApps: string[];  // slugs del catálogo
  estimatedCost?: number;
  kpis: { title: string; target: string; unit: string }[];
  timeline: { milestone: string; date: string }[];
  requestedBy: string;    // userId del editor
  requestedAt: string;    // ISO datetime
  // NO se envía automáticamente — requiere confirmación humana [GATE-NEXUS-001]
}
```
Cumple: REQ-PROP-004, REQ-ECOSYSTEM-001, REQ-ECOSYSTEM-002, REQ-GATE-001.

---

## 8. Diseño UX/UI

### DES-UX-001 · Arquitectura de componentes (verificada)

```
src/
├── app/
│   ├── page.tsx              → <VisionBoard />  [VERIFICADO]
│   └── api/vision/
│       ├── generate/route.ts
│       ├── maps/route.ts
│       ├── maps/[id]/route.ts
│       └── catalog/**
├── components/vision/
│   ├── VisionBoard.tsx       [VERIFICADO — existe]
│   ├── VisionNodeCard.tsx    [VERIFICADO]
│   ├── CatalogDialog.tsx     [VERIFICADO]
│   ├── ConnectionsLayer.tsx  [VERIFICADO]
│   └── export-utils.ts       [VERIFICADO]
└── lib/
    ├── vision-map.ts         [VERIFICADO]
    ├── anclora-catalog.ts    [VERIFICADO]
    ├── anclora-ecosystem.ts  [VERIFICADO]
    ├── markdown-export.ts    [VERIFICADO]
    └── db.ts                 [VERIFICADO]
```

### DES-UX-002 · Paletas de color y tokens de diseño

| Paleta | Background | Surface | Accent | Uso |
|---|---|---|---|---|
| `anclora` | `#0a0f1f` | `#0F1629` | `#1dab89` | Default / ecosistema Anclora |
| `nexus` | `#0F1629` | `#141C3A` | `#D4AF37` | Propuestas orientadas a Nexus |
| `premium` | `#1A0E1F` | `#2A1530` | `#ec4899` | Private Estates / premium |

`[VERIFICADO en src/lib/vision-map.ts:88-140]`

### DES-UX-003 · Flujo de usuario principal (happy path)

```
1. Usuario accede → [Fase 1: redirige a login si no hay sesión]
2. VisionBoard carga → muestra historial de mapas del workspace
3. Usuario escribe idea en textarea → pulsa "Generar mapa"
4. Loading state → LLM genera → canvas renderiza con layout radial
5. Usuario ajusta nodos via drag-and-drop
6. Usuario guarda (POST /api/vision/maps)
7. [Fase 1] Usuario puede cambiar estado a "review" y solicitar aprobación
8. [Fase 1] Admin aprueba → estado "approved"
9. [Fase 1] Admin puede solicitar handoff a Nexus → preview borrador → confirmar
10. Exportar a PDF o Markdown
```

### DES-UX-004 · Accesibilidad mínima

- Todos los botones de acción tienen `aria-label` descriptivo
- `CatalogDialog` y modales usan `@radix-ui/react-dialog` con focus trap nativo `[INFERENCIA — Radix Dialog tiene focus management integrado]`
- Contraste mínimo 4.5:1 sobre backgrounds oscuros (verificar con colores de paleta)
- Animaciones de Framer Motion tienen variantes `reduced-motion`
- Canvas de VisionBoard tiene `role="application"` y navegación teclado `[PROPUESTA — verificar implementación actual]`

### DES-UX-005 · Estado de carga y error

```typescript
// [PROPUESTA — patrón con React Query]
const { data, isLoading, error } = useMutation({
  mutationFn: generateMap,
  onError: (err) => toast.error(err.message), // via sonner [VERIFICADO en deps]
});

// Loading: skeleton del canvas con animación pulse
// Error: toast + mensaje contextual sin detalles técnicos
// Timeout: mensaje "La generación está tardando más de lo esperado" tras 30s
```

---

## 9. Integración Anclora Nexus

### DES-NEXUS-001 · Contrato de integración

`[DECISIÓN PENDIENTE — DEC-NEXUS-001]` El contrato exacto (endpoint, auth, payload) debe venir del equipo Nexus y validarse desde Bóveda (`/mnt/c/Users/antonio.ballesterosa/Desktop/Proyectos/Boveda-Anclora/contracts/`).

**Diseño provisional:**
```typescript
// src/lib/nexus-handoff.ts [PROPUESTA]
interface NexusHandoffConfig {
  baseUrl: string;          // desde ENV, no hardcodeado
  apiKey: string;           // desde ENV
  workspaceMapping: Record<string, string>; // VisionFlow workspaceId → Nexus projectId
}

async function createNexusDraftTask(
  map: VisionMapRecord,
  config: NexusHandoffConfig
): Promise<NexusDraftTask> {
  // Solo genera el borrador — NO llama a la API Nexus
  // La llamada real requiere confirmación humana en UI
  return buildDraft(map);
}

async function submitNexusTask(
  draft: NexusDraftTask,
  humanConfirmationToken: string, // token de confirmación UI
  config: NexusHandoffConfig
): Promise<{ nexusTaskId: string }> {
  // Solo se ejecuta si humanConfirmationToken es válido
  // Requiere: map.status === "approved" y sesión admin
  // Registra en audit log antes de llamar
  return callNexusApi(draft, config);
}
```

### DES-NEXUS-002 · Diagrama de flujo de handoff

```
Editor UI                     VisionFlow API              Nexus API
    │                              │                           │
    │──── POST /maps/[id]/handoff/nexus ──►│                  │
    │     (solo si status=approved)        │                  │
    │                              │       │                  │
    │◄── 200: { draft: NexusDraft }────────┤                  │
    │                              │                          │
    │   [Admin revisa el draft en UI]      │                  │
    │                              │                          │
    │──── POST /maps/[id]/handoff/nexus/confirm ──►│          │
    │     { confirmedById, timestamp }     │                  │
    │                              │       │                  │
    │                              │──── POST /nexus/tasks ──►│
    │                              │◄──── { taskId } ─────────┤
    │◄── 200: { nexusTaskId } ─────┤                          │
    │                              │ [map.status → handed_off]│
```

---

## 10. Integración Anclora SyncXML (Fase 2)

### DES-SYNC-001 · Esquema XML de exportación

`[PROPUESTA — DEC-SYNC-001 DECISIÓN PENDIENTE]`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<VisionFlowExport version="1.0" exportedAt="2026-06-21T10:00:00Z">
  <Map id="clx..." workspaceId="ws-001" status="approved">
    <Title>Digitalización de reservas PE</Title>
    <Idea>Crear flujo digital de reservas para Anclora Private Estates</Idea>
    <ApprovedBy userId="u-123" at="2026-06-20T09:00:00Z" />
    <Nodes>
      <Node id="node-1" category="idea" title="..." description="..." />
      <Node id="node-2" category="objective" title="..." priority="alta" />
      <!-- ... -->
    </Nodes>
    <Connections>
      <Connection from="node-1" to="node-2" label="" />
    </Connections>
    <Apps>
      <App slug="nexus" name="Anclora Nexus" />
    </Apps>
  </Map>
</VisionFlowExport>
```

---

## 11. Infraestructura y DevOps

### DES-DEVOPS-001 · Pipeline CI objetivo (Fase 1)

```yaml
# .github/workflows/ci.yml [PROPUESTA]
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint
      - run: bun run typecheck      # npx tsc --noEmit (con ignoreBuildErrors: false)
      - run: bun run test           # vitest
      - run: bun run build
```
Cumple: REQ-QA-003, REQ-SEC-002.

### DES-DEVOPS-002 · Variables de entorno requeridas

| Variable | Descripción | Obligatoria |
|---|---|---|
| `DATABASE_URL` | SQLite path o PostgreSQL URL | ✅ Fase 0 |
| `NEXTAUTH_SECRET` | Secret para next-auth | ✅ Fase 1 |
| `NEXTAUTH_URL` | URL base de la app | ✅ Fase 1 |
| `LLM_API_KEY` | API key del proveedor OSS elegido | ✅ Fase 0 (reemplaza z-ai-web-dev-sdk config) |
| `LLM_MODEL` | Modelo LLM (ej. claude-sonnet-4-6) | ✅ Fase 0 |
| `NEXUS_API_URL` | URL base API Nexus | Fase 1 |
| `NEXUS_API_KEY` | Auth Nexus | Fase 1 |

Todas las variables sensibles via `.env.local` (no commiteado) o secretos del entorno de despliegue. Cumple: REQ-SEC-008.

### DES-DEVOPS-003 · Despliegue

- Build: `bun run build` → `output: standalone` → `.next/standalone/server.js`
- Entorno: Bun runtime sobre Linux (WSL2 dev, Linux prod)
- Proxy: Caddy (post-hardening Fase 0) en puerto 81 → app en 3000
- DB: SQLite en filesystem local (dev/staging v1), migrar a PostgreSQL en Fase 2 si se requiere RAG `[DEC-DB-001]`

---

## 12. Decisiones de Diseño Registradas

| ID | Decisión | Alternativa descartada | Razón | Estado |
|---|---|---|---|---|
| DES-DEC-001 | Layout radial para el canvas | Grid ortogonal | Más legible para mapas de relaciones | ADOPTADO |
| DES-DEC-002 | SQLite para Fase 0-1 | PostgreSQL desde inicio | Simplicidad de despliegue, sin infra adicional | ADOPTADO |
| DES-DEC-003 | Paletas dark-first | Light mode default | Ecosistema Anclora es dark-first | ADOPTADO |
| DES-DEC-004 | Next.js App Router | Pages Router | Fase 0 ya usa App Router | ADOPTADO |
| DES-DEC-005 | Reemplazar z-ai-web-dev-sdk por SDK OSS | Mantener SDK actual | Viola REQ-OSS-001; opaco; sin docs | PENDIENTE [DEC-OSS-001] |
| DES-DEC-006 | Zustand para estado cliente | Redux / Context | Más ligero, sin boilerplate | ADOPTADO |
| DES-DEC-007 | Migrar a PostgreSQL en Fase 2 | Mantener SQLite | SQLite no soporta pgvector para RAG | PENDIENTE [DEC-DB-001] |
| DES-DEC-008 | Handoff Nexus con confirmación explícita UI | Handoff automático | Política BÓVEDA: humano en el loop | ADOPTADO |
| DES-DEC-009 | Vitest como framework de tests | Jest | Proyecto usa Vite/Next config; Vitest es OSS + más rápido | ADOPTADO |
| DES-DEC-010 | Sanitizar agentsMd antes de prompt | Confiar en el contenido | REQ-AI-006 / REQ-ECOSYSTEM-006 | ADOPTADO |

---

## 13. Diagramas de Secuencia Clave

### DES-SEQ-001 · Generación de mapa (Fase 0, actual)

```
Browser          Next.js API         getCatalogForPrompt    LLM Provider
  │                   │                      │                   │
  │── POST /generate ─►│                      │                   │
  │                   │─── await ────────────►│                   │
  │                   │◄── catalogText+slugs ─┤                   │
  │                   │── sanitize(agentsMd) ─┤ [Fase 0: añadir] │
  │                   │── buildSystemPrompt() ─────────────────── │
  │                   │── zai.chat.completions.create() ─────────►│
  │                   │◄──────────── LLMResponse (JSON) ──────────┤
  │                   │── repairTruncatedJson() si necesario       │
  │                   │── layoutVisionMap()                        │
  │                   │── autoConnect()                            │
  │◄── VisionMap JSON ┤                                           │
```

### DES-SEQ-002 · Handoff a Nexus (Fase 1, propuesto)

```
Admin UI         Next.js API         Nexus API        AuditLog
  │                   │                   │               │
  │── POST /maps/[id]/handoff/nexus ──────►│               │
  │   (verifica: status=approved, rol=admin) │             │
  │◄── 200: { draft: NexusDraftTask } ─────┤               │
  │                                                        │
  │   [Admin revisa draft en modal]                        │
  │                                                        │
  │── POST /maps/[id]/handoff/nexus/confirm ───────────────►│
  │   { confirmedById, confirmationToken }  │              │
  │                   │─── log(action, userId, mapId) ────►│
  │                   │─── POST /nexus/tasks ─────────────►│
  │                   │◄───── { taskId } ─────────────────┤│
  │◄── 200: { nexusTaskId, status: "handed_off" } ──────────┤
```

---

*Este documento es el contrato de diseño para la implementación de AncloraVisionFlow. Toda tarea (TASK.md) referencia al menos un DES-ID. Toda decisión de diseño nueva debe añadirse a la tabla §12 con aprobación humana si altera la arquitectura de datos, el flujo de propuestas o la integración con sistemas externos.*
