# CONTROL TOWER — INFORMATION ARCHITECTURE PRODUCT REVIEW

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 1. Resultado
**DECISIÓN: APROBADA CON AJUSTES PARA WIREFRAMES**

La Information Architecture es coherente con el dominio, la arquitectura técnica, el modelo físico y el objetivo principal del producto.

## 2. Ajustes de producto

### Home = Control Tower, no gestor de proyectos
Home debe responder: **¿Qué está pasando, qué requiere atención y qué debo hacer ahora?**
La gestión detallada permanece en las páginas de entidad.

### Navegación principal congelada
- Home
- Business
- CRM
- Projects
- Knowledge
- Automation
- Settings

No añadir al MVP módulos independientes de Marketing, Finance, Portfolio, Learning o Personal Lab.

### Business
Debe ser estratégico:
- Strategic Areas
- Goals
- Capabilities
- Services

### CRM
No debe duplicar Twenty. Control Tower guarda contexto, relaciones y estado; el CRM externo conserva su información canónica cuando corresponda.

### Projects
Es el centro operativo:
Project → Client / Service / Current Phase / Tasks / Deliverables / Decisions / Documents / Assets.

### Knowledge Inbox
Es la entrada universal de conocimiento:
Captured → Processing → Needs Review → Approved → Linked → Canonical Source.
El Inbox no es la biblioteca permanente.

### Decisions
Tiene colección global propia porque permite recuperar rápidamente qué se decidió, por qué, cuándo y sobre qué.

### Global Search
Es infraestructura transversal, siempre accesible.

### Quick Capture
Debe permitir:
- Client
- Opportunity
- Project
- Task
- Decision
- Knowledge

### Contexto heredado
Crear desde una entidad hereda automáticamente su contexto. Ej.: crear una tarea desde Project Beta asigna `project_id = Beta`.

### Estados
No depender solo del color. Usar etiqueta y, cuando proceda, icono.

### Fuentes externas
Mostrar claramente la fuente y una acción Open external.

### Permisos
Reservar espacio conceptual para información interna, compartida y externa, aunque el MVP sea de una sola usuaria.

## 3. Fuera de wireframes MVP
- AI Assistant
- AI-generated dashboard
- Custom dashboard builder
- Custom object/field builder
- Client Portal
- Billing
- Advanced analytics
- Vector search
- RAG UI
- Workflow builder
- Multi-tenant administration
- Financial BI

## 4. Gate
**APPROVED FOR WIREFRAMES**

La IA no requiere cambios estructurales antes del diseño de pantallas.

