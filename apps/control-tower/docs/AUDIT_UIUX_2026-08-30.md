# Control Tower — Informe de situación UI/UX (2026-08-30)

> Crítica de diseño (no rediseño) de `apps/web`. Registro: **product** (el diseño sirve a la tarea, no es
> el producto). Método: revisión heurística (Nielsen ×10) + detector determinista de anti-patrones +
> recorrido por personas. Complementa la auditoría técnica general en `docs/AUDIT_2026-08-30.md`.

Superficies revisadas: `app-shell`, `sidebar`, Home (dashboard), lista (Clients), `data-table`, primitivas
(`button`/`input`/`empty-state`), `record-panel`, login, tokens (`globals.css` + `DESIGN_TOKENS.md`).

---

## Puntuación de salud de diseño (Nielsen)

| # | Heurística | Punt. | Problema clave |
|---|-----------|:---:|-----------|
| 1 | Visibilidad del estado | 2 | Sin `loading.tsx`/skeletons: navegar entre rutas no da feedback hasta que responde el server. Guardar solo hace `router.refresh()`, sin confirmación (toast). **Los skeletons se probaron y se descartaron (owner, 2026-09-01)**; queda la micro-confirmación al guardar. |
| 2 | Sistema ↔ mundo real | 3 | Español claro, términos de dominio razonables, orden lógico. Copy desincronizado: EmptyState de Clients dice "Crea uno con el formulario de arriba" y ese formulario ya no existe (ahora es panel lateral "＋ Nuevo"). |
| 3 | Control y libertad | 3 | Archivar es reversible (restaurar), borrar pide confirmación, paneles cierran con Esc/backdrop. Falta undo tras guardar y el foco no se restaura al cerrar el panel. |
| 4 | Consistencia y estándares | 3 | Primitivas + tokens fuertes, vocabulario homogéneo. Grietas: login hace inputs a mano en vez de usar `Input`/`Button`; `record-panel` reimplementa `Drawer`; 4 colores crudos saltan el sistema de tokens. |
| 5 | Prevención de errores | 3 | Confirma en destructivo, validación Zod, `disabled`, `minLength=8`. Falta validación cliente previa (título vacío se envía y lo rechaza el server). |
| 6 | Reconocer > recordar | 3 | Nav con etiquetas de texto, filtros visibles, búsqueda global (⌘K), badges de fuente. Bien. |
| 7 | Flexibilidad y eficiencia | 2 | Búsqueda con debounce, selección/archivado en lote. Sin atajos de teclado más allá de la búsqueda; combobox sin navegación por flechas; edición de uno en uno. |
| 8 | Estética y minimalismo | 3 | Limpio, sobrio, densidad correcta. "Eyebrow" en mayúsculas en TODAS las secciones baja la jerarquía; 5 métricas idénticas (patrón genérico). |
| 9 | Recuperación de errores | 2 | Un `fetch` que rechaza deja el campo/botón `busy` para siempre y sin mensaje; si falla el GET del panel, muestra formulario en blanco sin avisar. Mensajes genéricos. |
| 10 | Ayuda y documentación | 3 | Guía completa embebida en la app (`/settings/guide`, con matriz de información). Muy buena para una herramienta propia; no es contextual (sin tooltips). |
| **Total** | | **27/40** | **Aceptable-alto (base sólida, huecos reales en feedback, a11y y eficiencia)** |

---

## Veredicto de anti-patrones — ¿parece hecho por IA?

**Evaluación LLM:** No. Es un producto sobrio y coherente que pasa el "test de producto" (un usuario fluido en
Linear/Notion/Stripe confiaría en él). No hay adornos gratuitos, ni fuentes display en labels, ni afordancias
inventadas. Dos tics menores de plantilla: (1) el **eyebrow en mayúsculas con tracking** repetido en las 8
secciones del dashboard — una señal de "andamiaje por reflejo"; (2) la fila de **5 métricas idénticas**
(número grande + label), que es el molde SaaS por defecto. Ninguno descalifica, pero son los dos sitios donde
el diseño "va por raíles".

