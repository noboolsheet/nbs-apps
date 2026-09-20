---
date: 2026-08-10
project: Control Tower
source_of_truth: This document defines the functional and architectural
  requirements for the Control Tower MVP.
status: Draft / Architecture Definition
title: Control Tower --- Product & Technical Specification
version: 0.1.0
---

# CONTROL TOWER --- PRODUCT & TECHNICAL SPECIFICATION

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 0. Documento

### Propósito

Control Tower es una aplicación web para visualizar, organizar y
gobernar el estado global de una empresa en construcción y,
posteriormente, de una empresa operativa.

No pretende sustituir a las herramientas especializadas utilizadas por
la empresa. Actúa como **capa de control, agregación, contexto y
gobierno** sobre ellas.

La aplicación debe permitir que una persona pueda abrirla y obtener
rápidamente una panorámica fiable de:

-   dónde está la empresa;
-   qué se está construyendo;
-   qué proyectos están activos;
-   qué clientes requieren atención;
-   qué decisiones se han tomado;
-   qué está bloqueado;
-   qué tareas requieren acción;
-   qué servicios existen y en qué estado están;
-   qué capacidades existen y cuáles están en desarrollo;
-   qué sistemas y automatizaciones están funcionando;
-   qué conocimiento está pendiente de procesar;
-   que cursos y programas de formacion se estan cursando al momento y en que estado de completamiento se encuentran;
-   qué ha cambiado desde la última visita;
-   cuáles son los próximos hitos y prioridades.

### Principio rector

> Control Tower no debe convertirse en otro lugar donde duplicar la
> información. Debe convertirse en la consola desde la que se observa y
> gobierna el ecosistema de información de la empresa.

------------------------------------------------------------------------

# 1. OBJETIVO

## 1.1 Objetivo principal

Construir una aplicación web que funcione como **Centro de Control de la
Empresa**, proporcionando una visión transversal y actualizada de la
estrategia, construcción, operaciones, clientes, proyectos,
conocimiento, activos, marketing, infraestructura y evolución de la
empresa.

## 1.2 Problema que resuelve

La información de la empresa está distribuida entre diferentes sistemas:

-   Twenty → CRM.
-   Notion → documentación y colaboración.
-   Markdown + Git + Obsidian → conocimiento estructurado y versionado.
-   Google Drive → archivos.
-   Google Calendar → agenda.
-   Gmail → comunicación.
-   Raspberry Pi / Docker → aplicaciones e infraestructura.
-   Git → código y activos versionados.
-   n8n → automatizaciones.
-   Password Manager → credenciales.

La dispersión provoca:

-   pérdida de contexto;
-   dificultad para recordar decisiones;
-   dificultad para conocer el estado global;
-   duplicación de información;
-   necesidad de releer conversaciones;
-   dificultad para retomar el trabajo después de varios días;
-   riesgo de olvidar tareas, bloqueos o decisiones;
-   dificultad para saber qué se está construyendo y por qué.

Control Tower debe resolver principalmente el **problema de orientación
y gobierno**, no sustituir a cada sistema especializado.

## 1.3 Objetivos secundarios

-   Registrar decisiones importantes.
-   Mostrar cambios recientes.
-   Consolidar proyectos y tareas.
-   Mostrar dependencias y bloqueos.
-   Controlar la evolución de servicios y capacidades.
-   Controlar la construcción del Business OS y KOS.
-   Mantener inventario de activos, aplicaciones y automatizaciones.
-   Mostrar el estado del portfolio.
-   Servir posteriormente como interfaz para agentes IA.
-   Permitir automatizar la carga y actualización de información.
-   Diseñarse desde el inicio con una arquitectura que permita
    convertirse posteriormente en producto SaaS/multiempresa.

## 1.4 No objetivos iniciales

El MVP NO debe intentar:

-   sustituir Twenty;
-   sustituir Notion;
-   sustituir Google Drive;
-   sustituir Git;
-   sustituir un gestor contable;
-   sustituir un gestor de contraseñas;
-   almacenar todo el conocimiento de la empresa;
-   convertirse en un ERP;
-   implementar un agente IA complejo desde el primer día;
-   construir un sistema vectorial como requisito inicial.

------------------------------------------------------------------------

# 2. PRINCIPIOS ARQUITECTÓNICOS

## 2.1 Single Source of Truth

Cada categoría de información debe tener una única fuente de verdad.

Control Tower puede almacenar metadatos, estados, referencias y
snapshots operativos, pero no debe crear una segunda fuente de verdad
accidental.

## 2.2 No duplicar información

Si un dato existe en Twenty, Notion, Git o Drive, Control Tower debe
enlazarlo o sincronizar un resumen estructurado.

No debe copiar innecesariamente el contenido completo.

## 2.3 Control Tower como capa de gobierno

La aplicación debe responder:

> "¿Qué está pasando?"

mientras que los sistemas especializados responden:

> "¿Dónde está el detalle?"

Ejemplo:

Control Tower: - Proyecto: Cliente Beta. - Estado: En ejecución. - Fase:
Arquitectura. - Próxima acción: definir infraestructura. -
Documentación: enlace a Notion.

Notion: - documentación completa del proyecto.

## 2.4 Human-in-the-loop

Las decisiones importantes deben poder confirmarse manualmente.

Las automatizaciones pueden sugerir, importar, detectar y actualizar
estados, pero no deben ejecutar cambios críticos sin reglas explícitas.

## 2.5 Automatización progresiva

Primero:

> proceso manual validado → automatización.

Nunca:

> proceso inexistente → automatización.

## 2.6 API-first

Todas las entidades internas relevantes deben poder ser gestionadas
mediante API.

La interfaz web no debe ser el único mecanismo de acceso.

## 2.7 Event-oriented

Los cambios importantes deben poder generar eventos:

-   proyecto creado;
-   proyecto actualizado;
-   decisión creada;
-   servicio cambiado de estado;
-   oportunidad ganada;
-   automatización fallida;
-   bloqueo creado;
-   tarea completada.

Esto permitirá futuras automatizaciones y agentes.

## 2.8 Trazabilidad

Todo cambio importante debe poder rastrearse:

-   quién;
-   cuándo;
-   qué cambió;
-   valor anterior;
-   valor nuevo;
-   origen del cambio.

## 2.9 Portabilidad

