/*
  Inyecta un bloque JSON-LD (Schema.org) en el HTML. Es un server component:
  el <script> se renderiza en el HTML estático exportado, de modo que los
  crawlers (Google, motores de IA) lo leen sin ejecutar JavaScript.

  Acepta un objeto o un array de objetos (varios nodos en la misma página).
*/

type JsonLdData = Record<string, unknown> | Record<string, unknown>[]

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