**Detector determinista:** prácticamente limpio (2 avisos, ambos no accionables): un `<img>` en `avatar.tsx`
que es **falso positivo** (va protegido por `if (image)` con data URL propio), y "abuso de em-dash" en
`globals.css` que son **comentarios de tokens**, no copy visible. Que un escáner de slop no encuentre nada
real es una buena señal.

---

## Impresión general

Es una UI de herramienta **honesta y bien construida**: sistema de tokens con fuente única, tema claro/oscuro,
primitivas reutilizadas, IA de dashboard con buen "olor a información" (todo enlaza a su entidad fuente),
estados vacíos por todas partes y copy en español llano. **Lo que le falta no es estética sino robustez de
interacción**: estados de foco para teclado (hoy inexistentes), feedback de carga/guardado, accesibilidad de
los overlays y una historia responsive. La mayor oportunidad: **arreglar el foco y el feedback en las
primitivas** — es transversal y barato, y sube varias heurísticas a la vez.

---

## Lo que funciona (con razón)

1. **Sistema de tokens semántico y disciplinado** (`globals.css`): un color se cambia en un sitio y se propaga;
   claro/oscuro "toggle-ready" por `data-theme`. `DESIGN_TOKENS.md` documenta la migración de ~592 usos crudos
   a 0 (quedan 4 residuales — ver abajo). Esto es lo que da la sensación de "un solo producto".
2. **El estado nunca va por color solo:** `StatusBadge`/`status-tone` siempre icono + etiqueta. Base a11y
   correcta que mucha gente se salta.
3. **IA del dashboard:** Snapshot → Requiere atención → Vencidas/Hoy → Decisiones/Actividad → Estado del
   sistema. Jerarquía por tarea, cada ítem enlaza a su fuente, empty states con copy amable. Es exactamente el
   loop "¿qué requiere atención?" que promete el producto.

---

## Problemas prioritarios

### [P1] Estados de foco inexistentes en toda la UI — ✅ RESUELTO (2026-09-01)
`button.tsx` (`BASE`) y `fieldCls` (`input.tsx`) **no definen `focus-visible`**; enlaces del sidebar, tabs de
filtro y checkboxes de la tabla dependen solo del outline por defecto del navegador (que los resets suelen
atenuar). Grep: **0 coincidencias de `focus-visible`/`focus:ring` en todo `apps/web`**.
**Por qué importa:** un usuario de teclado (o lector de pantalla) no ve dónde está. Rompe la navegación
completa para "Sam".
**Fix:** añadir `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link` (o un token nuevo
`--ring`) a `BASE` de Button y a `fieldCls`, y un ring a los `Link` de sidebar/tabs. Una edición en las
primitivas cubre casi toda la app. → `/impeccable audit`

**✅ RESUELTO (2026-09-01):** token **`--ring`** (blue-600 / blue-400 en oscuro) + **red de seguridad global** en
`globals.css`: `:where(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])):focus-visible`
→ `outline: 2px solid var(--ring)` con `outline-offset: 2px`. Va en `:where()` (especificidad 0) para que cualquier
componente pueda sobreescribirlo, y excluye `tabindex="-1"` (los contenedores de diálogo que reciben foco por programa
al abrirse). Cubre de una vez sidebar, tabs, filas `RecordLink`, checkboxes, combobox, login y todo lo que se escriba en
el futuro. Además, `Button` (BASE) y `fieldCls` declaran su `focus-visible:outline-*` explícito.

### [P1] Overlays no accesibles (panel lateral, modal de búsqueda, combobox) — ✅ RESUELTO (2026-09-01)
**Hecho:** `record-panel` y `Drawer` → `role="dialog"` + `aria-modal` + `aria-label`/`aria-labelledby`, foco al
abrir + restauración al cerrar + **focus-trap** de Tab; backdrop `aria-hidden`. `SearchableSelect` → combobox con
`aria-haspopup`/`aria-expanded` + `role=listbox/option` + navegación ↑/↓/Enter/Escape. `GlobalSearch` (⌘K) también
es `role="dialog"` + focus-trap + restauración de foco. Detalle original abajo. ↓