La arquitectura no debe depender irreversiblemente de un único
proveedor.

## 2.10 Seguridad por defecto

-   No almacenar contraseñas.
-   No almacenar tokens secretos en texto plano.
-   No exponer credenciales.
-   Aplicar mínimo privilegio.
-   Registrar acciones sensibles.

## 2.11 Mobile-friendly

El dashboard debe poder consultarse rápidamente desde móvil, aunque el
primer entorno objetivo sea desktop.

## 2.12 Producto desde el inicio, sin sobrediseñar

La arquitectura debe permitir evolucionar desde:

> empresa individual → equipo pequeño → producto multiempresa

sin construir toda la complejidad SaaS desde el MVP.

------------------------------------------------------------------------

# 3. USUARIOS

## 3.1 MVP

### Usuario principal --- Owner / Founder

Una única persona que:

-   administra la empresa;
-   gestiona clientes;
-   gestiona proyectos;
-   toma decisiones;
-   mantiene el conocimiento;
-   configura servicios;
-   gestiona marketing;
-   administra infraestructura.

Debe tener acceso completo.

## 3.2 Fase 2

### Colaborador

Puede:

-   consultar información;
-   gestionar tareas;
-   actualizar proyectos asignados;
-   registrar notas;
-   consultar activos permitidos.

No puede modificar configuración estratégica o seguridad salvo permiso
explícito.

### Cliente

No debe tener acceso al Control Tower interno en el MVP.

El acceso cliente podrá implementarse posteriormente mediante un portal
separado o vistas específicas.

## 3.3 Fase 3

### Administrador de organización

En un producto SaaS podrá administrar:

-   usuarios;
-   roles;
-   integraciones;
-   configuración de organización;
-   facturación;
-   seguridad.

### Usuario estándar

Acceso según permisos.

### Viewer

Solo lectura.

------------------------------------------------------------------------

# 4. CASOS DE USO

## 4.1 Orientación diaria

El usuario abre Control Tower y en menos de cinco minutos entiende:

-   estado general;
-   prioridades;
-   bloqueos;
-   cambios recientes;
-   clientes activos;
-   proyectos activos;
-   tareas pendientes;
-   próximas decisiones.

## 4.2 Retomar el trabajo después de varios días

El usuario consulta:

> "¿Qué ha cambiado desde mi última visita?"

El sistema muestra:

-   decisiones nuevas;
-   proyectos modificados;
-   tareas completadas;
-   tareas vencidas;
-   bloqueos;
-   nuevos activos;
-   cambios de servicios;
-   cambios de infraestructura.

## 4.3 Registrar una decisión

Crear una decisión con:

-   título;
-   fecha;
-   decisión;
-   motivo;
-   alternativas;
-   impacto;
-   entidades relacionadas;
-   estado.

## 4.4 Controlar la construcción de la empresa

Ver:

-   Business OS;
-   KOS;
-   CRM;
-   marketing;
-   portfolio;
-   infraestructura;
-   automatizaciones;
-   servicios.

## 4.5 Controlar servicios

Ver:

-   servicios existentes;
-   estado;
-   preparación;
-   capacidades necesarias;
-   activos;
-   proyectos donde fueron utilizados.

## 4.6 Controlar capacidades

Ver:

-   capacidad;
-   nivel;
-   formación;
-   evidencia;
-   servicios relacionados;
-   próximos objetivos.

## 4.7 Controlar clientes

Ver:

-   clientes activos;
-   oportunidades;
-   proyectos;
-   tareas;
-   bloqueos;
-   última interacción;
-   próxima acción.

## 4.8 Controlar proyectos

Ver:

-   estado;
-   fase;
-   progreso;
-   tareas;
-   bloqueos;
-   próximos hitos;
-   documentación;
-   activos;
-   cliente.

## 4.9 Controlar conocimiento

Ver:

-   elementos capturados;
-   pendientes de procesamiento;
-   conocimiento validado;
-   decisiones;
-   lecciones aprendidas;
-   activos derivados.

## 4.10 Controlar infraestructura

Ver:

-   aplicaciones;
-   servidores;
-   dominios;
-   repositorios;
-   servicios;
-   estado;
-   dependencias.

Nunca mostrar secretos.

## 4.11 Controlar automatizaciones

Ver:

-   automatizaciones activas;
-   estado;
-   trigger;
-   sistemas conectados;
-   última ejecución;
-   errores;
-   documentación.

## 4.12 Controlar portfolio

Ver:

-   proyectos;
-   demos;
-   casos de estudio;
-   plantillas;
-   laboratorios;
-   estado de publicación.

## 4.13 Preparar una reunión

Obtener rápidamente:

-   cliente;
-   oportunidad;
-   proyecto;
-   últimas interacciones;
-   tareas abiertas;
-   decisiones;
-   bloqueos;
-   documentación.

## 4.14 Preparar el día

Generar una vista:

-   Hoy;
-   Esta semana;
-   Bloqueado;
-   Esperando terceros;
-   Próximos hitos.

------------------------------------------------------------------------

# 5. ENTIDADES

Las siguientes entidades forman el modelo conceptual inicial.

## 5.1 Organization

Representa la empresa propietaria del workspace.

Campos mínimos:

-   id
-   name
-   description
-   status
-   created_at
-   updated_at

En MVP habrá una sola organización.

## 5.2 User

Persona que utiliza Control Tower.

Campos:

-   id
-   name
-   email
-   role
-   status
-   last_login_at

## 5.3 StrategicArea

Área estratégica de la empresa.

Ejemplos:

-   Dirección.
-   Business OS.
-   KOS.
-   Marketing.
-   Comercial.
-   Operaciones.
-   Portfolio.
-   Formación.
-   Infraestructura.

## 5.4 Goal

Objetivo de empresa.

Campos:

-   title
-   description
-   area
-   priority
-   status
-   target_date
-   progress
-   owner

## 5.5 Initiative

Iniciativa de construcción o mejora.

Ejemplos:

-   Crear KOS.
-   Implementar Twenty.
-   Crear portfolio.
-   Crear Control Tower.

Campos:

-   title
-   type
-   description
-   status
-   priority
-   start_date
-   target_date
-   progress
-   strategic_area

## 5.6 Service

Servicio ofrecido o en desarrollo.

Campos:

