import { z } from 'zod'

/*
  Esquema espejo del frontend (unilp-fe/app/contatti/contatti-client.tsx:32).
  El frontend ya valida en cliente; aqui re-validamos en servidor porque un cliente
  no es de fiar (se puede saltar el JS, llamar la API directo, etc.).

  `website` es el campo honeypot: invisible para humanos, los bots lo rellenan.
  Si llega con contenido, el handler descarta el envio en silencio.
*/
export const contactSchema = z.object({
  // `regex` rechaza saltos de linea: `name` se interpola en el subject y el
  // replyTo del email (mailer.js), asi que bloqueamos \r\n para evitar inyeccion
  // de cabeceras SMTP (CRLF injection).
  name: z.string().trim().regex(/^[^\r\n]+$/).min(2).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(2000),
  privacyConsent: z.literal(true),
  website: z.string().optional(), // honeypot
})

export function parseContact(body) {
  return contactSchema.safeParse(body)
}

/*
  Esquema del chatbot. El navegador manda `{ sessionId, message }`; el backend
  hace de proxy al webhook interno de n8n (ver routes/chat.js). Re-validamos en
  servidor por el mismo motivo que en `contact`: el cliente no es de fiar.

  `sessionId` lo genera el navegador (localStorage) para que n8n mantenga la
  memoria de la conversacion; lo acotamos para que no se use como vector de abuso.
*/
export const chatSchema = z.object({
  sessionId: z.string().trim().regex(/^[A-Za-z0-9_-]+$/).min(8).max(64),
  message: z.string().trim().min(1).max(1000),
})

export function parseChat(body) {
  return chatSchema.safeParse(body)
}