#### (original)
`record-panel.tsx`/`drawer.tsx`: el `<aside>` no tiene `role="dialog"` ni `aria-modal`, **sin focus-trap ni
gestión de foco** (no mueve el foco al abrir, ni lo restaura al cerrar); el backdrop es un `<div onClick>` sin
rol/teclado. `SearchableSelect` es un combobox sin ARIA (`role=combobox/listbox/option`, `aria-expanded`) y
**sin navegación por flechas** (solo Enter). `GlobalSearch` igual.
**Por qué importa:** con el drawer abierto, el teclado sigue tabulando hacia la página de fondo; para lector de
pantalla el panel no se anuncia como diálogo. Es el patrón más usado de la app (crear/editar todo pasa por
aquí).
**Fix:** `role="dialog" aria-modal="true"`, focus-trap + restauración de foco, backdrop como `<button>` o con
handler de teclado; ARIA + flechas en `SearchableSelect`. → `/impeccable harden`

### [N/A — decisión de alcance] Sin historia responsive / móvil
`app-shell` es un `flex` con `Sidebar` de ancho fijo `w-56 shrink-0` y **sin colapso ni hamburguesa** (grep:
0 `md:hidden`/`lg:hidden`/breakpoints en shell). En un teléfono el sidebar se come el ancho.
**Decisión del owner (2026-08-30): la UI es _solo desktop_ por ahora** (single-user, desktop en la Pi vía
Tailscale). Por tanto esto **no es un P1**: queda registrado como decisión de alcance, no como deuda a
arreglar. Reabrir solo si entran colaboradores (E-11) o se quiere uso móvil; entonces → `/impeccable adapt`
(sidebar colapsable/off-canvas por debajo de `md`).

### [P1] Feedback de carga y de guardado pobre
No hay `loading.tsx` en ninguna ruta ni skeletons (grep: 0). Navegar de una sección a otra no da respuesta
hasta que el server termina. El autoguardado por campo solo hace `router.refresh()` sin confirmación visible;
y si el `fetch` **rechaza** (red caída), el campo queda deshabilitado permanentemente y **sin mensaje** (ver
`lib/client.ts` sin `try/catch`; heurísticas 1 y 9).
**Por qué importa:** "¿se guardó o no?" es la pregunta más frecuente en apps de edición inline; hoy no se
responde.
**Fix:** `app/(app)/loading.tsx` con skeleton; envolver `request()` en `try/catch` que devuelva `{error}`;
micro-confirmación al guardar (check efímero o toast). → `/impeccable harden` + `/impeccable polish`
**✅ CASI COMPLETO (2026-09-01):** `request()` ya nunca rechaza (fallo de red → `{error}`, el campo se resetea y
muestra error); autoguardado con **dirty-check** (no PATCH/refresh si el valor no cambió); y **`app/(app)/loading.tsx`
con skeleton**. **❌ El skeleton se RETIRÓ (2026-09-01, decisión del owner)** — ver abajo. **Pendiente (menor):**
micro-confirmación visible al guardar (check/toast).

**❌ Skeleton de navegación retirado (2026-09-01, decisión del owner).** Se probó `app/(app)/loading.tsx` con
skeleton, primero inmediato y luego con retardo (250 → 450 ms). Ninguna de las dos versiones convenció:
- **Inmediato:** parpadeo «skeleton → página» en cada navegación rápida; hacía parecer la app más lenta de lo que es.
- **Con retardo:** peor. Durante el retardo el skeleton está a `opacity: 0` **pero la página anterior ya se ha
  desmontado** (Next sustituye la ruta por el `loading` en cuanto arranca la navegación), así que lo que se veía era
  el lienzo **en blanco** unos segundos. Un hueco vacío da más sensación de lentitud que no mover nada.
- **Decisión:** volver al comportamiento por defecto — la página anterior se queda visible hasta que la nueva está
  lista. Se borra `loading.tsx` y su CSS. El hallazgo queda **cerrado como descartado**, no pendiente.
- **Si se retoma:** la alternativa que NO tiene este problema es una **barra de progreso fina arriba** (no reemplaza
  el contenido, sólo se superpone), o un skeleton con retardo sólo en las rutas realmente lentas. Y el arreglo de
  fondo sería que las páginas respondan más rápido: las 47 son `force-dynamic` y en la Pi eso se nota.