-   name
-   description
-   problem_solved
-   target_customer
-   status
-   readiness
-   price_reference
-   delivery_model
-   public_visibility

## 5.7 Capability

Capacidad que la empresa puede desarrollar o vender.

Campos:

-   name
-   description
-   category
-   level
-   evidence
-   status
-   next_goal

## 5.8 Skill

Habilidad específica.

Relacionada con una o varias capacidades.

## 5.9 LearningItem

Elemento de formación:

-   curso;
-   libro;
-   vídeo;
-   documentación;
-   proyecto práctico;
-   experimento.

Campos:

-   title
-   type
-   source
-   status
-   notes_link
-   target_capability
-   completion_date

## 5.10 Roadmap

Plan temporal.

Tipos:

-   formación;
-   empresa;
-   servicio;
-   producto;
-   infraestructura.

## 5.11 Customer

Referencia de una organización cliente.

En el ecosistema real, la fuente de verdad será Twenty.

Control Tower almacenará como mínimo:

-   external_id
-   name
-   status
-   segment
-   link
-   last_sync

## 5.12 Contact

Persona relacionada con un cliente.

Fuente de verdad: Twenty.

## 5.13 Opportunity

Oportunidad comercial.

Fuente de verdad: Twenty.

Campos sincronizados:

-   external_id
-   title
-   customer
-   value
-   stage
-   probability
-   expected_close_date
-   last_activity
-   next_action
-   link

## 5.14 Project

Proyecto interno, de cliente o de laboratorio.

Campos:

-   id
-   name
-   type
-   description
-   status
-   phase
-   priority
-   customer_id
-   opportunity_id
-   start_date
-   target_date
-   completion_date
-   progress
-   next_action
-   blocked
-   source_links

Tipos:

-   INTERNAL
-   CLIENT
-   LAB

## 5.15 ProjectPhase

Fase de un proyecto.

Ejemplos:

-   Discovery.
-   Diseño.
-   Preparación.
-   Implementación.
-   Revisión.
-   Entrega.
-   Cierre.

## 5.16 Task

Acción concreta.

Campos:

-   title
-   description
-   status
-   priority
-   due_date
-   owner
-   project
-   source_system
-   external_id
-   link

La fuente de verdad puede ser Notion o Twenty según el contexto.

## 5.17 Milestone

Hito importante.

Campos:

-   title
-   project
-   due_date
-   status
-   description

## 5.18 Decision

Registro permanente de una decisión.

Campos:

-   id
-   title
-   date
-   decision
-   rationale
-   alternatives
-   impact
-   status
-   author
-   related_entities
-   source_reference

## 5.19 ChangeEvent

Evento de cambio utilizado para el changelog.

Campos:

-   timestamp
-   actor
-   entity
-   entity_id
-   event_type
-   summary
-   source
-   metadata

## 5.20 KnowledgeItem

Referencia a un objeto de conocimiento.

Tipos:

-   SOP
-   Lesson
-   Template
-   Experiment
-   Concept
-   CaseStudy
-   Research
-   Decision
-   Prompt
-   Guide

La fuente de verdad será Markdown/Git/Obsidian.

## 5.21 KnowledgeInboxItem

Elemento capturado pero todavía no procesado.

Campos:

-   title
-   source
-   captured_at
-   raw_reference
-   status
-   suggested_type
-   suggested_area
-   processing_notes

## 5.22 Asset

Activo reutilizable.

Ejemplos:

-   plantilla;
-   prompt;
-   workflow;
-   componente;
-   dashboard;
-   documento;
-   script;
-   producto digital.

Campos:

-   name
-   type
-   version
-   status
-   owner
-   repository
-   storage_link
-   documentation_link
-   related_service
-   related_project

## 5.23 Application

Aplicación utilizada o gestionada por la empresa.

Ejemplos:

-   Twenty.
-   n8n.
-   Notion.
-   Obsidian.
-   Metabase.

Campos:

-   name
-   category
-   environment
-   status
-   url
-   server
-   repository
-   documentation
-   owner

## 5.24 InfrastructureResource

Servidor, dominio, base de datos, contenedor u otro recurso técnico.

Nunca debe almacenar secretos.

## 5.25 Automation

Automatización activa o en desarrollo.

Campos:

-   name
-   description
-   status
-   trigger
-   source_system
-   target_system
-   workflow_reference
-   documentation
-   last_execution
-   health
-   owner

## 5.26 MarketingChannel

Canal de adquisición o comunicación.

Ejemplos:

-   Instagram.
-   TikTok.
-   LinkedIn.
-   Website.
-   Email.
-   YouTube.

Campos:

-   name
-   type
-   url
-   status
-   audience
-   objective
-   acquisition_role

## 5.27 MarketingCampaign

Campaña o iniciativa de marketing.

## 5.28 FunnelStage

Etapa del funnel comercial.

## 5.29 PortfolioItem

Elemento que puede aparecer en portfolio.

Tipos:

-   Project
-   CaseStudy
-   Demo
-   Template
-   Product
-   Experiment

Campos:

-   title
-   type
-   visibility
-   status
-   public_url
-   source_project
-   description

## 5.30 Experiment

Experimento de laboratorio.

Campos:

-   question
-   hypothesis
-   technology
-   status
-   result
-   learning
-   reusable_asset
-   service_potential

## 5.31 Risk

Riesgo identificado.

Campos:

-   title
-   description
-   probability
-   impact
-   severity
-   mitigation
-   owner
-   status

## 5.32 Issue

Problema actual.

Campos:

-   title
-   description
-   severity
-   status
-   owner
-   project
-   resolution

## 5.33 Dependency

Relación de dependencia.

Ejemplo:

Servicio → depende de → Capacidad.

Campos:

-   source_entity
-   target_entity
-   dependency_type
-   status
-   notes

## 5.34 DailyUpdate

Registro diario opcional.

Campos:

-   date
-   done
-   decided
-   problems
-   next
-   mood/status
-   related_entities

------------------------------------------------------------------------

# 6. RELACIONES

## 6.1 Relaciones estratégicas

``` text
StrategicArea
    ├── Goals
    └── Initiatives

Goal
    └── Initiatives
```

## 6.2 Servicios y capacidades

``` text
Service
    ├── Capability
    ├── Asset
    ├── Project
    └── CaseStudy

Capability
    ├── Skill
    ├── LearningItem
    ├── Service
    └── Project
```

