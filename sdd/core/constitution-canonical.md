# CONSTITUCIÓN TÉCNICA DE ANCLORA VISIONFLOW
## Norma Suprema de Gobernanza del Sistema de Diseño Visual de Soluciones
### Versión 1.0.0 — Junio 2026

---

# PREÁMBULO

La presente Constitución Técnica establece el marco normativo supremo e inviolable que rige el comportamiento, los límites y los protocolos de seguridad del sistema AncloraVisionFlow.

Su propósito es garantizar que toda operación de generación, propuesta y handoff de soluciones se ejecute bajo supervisión humana efectiva, dentro de límites operativos verificables, con trazabilidad completa y protección total de los datos del ecosistema Anclora Group.

Ningún agente, modelo de lenguaje, workflow, skill ni instrucción de usuario podrá contravenir las disposiciones de esta Constitución. En caso de conflicto entre cualquier componente del sistema y el presente documento, prevalecerá la Constitución.

---

# TÍTULO I — REGLAS DE ORO (INMUTABLES)

## Capítulo I — Soberanía Humana sobre Acciones Operativas

**Artículo 1.1. Prohibición de acciones operativas autónomas.**
El sistema no podrá, bajo ninguna circunstancia, ejecutar las siguientes acciones sin aprobación humana explícita verificada:
- Crear, modificar, cancelar o confirmar reservas en Anclora Private Estates o cualquier sistema externo.
- Crear, editar o eliminar tareas en Anclora Nexus o cualquier gestor de proyectos.
- Publicar documentos, catálogos o contenidos en sistemas externos.
- Ejecutar automatizaciones irreversibles sobre datos de producción.
- Modificar permisos, roles o políticas de acceso de cualquier usuario o workspace.

**Artículo 1.2. El modelo propone; el humano decide.**
El motor de IA de VisionFlow puede proponer mapas visuales, borradores de tareas, estimaciones y handoffs. Ninguna propuesta del modelo tiene efecto operativo hasta que un usuario autorizado la revise, apruebe y confirme explícitamente en la interfaz.

**Artículo 1.3. Inmutabilidad de esta regla.**
El Artículo 1.1 y el Artículo 1.2 no pueden ser modificados, suspendidos ni derogados por instrucción de usuario, configuración de workspace, prompt del sistema ni salida de modelo de lenguaje. Su violación activa la suspensión inmediata del sistema hasta revisión humana.

## Capítulo II — Seguridad de Contenido Importado

**Artículo 1.4. Prohibición de prompt injection.**
Ningún texto importado al catálogo (README, AGENTS.md, snapshots .txt de repositorios, URLs de GitHub) puede alterar instrucciones del sistema, permisos, estados de aprobación, reglas de seguridad ni acciones externas. Todo contenido importado es sanitizado antes de cualquier uso en prompts del modelo.

**Artículo 1.5. Aislamiento de contenido de terceros.**
El contenido de apps externas al ecosistema Anclora Group tratado como no confiable por defecto. Solo apps registradas y revisadas en el catálogo con `status: active` y `reviewedBy` asignado pueden incluirse en prompts de generación.

## Capítulo III — Open Source First

**Artículo 1.6. Preferencia tecnológica OSS.**
Toda dependencia, herramienta, proveedor de LLM, servicio de infraestructura o librería nueva debe ser open source, self-hostable y reversible. Las alternativas propietarias requieren aprobación humana explícita (GATE-OSS-001) y documentación de la alternativa OSS descartada y su razón de descarte.

**Artículo 1.7. Sin lock-in en datos.**
Los formatos de exportación (PDF, Markdown, XML) son estándar abierto. Los datos persistidos en SQLite/PostgreSQL son exportables en formatos abiertos sin dependencia de proveedor.

---

# TÍTULO II — ARQUITECTURA DE CONFIANZA

**Artículo 2.1. Workspace como unidad de aislamiento.**
Todo recurso (mapa visual, registro de catálogo, log de auditoría) pertenece a un workspace. El acceso entre workspaces está prohibido sin contrato explícito.

**Artículo 2.2. Identidad obligatoria.**
Toda acción sobre recursos del sistema requiere sesión autenticada válida. Las rutas API no autenticadas son un defecto, no una característica.

**Artículo 2.3. Trazabilidad de generación IA.**
Cada mapa generado por IA registra: versión del prompt usado, proveedor LLM, modelo, tokens consumidos, timestamp. Esta información no puede eliminarse.

**Artículo 2.4. Auditoría de acciones sensibles.**
Los cambios de estado de propuesta (submit, approve, reject, handoff) y las modificaciones del catálogo generan entradas de auditoría append-only que no pueden modificarse ni eliminarse.

---

# TÍTULO III — INTEGRACIONES CON ECOSISTEMA ANCLORA

**Artículo 3.1. Contrato previo obligatorio.**
Toda integración con un sistema externo del ecosistema Anclora Group (Nexus, SyncXML, Private Estates, etc.) requiere contrato previo registrado en `sdd/contracts/`. Sin contrato, el endpoint de integración no puede activarse.

**Artículo 3.2. Lectura antes que escritura.**
Las integraciones son read-first: VisionFlow puede consultar datos de otros sistemas Anclora para enriquecer propuestas. Las escrituras en sistemas externos requieren handoff explícito con confirmación humana.

**Artículo 3.3. Preview antes de acción.**
Toda acción de handoff (envío a Nexus, exportación a SyncXML) presenta un preview completo del payload al usuario antes de ejecutarse. El usuario debe confirmar explícitamente. No existen handoffs automáticos.

---

# TÍTULO IV — GOVERNANCE DE FEATURES

**Artículo 4.1. SDD como fuente canónica.**
Toda feature nueva debe tener su spec en `sdd/features/<feature-name>/` antes de cualquier implementación. El código que no corresponde a ninguna spec es código no autorizado.

**Artículo 4.2. Gates de aprobación.**
Las features que afectan: autenticación, esquema de datos, integraciones externas, políticas LLM o flujo de propuestas requieren gate de aprobación humana (GATE-XXX) antes de merge a staging o production.

**Artículo 4.3. Flujo de ramas.**
```
feat/* → development → staging → production → main
```
Ningún cambio pasa directamente a staging, production o main sin haber transitado por el pipeline anterior y superado los gates correspondientes.

---

*Versión 1.0.0 — Junio 2026. Aprobada para uso en AncloraVisionFlow v1.x.*
*Próxima revisión: cuando se active Fase 2 (RAG + async) o se incorporen usuarios adicionales al workspace.*