### [P2] "Eyebrow" en mayúsculas + métricas clónicas (jerarquía y personalidad)
Cada `<h2>` del dashboard es `text-sm uppercase tracking-wide text-fg-muted` → el título de sección es **más
tenue** que su contenido, invirtiendo la jerarquía, y el patrón repetido es el tic de andamiaje de IA. La fila
Snapshot son 5 `MetricCard` idénticas (número + label), el molde SaaS por defecto.
**Fix:** encabezados de sección en peso/tamaño (no mayúsculas atenuadas) con contraste real; diferenciar las
métricas por rol (color de estado en "Vencidas/atención", tendencia) en vez de 5 tarjetas iguales.
→ `/impeccable typeset` + `/impeccable layout`

---

## Banderas por persona

**Alex (power user):** búsqueda global con ⌘K ✅, pero **sin atajos** para acciones comunes (crear, guardar,
navegar), edición **de uno en uno** (no hay "editar en lote" más allá de archivar/borrar), y el combobox no
responde a flechas. Se sentirá frenado.

**Sam (dependiente de accesibilidad):** **bloqueado**. Sin foco visible en ningún control, sin focus-trap en el
panel/modal, combobox sin ARIA, y severidad en Home comunicada por glifo `aria-hidden` (`■`/`◐`) → el lector de
pantalla oye el label pero **no la severidad**. La base de contraste y el icono+texto en badges juegan a favor,
pero la navegación por teclado no está.

**Casey (móvil):** bloqueado por el shell no responsive — pero **fuera de alcance por decisión del owner**
(2026-08-30: solo desktop). No cuenta como fallo mientras el móvil no esté en el alcance.

**Owner (noboolsheet, operador único self-hosted, desktop vía Tailscale):** es el usuario real y está **bien
servido** — densidad correcta, todo enlaza a la fuente, guía embebida, tema oscuro. Los P1 de a11y/responsive
le afectan poco a él, pero son los que bloquean cualquier apertura a colaboradores (E-11).

---

## Observaciones menores

- ~~**4 colores crudos** saltan el sistema de tokens~~ **✅ RESUELTO (2026-09-01):** los checkboxes (`data-table.tsx`
  y `record-panel.tsx`) usan `accent-primary` y la fila seleccionada `bg-row-selected` (token nuevo `--row-selected`).
  `DESIGN_TOKENS.md` vuelve a ser cierto: 0 colores crudos.
- **Login no usa las primitivas** (`Input`/`Button` a mano) y el input "Nombre" lleva `bg-field` pero email/
  contraseña no → posible divergencia en oscuro. **Verificado el 2026-09-01: sigue abierto** (el fichero mantiene
  `<input>`/`<button>` con clases propias). El foco de teclado sí lo cubre la regla global.
- **EmptyState podría enseñar más:** 16 de los 42 usos son solo un título ("Sin decisiones", "Sin eventos") — el resto
  ya lleva `hint`. **Sigue abierto**, aunque matizado: la mayoría de los 16 son secciones del **Home** donde "vacío" es
  la buena noticia (nada vencido, sin eventos hoy) y no hay siguiente paso que enseñar. Los que sí lo pedirían son los
  de listas dentro de fichas (entregables, decisiones de un proyecto).
- **Copy desincronizado** ("formulario de arriba" en la lista de Clients) tras migrar al panel lateral.
- **El registro abierto vive en la pantalla de login** (toggle "Regístrate"). **El riesgo de seguridad está CERRADO**
  (B-6, 2026-08-31: el registro es bootstrap-only — el segundo usuario recibe FORBIDDEN salvo escape hatch). Queda solo
  lo cosmético: el toggle sigue visible e invita a un registro que va a fallar. Merece ocultarlo cuando ya hay usuario.

---

## Preguntas para desbloquear mejores decisiones

- ¿El **móvil** está dentro del alcance, o es explícitamente "solo desktop en la Pi"? La respuesta decide si el
  shell responsive es P1 o "no aplica".
- Si algún día entran **colaboradores** (E-11), la accesibilidad de teclado deja de ser opcional. ¿Vale la pena
  pagar ahora la deuda de foco/overlays (barata) para no rehacerlo luego?
