# Product

## Register

product

## Users

Personas que crean y gestionan su currículum: estudiantes, personas buscando empleo y
profesionales que actualizan su CV. A menudo **no son técnicos** y llegan con cierta ansiedad ante
"hacer el CV". Su contexto es una tarea concreta y enfocada: construir/editar un currículum, verlo
en tiempo real y exportarlo con aspecto profesional. La app es **multiusuario** (login por email),
de uso personal ahora pero pensada para ofrecerse como servicio web en el futuro. Usan sobre todo
escritorio para editar (el editor es de 3 columnas), pero pueden entrar desde el móvil.

## Product Purpose

**CV Express**: un creador de currículums que permite crear desde cero o importar un CV existente
(PDF/DOC/DOCX) adaptándolo con IA, editarlo con vista previa en vivo sobre 5 plantillas, traducirlo
a otro idioma con IA (creando una copia), compararlo contra una oferta de trabajo con un informe de
compatibilidad, y exportarlo como PDF vectorial. Los datos se guardan en el servidor por usuario.
El éxito es que el usuario produzca **rápido y con confianza un CV de aspecto impecable** y pueda
adaptarlo (idioma, oferta) sin fricción.

## Brand Personality

**Profesional y de confianza.** Sobrio, ordenado, creíble; una herramienta seria que se aparta del
camino. Voz clara y en español natural, que anima sin ser cursi ni infantil. La calidez la aporta la
claridad y la ayuda contextual, no la decoración. Tres palabras: *fiable, pulido, sin fricción.*

## Anti-references

- **Plantilla genérica de IA**: tarjetas idénticas repetidas, gradientes decorativos, "eyebrows" en
  mayúsculas sobre cada sección, composición intercambiable que grita "lo generó una IA".
- **Recargado / infantil**: exceso de colores, emojis y adornos que restan seriedad a un producto
  sobre currículums.
- **Creadores de CV baratos**: los típicos "CV maker" saturados de anuncios, upsells y plantillas
  cutres.

(No se rechaza la familiaridad de producto; se rechaza la *rareza sin propósito* y el ruido.)

## Design Principles

- **La herramienta desaparece en la tarea.** Familiaridad ganada (patrones estándar de producto),
  no invención de affordances para lucirse.
- **El resultado es el héroe.** La vista previa del CV debe verse impecablemente profesional; la UI
  de edición es el marco, no la estrella.
- **Guiar sin sobreproteger.** Reducir la ansiedad del CV con pasos claros y por secciones; condicionar
  las acciones de IA (traducir) a que el CV esté completo para no desperdiciar ni confundir.
- **Confianza por pulido y consistencia.** Mismo vocabulario de componentes en todas las pantallas;
  un "guardar" o un icono se comportan igual en todas partes.
- **Restricción profesional.** El índigo es para acciones primarias, selección y estado — no para
  decorar.

## Accessibility & Inclusion

Objetivo **WCAG 2.1 AA**: contraste ≥4.5:1 en texto (y placeholders), navegación completa por
teclado con foco visible, estados anunciados (carga, éxito, error), significado no dependiente solo
del color, y alternativa para `prefers-reduced-motion`. Público futuro amplio y no técnico, en
español (con contenidos del CV multi-idioma).