## 6.3 Comercial

``` text
Customer
    ├── Contact
    ├── Opportunity
    └── Project

Opportunity
    └── Project
```

Una Opportunity puede convertirse en Project cuando se gana.

## 6.4 Proyectos

``` text
Project
    ├── Customer
    ├── Opportunity
    ├── ProjectPhase
    ├── Task
    ├── Milestone
    ├── Decision
    ├── Risk
    ├── Issue
    ├── Asset
    ├── KnowledgeItem
    └── PortfolioItem
```

## 6.5 Conocimiento

``` text
KnowledgeInboxItem
        ↓
KnowledgeItem
        ↓
Asset / SOP / Capability / Service / Project
```

## 6.6 Infraestructura

``` text
Application
    ├── InfrastructureResource
    ├── Automation
    ├── Asset
    └── Project
```

## 6.7 Portfolio

``` text
Project
   ↓
PortfolioItem
   ↓
CaseStudy / Demo / PublicProject
```

## 6.8 Dependencias

Cualquier entidad relevante puede depender de otra.

Ejemplo:

``` text
Service
  ↓ depends_on
Capability
  ↓ depends_on
LearningItem
```

------------------------------------------------------------------------

# 7. ESTADOS Y CICLOS DE VIDA

Los estados deben ser explícitos y controlados.

## 7.1 Project

``` text
PLANNED
→ ACTIVE
→ BLOCKED / WAITING
→ REVIEW
→ DELIVERED
→ CLOSED
→ ARCHIVED
```

Estados auxiliares:

-   BLOCKED
-   WAITING

No deben necesariamente ser terminales.

## 7.2 Service

``` text
IDEA
→ DESIGN
→ DEVELOPMENT
→ BETA
→ SELLABLE
→ VALIDATED
→ STANDARDIZED
→ SCALE
→ RETIRED
```

## 7.3 Capability

``` text
IDENTIFIED
→ LEARNING
→ PRACTICING
→ WORKING
→ VALIDATED
→ ADVANCED
```

## 7.4 Opportunity

La fuente de verdad es Twenty.

El Control Tower debe reflejar el pipeline configurado en Twenty.

Pipeline conceptual:

``` text
LEAD
→ CONTACTED
→ QUALIFIED
→ MEETING
→ PROPOSAL
→ NEGOTIATION
→ WON
→ LOST
```

## 7.5 Task

``` text
TODO
→ IN_PROGRESS
→ BLOCKED
→ DONE
→ CANCELLED
```

## 7.6 KnowledgeInboxItem

``` text
CAPTURED
→ TRIAGED
→ PROCESSING
→ CLASSIFIED
→ INTEGRATED
→ ARCHIVED
```

## 7.7 KnowledgeItem

``` text
DRAFT
→ REVIEW
→ VALIDATED
→ ACTIVE
→ OBSOLETE
→ ARCHIVED
```

## 7.8 Asset

``` text
IDEA
→ DEVELOPMENT
→ TESTING
→ ACTIVE
→ DEPRECATED
→ ARCHIVED
```

## 7.9 Automation

``` text
DESIGNED
→ DEVELOPMENT
→ TESTING
→ ACTIVE
→ ERROR
→ DISABLED
→ RETIRED
```

## 7.10 Experiment

``` text
IDEA
→ PLANNED
→ RUNNING
→ COMPLETED
→ FAILED
→ ARCHIVED
```

## 7.11 Risk

``` text
OPEN
→ MITIGATING
→ ACCEPTED
→ RESOLVED
→ CLOSED
```

------------------------------------------------------------------------

# 8. FUENTES DE VERDAD

La regla fundamental es:

> Control Tower controla el estado; la herramienta especializada
> conserva el detalle.

## 8.1 Matriz

  ----------------------------------------------------------------------------
  Información             Fuente de verdad             Control Tower
  ----------------------- ---------------------------- -----------------------
  Empresas/clientes       Twenty                       Sincronización

  Personas/contactos      Twenty                       Sincronización

  Opportunities           Twenty                       Sincronización

  CRM activities          Twenty                       Resumen/enlace

  Proyectos               Según tipo: Notion/Twenty    Estado consolidado

  Tareas                  Notion/Twenty                Vista agregada

  Documentación de        Notion                       Enlace
  proyecto                                             

  Conocimiento            Markdown + Git               Índice/metadatos

  Obsidian graph          Obsidian/Markdown            Enlace/metadatos

  Archivos                Google Drive                 Enlace

  Código                  Git                          Enlace/metadatos

  Aplicaciones            Inventario de Control Tower  Fuente propia

  Infraestructura         Inventario/infraestructura   Resumen
                          técnica                      

  Automatizaciones        n8n / sistema de             Estado
                          automatización               

  Agenda                  Google Calendar              Próximos eventos

  Email                   Gmail                        No almacenar contenido
                                                       completo por defecto

  Credenciales            Password Manager             Nunca almacenar
                                                       secretos

  Portfolio               Control Tower +              Estado editorial
                          repositorios/documentación   

  Decisiones              Control Tower / Markdown KOS Registro sincronizable

  Business OS             Markdown/Notion              Estado de
                                                       implementación

  KOS                     Markdown/Git/Obsidian        Estado de
                                                       implementación
  ----------------------------------------------------------------------------

## 8.2 Regla de escritura

Cuando una información tiene una fuente de verdad externa:

-   Control Tower puede leerla.
-   Control Tower puede mostrarla.
-   Control Tower puede cachearla.
-   Control Tower puede generar enlaces.
-   Control Tower solo debe escribir en ella cuando exista una
    integración explícita y segura.

------------------------------------------------------------------------

# 9. INTEGRACIONES

Las integraciones deben diseñarse como módulos independientes.

## 9.1 Twenty

Funciones iniciales:

-   importar Companies;
-   importar People;
-   importar Opportunities;
-   importar Tasks;
-   sincronizar cambios;
-   abrir registro original.

Futuro:

-   crear/actualizar registros desde Control Tower;
-   detectar Opportunity WON;
-   generar Project.

## 9.2 Notion

Funciones iniciales:

-   enlazar páginas;
-   sincronizar proyectos;
-   sincronizar tareas seleccionadas;
-   leer estados;
-   detectar cambios.

