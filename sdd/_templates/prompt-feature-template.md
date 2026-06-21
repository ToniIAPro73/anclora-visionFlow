PROMPT: Implementar feature <feature-name> (AVF-XXX-NNN) siguiendo SDD VisionFlow v1.

Lecturas obligatorias antes de escribir código:
1. sdd/core/constitution-canonical.md
2. sdd/core/product-spec-v0.md
3. sdd/features/<feature-name>/spec-<feature-name>-vX.md
4. docs/specs/anclora-visionflow/REQUIREMENTS.md (secciones relevantes)
5. docs/specs/anclora-visionflow/DESIGN.md (secciones relevantes)

Instrucciones:
- Implementar exactamente lo especificado en el spec. YAGNI: nada más.
- Verificar rama activa: debe ser `feat/avf-xxx-nnn-<nombre>` apuntando a development.
- Auth: toda ruta nueva usa `requireSession()` antes de cualquier lógica.
- Validación: Zod en todos los inputs de rutas POST/PUT.
- Sanitización: aplicar `sanitizeCatalogContent()` en cualquier texto externo → prompt LLM.
- Tests: escribir tests junto al código. No merge sin tests.
- Al terminar: dispatch `code-reviewer` y `commit` agent. No commit directo.
- Respetar gates: si la feature tiene GATE-XXX, no mergear a staging sin aprobación humana.
