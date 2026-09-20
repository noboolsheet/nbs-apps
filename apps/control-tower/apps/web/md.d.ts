// Importar ficheros Markdown como string crudo (ver la regla `asset/source` en next.config.mjs).
declare module '*.md' {
  const content: string;
  export default content;
}