Futuro:

-   crear páginas a partir de plantillas;
-   sincronizar Knowledge Inbox;
-   generar documentación.

## 9.3 Git

Funciones:

-   listar repositorios;
-   mostrar commits recientes;
-   enlazar archivos;
-   mostrar versión de activos;
-   detectar cambios en documentación.

## 9.4 Google Drive

Funciones:

-   enlazar carpetas;
-   enlazar archivos;
-   identificar carpeta de proyecto.

No duplicar archivos grandes.

## 9.5 Google Calendar

Funciones:

-   próximos eventos;
-   eventos relacionados con clientes/proyectos;
-   disponibilidad.

## 9.6 Gmail

MVP:

-   no integrar contenido completo.

Futuro:

-   detectar emails relacionados con clientes;
-   generar actividades;
-   detectar tareas;
-   registrar interacciones.

Requiere especial atención a privacidad.

## 9.7 n8n

Funciones:

-   registrar automatizaciones;
-   recibir eventos;
-   detectar errores;
-   mostrar última ejecución;
-   activar workflows mediante API/webhook cuando esté autorizado.

## 9.8 Infraestructura

Futuro:

-   Docker;
-   servidores;
-   uptime;
-   health checks.

## 9.9 IA

La IA no debe ser requisito del MVP.

Futuro:

-   resumir cambios;
-   clasificar conocimiento;
-   detectar decisiones;
-   generar Daily Briefing;
-   sugerir prioridades;
-   responder preguntas utilizando fuentes autorizadas.

------------------------------------------------------------------------

# 10. NAVEGACIÓN

La navegación debe priorizar orientación, no cantidad de módulos.

## 10.1 Menú principal

``` text
HOME
EMPRESA
  ├── Dirección
  ├── Objetivos
  ├── Iniciativas
  ├── Servicios
  └── Capacidades

OPERACIÓN
  ├── Clientes
  ├── Opportunities
  ├── Proyectos
  ├── Tareas
  └── Hitos

CONSTRUCCIÓN
  ├── Business OS
  ├── KOS
  ├── Infraestructura
  └── Automatizaciones

CONOCIMIENTO
  ├── Inbox
  ├── Decisiones
  ├── Lecciones
  └── Biblioteca

MARKETING
  ├── Canales
  ├── Campañas
  ├── Funnel
  └── Contenido

PORTFOLIO
  ├── Proyectos
  ├── Casos de estudio
  ├── Demos
  ├── Plantillas
  └── Laboratorio

CONTROL
  ├── Cambios
  ├── Riesgos
  ├── Issues
  └── Dependencias

SETTINGS
  ├── Integraciones
  ├── Usuarios
  ├── Roles
  └── Sistema
```

## 10.2 Búsqueda global

Debe existir una búsqueda global.

Debe poder buscar:

-   proyectos;
-   clientes;
-   decisiones;
-   servicios;
-   capacidades;
-   activos;
-   conocimiento;
-   tareas;
-   iniciativas.

Debe mostrar:

-   tipo;
-   nombre;
-   estado;
-   fuente;
-   enlace.

------------------------------------------------------------------------

# 11. DASHBOARD

## 11.1 Principio

El dashboard no debe mostrarlo todo.

Debe mostrar aquello que requiere atención.

## 11.2 Widgets

### Estado general

-   estado empresa;
-   última actualización;
-   salud del sistema.

### Atención

-   bloqueos;
-   tareas vencidas;
-   riesgos críticos;
-   automatizaciones con error;
-   decisiones pendientes.

### Hoy

-   tareas;
-   reuniones;
-   prioridades.

### Cambios recientes

Últimos ChangeEvents.

### Proyectos activos

Con:

-   estado;
-   progreso;
-   próxima acción;
-   bloqueos.

### Clientes

-   clientes activos;
-   oportunidades importantes;
-   última interacción;
-   próxima acción.

### Construcción de empresa

Progreso de:

-   Business OS;
-   KOS;
-   CRM;
-   Marketing;
-   Portfolio;
-   Infraestructura.

### Knowledge Inbox

Número de elementos pendientes.

### Próximos hitos

Ordenados cronológicamente.

## 11.3 "What changed?"

Debe ser una sección permanente.

Ejemplo:

``` text
Desde tu última visita:

✓ Cliente Beta pasó a "En ejecución".
✓ Se creó DEC-014.
✓ Se completaron 3 tareas.
⚠ Automatización CRM falló.
✓ Se añadió un nuevo activo.
```

## 11.4 Daily Briefing

En MVP puede ser manual/plantilla.

En fase posterior puede ser generado por IA.

------------------------------------------------------------------------

# 12. PERMISOS

## 12.1 MVP

Roles:

### OWNER

Acceso completo.

## 12.2 Fase 2

### ADMIN

Configuración operativa.

### MEMBER

Operación.

### VIEWER

Lectura.

## 12.3 Fase 3

### CLIENT

Acceso únicamente a información compartida.

### INTEGRATION

Usuario técnico/API con permisos limitados.

## 12.4 Principio

Los permisos deben aplicarse:

-   por organización;
-   por usuario;
-   por rol;
-   por entidad;
-   cuando sea necesario, por acción.

------------------------------------------------------------------------

# 13. AUDITORÍA

Todas las acciones importantes deben registrar:

-   actor;
-   timestamp;
-   entidad;
-   acción;
-   valor anterior;
-   valor nuevo;
-   origen;
-   IP si es apropiado y legalmente justificable;
-   integration_id cuando proceda.

## Acciones auditables

-   login;
-   logout;
-   creación;
-   modificación;
-   eliminación;
-   cambio de estado;
-   cambio de permisos;
-   creación de integración;
-   ejecución de automatización;
-   sincronización;
-   error de integración.

## Regla

No borrar registros críticos de auditoría.

Preferir archivado o soft-delete.

------------------------------------------------------------------------

# 14. AUTOMATIZACIONES

## 14.1 Automatizaciones iniciales

### Sync Twenty

``` text
Twenty
→ webhook/API/polling
→ Control Tower
→ actualizar estado
→ registrar ChangeEvent
```

### Sync Notion

``` text
Notion
→ sincronización
→ Control Tower
→ actualizar proyecto/tarea
→ ChangeEvent
```

### Git activity