- El dashboard **enseña** bien, pero ¿podría **actuar** más? (p. ej. cambiar estado/fecha desde la propia
  tarjeta sin abrir la entidad — ya lo hace en "Vencidas"; extenderlo).

---

## Resumen accionable (por impacto)

> **Nota (owner, 2026-08-30):** por ahora esto es **solo diagnóstico** — no se ejecuta ningún cambio. Y el
> móvil queda **fuera de alcance** (solo desktop). Lista de referencia para cuando se quiera abordar:

1. ✅ **HECHO (2026-09-01)** — foco de teclado: token `--ring` + regla global `:focus-visible` + primitivas.
2. ✅ **HECHO (2026-08-31/09-01)** — overlays accesibles (dialog/aria-modal/focus-trap) + robustez del autoguardado.
3. 🟡 **PARCIAL** — 4 colores crudos ✅; `loading.tsx`/skeletons ❌ **descartado por el owner** (2026-09-01: el
   hueco en blanco daba más sensación de lentitud que no mover nada); **pendiente**: micro-confirmación al guardar
   (check/toast) y el copy desincronizado ("formulario de arriba" en Clients).
4. **`/impeccable typeset` + `/impeccable layout`** — encabezados de sección con jerarquía real; diferenciar las métricas.
5. _(Diferido, fuera de alcance actual)_ **`/impeccable adapt`** — responsive/móvil, solo si entra en alcance.

**Primera ejecución para este objetivo; sin tendencia previa.**

---

## Añadido por la revisión de producto (2026-09-01, sesión 27)

Tres cosas que este informe no había mirado, todas registradas en la **sección G** de
`FINDINGS_AND_DEFERRED.md`:

1. ✅ **[P1] RESUELTO (2026-09-01) — pantallas propias de error y 404** (**F-26**). Cuatro pantallas sobre una
   primitiva común (`components/ui/message-screen.tsx`): 404 de ficha (con atajo a **Archivados**, porque archivar
   es la causa más probable), 404 de URL, error de ruta (con `reset()` y el `digest` para cruzarlo con los logs) y
   `global-error`. Todo en español y con los tokens del sistema. Verificado contra el build standalone: cero rastro
   del «This page could not be found». **Salvedad honesta:** el 404 de ficha se pinta **sin barra lateral** — Next
   no aplica el layout del grupo `(app)` a un `not-found.tsx`, y montar el shell a mano no funciona porque en ese
   boundary no hay sesión; por eso la pantalla lleva sus propias salidas.
2. **[P2] `confirm()` nativo del navegador en las acciones destructivas** (el lado del **texto** ya está: F-30
   cerrado el 2026-09-26, los mensajes salen del diccionario; queda el **control**): archivar en lote (`data-table.tsx:106`), borrar fase (`projects/forms.tsx:179`), desconectar integración
   (`integrations/controls.tsx:119`), eliminar canal (`inbox-channels.tsx:97`) y descartar envío
   (`failed-pushes.tsx:46`). Tipografía del sistema, botones en el idioma del navegador, imposible de estilar. El
   patrón accesible para sustituirlo **ya existe** en `record-panel` (dialog + focus-trap + Esc).
3. ✅ **[P2] RESUELTO (2026-09-02) — las listas ya se ordenan y se filtran** (**F-28**). Ordenación por columna
   (asc → desc → sin orden) con `aria-sort`, y filtro rápido por texto; ambos en `RecordTable`, así que los
   heredaron las 19 vistas de una vez — que era el motivo de hacer F-29 antes. Fechas y números se ordenan por su
   valor, no por su texto. Además, tope de 500 filas **con aviso visible** cuando se alcanza. (De paso,
   `FilterTabs` añadió el `aria-current="page"` que las pestañas no tenían.)

**Dos correcciones a esta misma auditoría, comprobadas contra el código:**
- La decisión de **solo escritorio** sigue en pie y se reconfirma: el responsive **no es deuda pendiente**.
- El punto 7 de la tabla Nielsen dice *«sin atajos de teclado más allá de la búsqueda»* — y esa parte es correcta:
  **⌘K existe** (`global-search.tsx:33`, ⌘/Ctrl+K con `preventDefault` y Escape). No hay nada que arreglar ahí.
