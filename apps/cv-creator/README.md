# CV Express

Creador de currículums con IA. Sube un CV que ya tengas (PDF, DOC, DOCX o imagen) y
la IA extrae tus datos y los adapta a plantillas profesionales, o créalo desde cero.
Cada usuario tiene su cuenta y sus CVs se guardan en el servidor.

Aplicación full-stack: **React 19 + Vite 6 + TypeScript + Tailwind CSS v4** en el
frontend y un servidor **Express** con **SQLite** (`better-sqlite3`) e integración con
**Google Gemini** en el backend. Todo se sirve desde un único proceso Node.

## Funcionalidades

- **Cuentas y sesiones** — registro/acceso con email y contraseña (scrypt); sesiones por
  token aleatorio guardado en la BD (sin cookies firmadas ni `SESSION_SECRET`).
- **Almacenamiento en servidor** — los CVs y el perfil viven en SQLite; auto-guardado con
  _debounce_ mientras editas. Migración suave desde `localStorage` de versiones anteriores.
- **Importar con IA** — `/api/parse-cv` extrae los datos de un CV subido (Word vía `mammoth`
  / `word-extractor`; PDF e imágenes vía Gemini) y los estructura en el formato de la app.
- **Comparar con una oferta** — `/api/analyze` puntúa el encaje de un CV frente a una oferta
  de trabajo y devuelve fortalezas, carencias y sugerencias (historial efímero).
- **Idioma fijo por CV + traducción** — el idioma se elige al crear el CV; "Traducir" crea
  una **copia** en otro idioma con IA (respeta nombres propios, empresas, fechas y contacto).
  Idiomas de plantilla: es, en, it, de, fr, pt.
- **5 plantillas**, personalización de apariencia (icono/color por CV), reordenación por
  arrastre y edición inline del título.
- **Exportar** — impresión / PDF vectorial (texto seleccionable) vía el diálogo del navegador.
- **Interfaz** — rail lateral estilo Gemini (colapsable), tema **claro / oscuro / sistema**
  con toggle rápido, y foco en accesibilidad (roles ARIA, navegación por teclado, `focus-visible`).

## Requisitos

- **Node.js** 20+ (probado con 22).
- Una **`GEMINI_API_KEY`** para las funciones de IA (consíguela en
  https://aistudio.google.com/apikey). El resto de la app funciona sin ella.

## Ejecutar en local

```sh
npm install
cp .env.example .env        # y rellena GEMINI_API_KEY
npm run dev                 # server Express con Vite (tsx server.ts)
```

Por defecto escucha en `http://localhost:3000` (configurable con `PORT`).

## Scripts

```sh
npm run dev     # desarrollo (tsx server.ts, con HMR de Vite)
npm run build   # build de producción: Vite → dist/ + esbuild empaqueta server.ts → dist/server.cjs
npm run start   # arranca el build (node dist/server.cjs)
npm run lint    # comprobación de tipos (tsc --noEmit)
```

## Variables de entorno

Se cargan desde `.env` (gitignored) con dotenv. Ver `.env.example`.

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `GEMINI_API_KEY` | Para IA | — | Clave de Google Gemini (parse-cv, analyze, translate-cv). |
| `PORT` | No | `3000` | Puerto interno del server. |
| `DATA_DIR` | No | `./data` | Carpeta de la BD SQLite (usuarios + CVs). |
| `ALLOW_REGISTRATION` | No | `true` | `false` cierra el registro de nuevos usuarios. |

## API

Todas las rutas están bajo `/api`. Las de CVs/perfil requieren sesión; las de IA además
tienen _rate-limit_.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` | Alta, acceso y cierre de sesión. |
| GET | `/api/auth/me` | Usuario de la sesión actual. |
| GET · PUT · DELETE | `/api/resumes` · `/api/resumes/:id` | Listar / guardar / borrar CVs. |
| PUT | `/api/state/active` | Fijar el CV activo del usuario. |
| PUT | `/api/profile` · `/api/profile/password` | Editar perfil / cambiar contraseña. |
| POST | `/api/parse-cv` | Importar un CV con IA. |
| POST | `/api/analyze` · GET/DELETE `/api/analyses[/:id]` | Comparar con oferta + historial. |
| POST | `/api/translate-cv` | Traducir un CV a otro idioma (devuelve los textos traducidos). |

## Estructura

```
server.ts                # Express: auth, CRUD de CVs, endpoints de IA (Gemini), sirve dist/
src/
  App.tsx                # raíz de la SPA (vistas: dashboard, editor, analyze, profile, settings)
  api.ts                 # cliente fetch tipado de la API
  theme.ts               # tema claro/oscuro/sistema (persistido en localStorage)
  languages.ts           # idiomas de plantilla + helpers
  types.ts, defaultData.ts, fileUtils.ts
  index.css              # tokens de diseño (Tailwind v4 @theme) + modo oscuro (.dark)
  components/            # Dashboard, ResumeFormEditor, ResumeTemplates, SideDrawer,
                         # AnalyzeScreen, SettingsScreen, modales, etc.
```

## Deploy (piserver_config)

Este sitio se integra en la infraestructura como los demás (modelo _alondra_: un único
contenedor Express que sirve el build y la API). Ver `deploy-cv-creator.sh`, `Dockerfile`
y `cv-creator.docker-compose.{dev,prod}.yml`. El `Dockerfile` usa un build multi-etapa
sobre `node:22-bookworm-slim` (necesario por el módulo nativo `better-sqlite3`); los puertos
y `DATA_DIR` los fija el compose. El `.env` con `GEMINI_API_KEY` es obligatorio y está
gitignored.