``` text
Git
→ commit/repository event
→ Control Tower
→ actualizar Asset/Project
```

### Knowledge Inbox

``` text
Nueva captura
→ Inbox
→ estado CAPTURED
```

## 14.2 Automatizaciones posteriores

### Opportunity WON

``` text
Twenty Opportunity = WON
↓
Control Tower detecta evento
↓
crear/activar Project
↓
crear checklist
↓
crear ChangeEvent
↓
notificar usuario
```

### Proyecto cerrado

``` text
Project = CLOSED
↓
crear tarea Postmortem
↓
crear KnowledgeInboxItem
↓
crear sugerencia de CaseStudy
```

### Automatización con error

``` text
n8n error
↓
Automation = ERROR
↓
Issue automático
↓
Dashboard ALERT
```

### Nueva decisión

``` text
Decision creada
↓
ChangeEvent
↓
Daily Briefing
```

## 14.3 Regla de idempotencia

Todas las integraciones deben evitar duplicados.

Cada registro externo debe conservar:

-   source_system;
-   external_id.

La combinación:

``` text
source_system + external_id
```

debe poder actuar como identificador único de sincronización.

------------------------------------------------------------------------

# 15. API

## 15.1 Principio

Control Tower debe tener API propia desde el MVP.

## 15.2 Operaciones mínimas

CRUD para entidades internas:

-   projects;
-   tasks;
-   decisions;
-   services;
-   capabilities;
-   initiatives;
-   goals;
-   assets;
-   knowledge;
-   automations;
-   risks;
-   issues;
-   portfolio.

## 15.3 Endpoints conceptuales

``` text
GET /api/projects
GET /api/projects/:id
POST /api/projects
PATCH /api/projects/:id

GET /api/tasks
POST /api/tasks
PATCH /api/tasks/:id

GET /api/decisions
POST /api/decisions

GET /api/services
GET /api/capabilities

GET /api/changes
GET /api/dashboard

GET /api/integrations
POST /api/integrations/:id/sync

POST /api/webhooks/:integration
```

La implementación concreta puede variar.

## 15.4 Webhooks

El sistema debe soportar webhooks entrantes para futuras integraciones.

## 15.5 API keys

En MVP:

-   claves por integración;
-   almacenamiento seguro;
-   revocación;
-   rotación.

Nunca mostrar claves completas después de su creación.

## 15.6 Futuro

-   OAuth.
-   Webhook subscriptions.
-   GraphQL opcional.
-   MCP/server interface para agentes IA.
-   API multi-tenant.

------------------------------------------------------------------------

# 16. MODELO DE DATOS

## 16.1 Base de datos

Recomendación:

**PostgreSQL**.

## 16.2 Convenciones

Todas las tablas deben tener:

-   id UUID;
-   created_at;
-   updated_at.

Entidades relevantes también:

-   archived_at;
-   created_by;
-   updated_by.

## 16.3 Integración externa

Tabla conceptual:

``` text
external_records
-----------------
id
entity_type
internal_id
source_system
external_id
external_url
last_synced_at
sync_hash
sync_status
```

Debe existir una restricción única sobre:

``` text
source_system + entity_type + external_id
```

## 16.4 Relaciones

Las relaciones deben implementarse con foreign keys cuando sean
conocidas.

Para relaciones polimórficas, utilizar un modelo controlado y explícito,
evitando una tabla genérica sin restricciones siempre que sea posible.

## 16.5 Soft delete

Entidades críticas deben utilizar:

``` text
archived_at
```

en lugar de eliminación física inmediata.

## 16.6 Change events

Tabla:

``` text
change_events
--------------
id
timestamp
actor_type
actor_id
source
entity_type
entity_id
event_type
summary
metadata_json
```

## 16.7 Daily updates

Tabla:

``` text
daily_updates
-------------
id
date
user_id
done
decided
problems
next
created_at
```

## 16.8 Tags

No utilizar tags como sustituto de relaciones estructuradas.

Los tags sirven para clasificación flexible.

Las relaciones sirven para semántica empresarial.

------------------------------------------------------------------------

# 17. MVP

El MVP debe ser deliberadamente pequeño.

## 17.1 Objetivo del MVP

Resolver el problema:

> "Quiero abrir una aplicación y saber rápidamente dónde está mi empresa
> y qué tengo que hacer."

## 17.2 Funcionalidades

### Dashboard

-   estado;
-   prioridades;
-   cambios;
-   proyectos;
-   tareas;
-   bloqueos;
-   próximos hitos.

### Empresa

-   objetivos;
-   iniciativas;
-   servicios;
-   capacidades.

### Proyectos

-   crear;
-   editar;
-   estados;
-   fases;
-   tareas;
-   enlaces externos.

### Decisions

-   crear;
-   editar;
-   consultar;
-   relacionar.

### Change Log

-   registrar cambios;
-   visualizar cambios.

### Knowledge Inbox

-   crear captura;
-   clasificar manualmente;
-   enlazar fuente.

### Portfolio

-   registrar proyectos;
-   marcar visibilidad;
-   enlazar demo/caso de estudio.

### Integraciones iniciales

Prioridad:

1.  Twenty.
2.  Notion.
3.  Git.

Google Drive y Calendar pueden ser enlaces manuales en la primera
versión.

## 17.3 Lo que NO debe estar en el MVP

-   agente IA autónomo;
-   RAG;
-   vector database;
-   multi-tenant completo;
-   billing;
-   portal cliente;
-   contabilidad;
-   CRM propio;
-   gestor documental;
-   editor de conocimiento;
-   sistema de contraseñas.

------------------------------------------------------------------------

# 18. FASE 2

Objetivo:

> Convertir Control Tower en una herramienta de gobierno realmente
> conectada.

## Funcionalidades

### Integraciones

-   Google Drive;
-   Google Calendar;
-   Gmail;
-   n8n;
-   infraestructura.

### Automatizaciones

-   sincronización automática;
-   eventos;
-   creación de proyectos;
-   generación de tareas;
-   detección de errores.

### Inteligencia

-   Daily Briefing;
-   resumen de cambios;
-   sugerencias de prioridades;
-   clasificación de Knowledge Inbox;
-   detección de posibles decisiones.

### Gestión avanzada

-   dependencias;
-   riesgos;
-   issues;
-   métricas;
-   portfolio público.

