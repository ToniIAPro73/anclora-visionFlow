# AVF-DEPTH-001 — Evidence Pack, RAG Semántico y Tiempo Real

**Versión:** v1 | **Estado:** En implementación | **Fase:** 5 | **Fecha:** 2026-06-23

---

## 1. Objetivo

Añadir profundidad operativa a VisionFlow mediante tres capacidades:

1. **Evidence Pack**: importar manifiestos firmados desde FileStudio (`filestudio-manifest-v1`), manteniendo el documento original en su entorno local.
2. **RAG Semántico**: enriquecer la generación de mapas con chunks de apps del catálogo y plantillas RE indexados con embeddings locales.
3. **Panel de aprendizaje**: métricas agregadas de casos por plantilla (tasa de aprobación, retrabajo, evidencias).
4. **Realtime Lead Status**: canal pub/sub en memoria para eventos de estado de lead desde Anclora Nexus.

---

## 2. Contratos de integración

| Contrato | Dirección | Doc |
|---|---|---|
| `filestudio-manifest-v1` | FileStudio → VisionFlow | `sdd/contracts/filestudio-manifest-v1.md` |
| `nexus-lead-status-v1` | Nexus → VisionFlow | TBD (DEC-DEPTH-003) |

**Invariante principal:** El documento original nunca sale de FileStudio. VisionFlow solo recibe manifiestos.

---

## 3. Cambios de schema

### 3.1 EvidenceKind enum
Añade `filestudio_manifest` a los valores existentes.

### 3.2 CatalogEmbedding (nuevo)
Almacena chunks vectoriales (384 dims, pgvector) de apps del catálogo y plantillas RE. Operaciones exclusivamente vía `$queryRawUnsafe` / `$executeRawUnsafe`.

### 3.3 CaseMetric (nuevo)
Métricas agregadas por caso: aprobación, handoff, retrabajo, conteo de evidencias. Relación `Workspace → CaseMetric[]`.

---

## 4. FileManifestSchema (§4.1)

```typescript
{
  contractVersion: "filestudio-manifest-v1",
  manifestId: string,
  sha256: string (64 chars),
  mimeType: string,
  classification: "public" | "internal" | "confidential" | "restricted",
  ocrAvailable: boolean,
  permittedExtract?: string (max 2000 chars),
  exifStripped: boolean,
  pages?: number,
  issuedAt: string (ISO datetime)
}
```

**Reglas de negocio críticas:**
- `exifStripped` debe ser `true` — rechazado en capa de negocio si `false`
- `restricted` → `reviewState: "pending"` (nunca auto-aprobado)
- `restricted` nunca se indexa en RAG ni viaja a LLM externo

---

## 5. RAG — arquitectura

- **Modelo de embedding:** pseudo-embedding determinista (384 dims) para desarrollo sin API externa. Reemplazable por sentence-transformers local vía API (DEC-DEPTH-001).
- **Indexación:** `catalog_app` (apps publicadas) + `realestate_spec` (plantillas de casos)
- **Similitud:** coseno vía pgvector (`<=>` operator, ivfflat index)
- **Seguridad:** contenido `restricted` nunca indexado; sanitización antes de ingestión y antes de inyección en prompt

---

## 6. Decisiones pendientes

| ID | Descripción |
|---|---|
| DEC-DEPTH-001 | Modelo de embedding de producción (sentence-transformers local vs API) |
| DEC-DEPTH-002 | Backend realtime de producción (in-memory vs Redis pub/sub vs Supabase Realtime) |
| DEC-DEPTH-003 | Contrato Nexus lead-status-v1 (endpoint, auth, payload) |
| DEC-DEPTH-004 | Política de retención y limpieza de CatalogEmbedding |

---

## 7. Rutas API nuevas

| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| POST | `/api/vision/cases/[id]/manifest` | editor | Adjunta manifiesto FileStudio a un caso |
| POST | `/api/vision/rag/reindex` | admin | Reindexa catalog apps y plantillas RE |
| POST | `/api/vision/cases/[id]/lead-status` | autenticado | Publica evento de estado de lead |
| GET | `/api/vision/metrics` | autenticado | Retorna métricas agregadas por plantilla |

---

## 8. Componentes frontend

- **ManifestPanel**: panel para listar y adjuntar manifiestos FileStudio (dark mode)
- **VisionNodeCard**: añade indicador de lead status en vivo (prop opcional, no breaking)
- **/insights**: panel de aprendizaje con métricas agregadas (solo métricas, sin PII)
