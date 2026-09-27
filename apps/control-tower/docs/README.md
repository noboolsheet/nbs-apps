# Documentación de Control Tower

Guía de la carpeta `docs/`. Hay dos clases de documento y **una regla de precedencia**.

## Regla de precedencia

Donde el código y los documentos difieran, **manda el código** y su documentación viva. Los 9 documentos de diseño
(`1_…9_`) son la **línea base original** (2026-08-10) y se conservan como referencia técnica e histórica; **no** se
reescriben cuando la implementación evoluciona. Las desviaciones respecto a la línea base se registran como **ERRATAs**
(citadas en los comentarios del código) y **ADRs**.

## Documentos de diseño originales (línea base, congelados)

Sirvieron de entrada para construir el MVP. Los comentarios del código los citan como **"doc N §X"** (p. ej. "doc 5 §29"
= sección de `5_…PHYSICAL_DATA_MODEL.md`).

| # | Documento | Qué define |
|---|---|---|
| 1 | `1_CONTROL_TOWER_SPEC.md` | Producto + especificación técnica (requisitos funcionales). |
| 2 | `2_CONTROL_TOWER_DOMAIN_MODEL_UPDATED.md` | Modelo de dominio (entidades, invariantes). |
| 3 | `3_CONTROL_TOWER_TECHNICAL_ARCHITECTURE_UPDATED.md` | Arquitectura técnica (capas, outbox, jobs, integraciones). |
| 4 | `4_CONTROL_TOWER_STACK_DECISION.md` | Elección de stack + despliegue. |
| 5 | `5_CONTROL_TOWER_PHYSICAL_DATA_MODEL.md` | Modelo físico PostgreSQL (tablas, índices). |
| 6 | `6_CONTROL_TOWER_INFORMATION_ARCHITECTURE_PRODUCT_REVIEW.md` | Navegación / arquitectura de información. |
| 7 | `7_CONTROL_TOWER_WIREFRAMES.md` | Wireframes. |
| 8 | `8_CONTROL_TOWER_CROSS_DOCUMENT_ARCHITECTURE_REVIEW_UPDATED.md` | Revisión cruzada + erratas de arquitectura. |
| 9 | `9_CONTROL_TOWER_IMPLEMENTATION_PLAN_REVIEW.md` | Revisión del plan de implementación. |

## Documentación viva (autoritativa — refleja el estado actual)

| Documento | Rol |
|---|---|
| `BUILD_LOG.md` | **Fuente de verdad del progreso.** Bitácora cronológica (lo más reciente arriba). |
| `FINDINGS_AND_DEFERRED.md` | Backlog vivo: hallazgos `F-*` y diferidos `E-*`, con estado 🔴/🟡/🟢. |
| `adr/` | Architecture Decision Records (**ADR-001…010**): decisiones y su porqué. |
| `DECISIONS_FROZEN.md` | Decisiones congeladas del modelo base. |
| `NOTION_INFORMATION_ARCHITECTURE.md` | Contrato del espejo a Notion (propiedad por campo, IDs de las DBs). |
| `IMPLEMENTATION_ROADMAP.md` | Plan de 18 milestones (referencia del recorrido de construcción). |
| `DEPLOYMENT.md` | Cómo desplegar (local y **vibox**), y por dónde se entra (tailnet, red local, Caddy). |
| `SECURITY.md` | Reglas de seguridad (sólo referencias, nunca secretos). |
| `SECURITY_CHECKLIST.md` | Checklist de seguridad por dominios (Parte I self-hosted + Parte II gate de lanzamiento público). |
| `INFORMATION_ORGANIZATION.md` | Cómo organizar la info en Drive/Notion (las fuentes de estructura libre). |
| `DEVELOPMENT_PATTERN.md` | **Patrón de desarrollo con IA** reutilizable (método con el que se construyó esta app). |
| `AUTOMATION_BACKLOG.md` | Catálogo de automatizaciones: **ACT-*** activas (las que la app ya hace sola), AUT-* propuestas y HAB-* habilitadores. |
| `AUDIT_2026-08-30.md` · `AUDIT_UIUX_2026-08-30.md` | Auditorías técnica y de UI/UX, con el estado de cada hallazgo. Se cierran ahí, no sólo en el backlog. |
| `DESIGN_TOKENS.md` | Tema, tokens de color y primitivas de UI (nada de `neutral-*`/`dark:` a mano). |
| `ROTATE_GOOGLE_SA_KEY.md` | Runbook de rotación de la clave de servicio de Google. |

Fuera de `docs/`: **`../CLAUDE.md`** orienta a un agente que retoma el trabajo, y la **guía de uso** para el usuario
final vive en `../apps/web/content/user-guide.md` (legible en la app: Settings › Guía).