### UI

-   filtros;
-   vistas;
-   timelines;
-   Kanban;
-   dashboards configurables.

------------------------------------------------------------------------

# 19. FASE 3

Objetivo:

> Convertir Control Tower en un producto comercial reutilizable para
> otras empresas.

## 19.1 Multi-tenant

Cada empresa tendrá:

``` text
Organization
├── Users
├── Projects
├── Clients
├── Services
├── Knowledge
├── Assets
└── Integrations
```

Los datos de organizaciones deben estar estrictamente aislados.

## 19.2 Onboarding

Asistente inicial:

1.  Crear organización.
2.  Definir tipo de empresa.
3.  Definir áreas.
4.  Definir servicios.
5.  Conectar herramientas.
6.  Importar datos.
7.  Configurar dashboard.

## 19.3 Templates

Plantillas para:

-   consultoras;
-   freelancers;
-   agencias;
-   coaches;
-   estudios;
-   pequeñas empresas;
-   negocios digitales.

## 19.4 Cliente portal

Vista externa opcional.

## 19.5 Agente IA

El agente debe poder:

-   consultar fuentes;
-   resumir;
-   localizar información;
-   detectar cambios;
-   preparar reuniones;
-   generar briefings;
-   sugerir acciones.

No debe ejecutar acciones críticas sin autorización.

## 19.6 Knowledge Router

Arquitectura conceptual:

``` text
Pregunta
↓
Intent classification
↓
Identificar tipo de conocimiento
↓
Seleccionar fuente
↓
Recuperar información
↓
Context assembly
↓
LLM
↓
Respuesta con referencias
```

La vectorización será opcional y solo se añadirá si los datos y casos de
uso justifican su necesidad.

## 19.7 MCP / Agent Interface

Preparar una interfaz para agentes externos que permita:

-   consultar estado;
-   buscar entidades;
-   consultar decisiones;
-   consultar proyectos;
-   consultar activos;
-   crear tareas;
-   registrar decisiones;

siempre respetando permisos.

## 19.8 Producto comercial

Preparar:

-   pricing;
-   planes;
-   onboarding;
-   documentación;
-   soporte;
-   métricas;
-   billing;
-   observabilidad.

------------------------------------------------------------------------

# 20. CRITERIOS DE ACEPTACIÓN

El sistema se considera MVP válido cuando cumple todos los criterios
siguientes.

## 20.1 Orientación

Al abrir la aplicación, el usuario puede conocer en menos de cinco
minutos:

-   estado de la empresa;
-   proyectos activos;
-   tareas relevantes;
-   bloqueos;
-   cambios recientes;
-   próximas prioridades.

## 20.2 Proyectos

El usuario puede:

-   crear un proyecto;
-   asignarle tipo;
-   asignarle cliente;
-   asignar estado;
-   asignar fase;
-   establecer prioridad;
-   registrar próxima acción;
-   añadir enlaces a sistemas externos.

## 20.3 Decisiones

El usuario puede registrar una decisión con:

-   título;
-   decisión;
-   motivo;
-   fecha;
-   impacto;
-   relaciones.

La decisión queda visible posteriormente en el historial.

## 20.4 Change Log

El sistema registra los cambios importantes y permite filtrarlos.

## 20.5 Integraciones

El sistema puede identificar un registro externo de Twenty y enlazarlo
sin crear duplicados.

Debe poder sincronizar al menos:

-   Companies;
-   People;
-   Opportunities.

## 20.6 Idempotencia

Una sincronización repetida no crea duplicados.

## 20.7 Fuentes de verdad

Cada registro sincronizado muestra claramente:

-   fuente;
-   enlace original;
-   última sincronización.

## 20.8 Tareas

El usuario puede ver tareas pendientes y su relación con proyectos.

## 20.9 Knowledge Inbox

El usuario puede capturar una pieza de conocimiento y dejarla pendiente
de procesamiento.

## 20.10 Portfolio

El usuario puede registrar un proyecto y marcar si es:

-   interno;
-   privado;
-   publicable.

## 20.11 Seguridad

-   No existen contraseñas en la base de datos de negocio.
-   Las credenciales de integraciones están protegidas.
-   Los usuarios solo acceden a la información autorizada.
-   Las acciones sensibles quedan auditadas.

## 20.12 API

Las entidades principales del MVP pueden consultarse mediante API.

## 20.13 Backup

Debe existir un mecanismo documentado de backup de la base de datos.

## 20.14 Recuperación

Debe poder restaurarse una copia de seguridad en un entorno limpio
siguiendo documentación.

## 20.15 Arquitectura extensible

La implementación no debe impedir:

-   nuevas integraciones;
-   nuevos tipos de entidades;
-   multi-tenancy;
-   agentes IA;
-   MCP;
-   dashboards adicionales.

------------------------------------------------------------------------

# 21. REGLAS FUNCIONALES IMPORTANTES

## Regla 1 --- No duplicar el detalle

Si el detalle vive en Notion, mostrar enlace.

Si el detalle vive en Git, mostrar enlace.

Si el detalle vive en Drive, mostrar enlace.

## Regla 2 --- No guardar secretos

Nunca guardar:

-   contraseñas;
-   API keys en texto plano;
-   tokens;
-   claves SSH privadas;
-   secretos de OAuth.

## Regla 3 --- Toda integración debe tener identificador externo

Usar:

``` text
source_system
external_id
```

## Regla 4 --- Toda entidad importante debe tener estado

No crear entidades cuyo estado no pueda entenderse.

## Regla 5 --- Toda entidad importante debe poder localizar su fuente

Debe existir:

``` text
source
source_url
```

cuando sea aplicable.

## Regla 6 --- Las relaciones deben ser explícitas

Evitar depender únicamente de texto libre.

## Regla 7 --- El dashboard no es una base de datos

Es una vista.

## Regla 8 --- El changelog es histórico

No debe editarse arbitrariamente como si fuera una tarea.

## Regla 9 --- Las decisiones deben ser permanentes

Una decisión antigua puede quedar superseded/obsoleta, pero no debe
desaparecer.

## Regla 10 --- Automatizar después de validar

No automatizar procesos ambiguos.

------------------------------------------------------------------------

# 22. PRINCIPIOS PARA EL DESARROLLO CON CLAUDE

Claude debe tratar este documento como **especificación**, no como
sugerencia general.

## 22.1 No inventar requisitos

Si una decisión técnica no está definida:

1.  identificar la incertidumbre;
2.  proponer alternativas;
3.  no implementar una decisión irreversible sin confirmación.

## 22.2 Separar producto y aplicación

El código debe mantener:

-   domain;
-   application;
-   infrastructure;
-   integrations;
-   UI.

lo suficientemente separados como para poder cambiar una integración sin
reconstruir el dominio.

## 22.3 No acoplar entidades internas a APIs externas

Twenty Company no debe convertirse en la clase de dominio Customer.

Debe existir una capa de integración/mapeo.

## 22.4 Tests

Cada funcionalidad crítica debe tener tests.

Especialmente:

-   sincronización;
-   idempotencia;
-   permisos;
-   estados;
-   auditoría.

## 22.5 Migraciones

Todo cambio de esquema debe tener migración reproducible.

## 22.6 Documentación

Cada módulo importante debe incluir:

-   propósito;
-   configuración;
-   dependencias;
-   API;
-   tests;
-   decisiones técnicas relevantes.

------------------------------------------------------------------------

# 23. ROADMAP DE IMPLEMENTACIÓN

## Sprint 0 --- Especificación

-   validar modelo;
-   validar navegación;
-   validar estados;
-   definir stack técnico;
-   crear repositorio;
-   crear documentación.

## Sprint 1 --- Foundation

-   proyecto;
-   PostgreSQL;
-   autenticación;
-   usuarios;
-   organizaciones;
-   migraciones;
-   layout.

## Sprint 2 --- Core

-   Projects;
-   Tasks;
-   Decisions;
-   Services;
-   Capabilities;
-   Initiatives.

## Sprint 3 --- Dashboard

-   Home;
-   Today;
-   Changes;
-   Alerts;
-   Projects.

## Sprint 4 --- Integración Twenty

-   conexión;
-   Companies;
-   People;
-   Opportunities;
-   sincronización;
-   idempotencia.

## Sprint 5 --- Integración Notion/Git

-   enlaces;
-   proyectos;
-   Knowledge Inbox;
-   repositorios.

## Sprint 6 --- Auditoría y estabilidad

-   audit log;
-   errores;
-   backups;
-   tests;
-   documentación.

## Sprint 7 --- MVP

-   polish;
-   responsive;
-   deployment;
-   validación real.

------------------------------------------------------------------------

# 24. DEFINICIÓN DE ÉXITO

Control Tower habrá cumplido su propósito cuando la empresa pueda
funcionar con la siguiente rutina:

## Al comenzar el día

Abrir Control Tower.

Consultar:

1.  ¿Qué cambió?
2.  ¿Qué está bloqueado?
3.  ¿Qué tengo que hacer?
4.  ¿Qué clientes necesitan atención?
5.  ¿Qué proyecto necesita atención?
6.  ¿Qué decisión está pendiente?
7.  ¿Qué prioridad tiene hoy la construcción de la empresa?

## Durante el día

Cada decisión importante:

``` text
→ registrar
```

Cada nuevo proyecto:

``` text
→ registrar
```

Cada cambio relevante:

``` text
→ queda registrado
```

Cada conocimiento nuevo:

``` text
→ Knowledge Inbox
```

## Al terminar

Registrar:

``` text
Qué hice
Qué decidí
Qué aprendí
Qué quedó pendiente
Qué haré después
```

## Al volver después de varios días

Consultar:

``` text
WHAT CHANGED?
```

y recuperar inmediatamente el contexto.

------------------------------------------------------------------------

# 25. VISIÓN FINAL

La evolución prevista es:

``` text
FASE 1

Control Tower
↓
Dashboard personal
↓
Estado de empresa
↓
Registro manual
```

``` text
FASE 2

Control Tower
↓
Integraciones
↓
Sincronización
↓
Automatizaciones
↓
Daily Briefing
```

``` text
FASE 3

Control Tower
↓
Multi-tenant
↓
Templates
↓
Agentes IA
↓
Knowledge Router
↓
Producto comercial
```

La visión final es:

> **Una consola de gobierno empresarial capaz de conectar estrategia,
> operaciones, clientes, proyectos, conocimiento, activos y sistemas,
> proporcionando a una persona o equipo una visión contextual del estado
> de su empresa y automatizando progresivamente la actualización de esa
> visión.**

------------------------------------------------------------------------

# 26. DECISIONES ABIERTAS ANTES DE IMPLEMENTAR

Estas decisiones deben confirmarse antes de comenzar el desarrollo:

-   [ ] Stack frontend.
-   [ ] Stack backend.
-   [ ] ORM.
-   [ ] Sistema de autenticación.
-   [ ] Método de deployment.
-   [ ] Estrategia de backups.
-   [ ] Sistema de logs.
-   [ ] Sistema de observabilidad.
-   [ ] Convención de IDs.
-   [ ] Estrategia exacta de sincronización Twenty.
-   [ ] Estrategia exacta de sincronización Notion.
-   [ ] Estrategia Git.
-   [ ] Política de almacenamiento de snapshots.
-   [ ] Política de retención de auditoría.
-   [ ] Diseño definitivo de multi-tenancy para Fase 3.

Estas decisiones no deben bloquear la definición funcional del MVP salvo
que afecten directamente al modelo de datos.

------------------------------------------------------------------------

# 27. PRINCIPIO FINAL

Control Tower debe seguir una regla por encima de todas:

> **La aplicación debe reducir la carga cognitiva de dirigir la empresa,
> no aumentarla.**

Si para mantener Control Tower actualizado hay que duplicar manualmente
toda la información existente en Twenty, Notion, Git y Drive, el sistema
habrá fracasado.

El objetivo es el contrario:

``` text
Empresa
   ↓
Sistemas especializados
   ↓
Integraciones
   ↓
Control Tower
   ↓
Contexto consolidado
   ↓
Decisión humana
   ↓
Automatización
```

Y posteriormente:

``` text
Empresa
   ↓
Sistemas
   ↓
Control Tower
   ↓
Agentes IA
   ↓
Recomendaciones
   ↓
Autorización humana
   ↓
Acciones
```

La automatización debe aumentar progresivamente, mientras que el usuario
conserva el control sobre las decisiones relevantes.

