import { createServerFn } from "@tanstack/react-start";
import process from "node:process";
import { z } from "zod";

// Server function del chatbot. El cuerpo de .handler corre solo en el servidor
// (SSR Nitro node-server), asi que puede leer el webhook interno de n8n y
// contactarlo por shared_network; nada de esto llega al bundle del cliente.
// El widget la invoca desde components/site/ChatWidget.tsx:
//   const r = await sendChat({ data: { sessionId, message } })
//
// A diferencia de unilp (backend Express aparte con ruta /api/chat), utcs es
// una app SSR unica y aqui el "proxy" es esta server function. No hay
// rate-limit por-app: Caddy ya rate-limita las llamadas de server function
// (/_serverFn/*) en el bloque utcs del CaddyFile.

// Mismo contrato que unilp (unilp-be/src/lib/validation.js): sessionId opaco y
// mensaje acotado. El sessionId permite a n8n mantener la memoria por conversacion.
const chatSchema = z.object({
  sessionId: z.string().trim().regex(/^[A-Za-z0-9_-]+$/).min(8).max(64),
  message: z.string().trim().min(1).max(1000),
});

// El RAG + LLM tarda mas que un email; damos 30s antes de abortar.
const N8N_TIMEOUT_MS = 30_000;

// Contrato de respuesta hacia el widget. NO se lanza excepcion en los casos
// "sin servicio"/"fallo upstream": se devuelve un objeto para que el widget
// distinga chat_disabled (mostrar "no disponible") de chat_failed (error generico).
type ChatResult =
  | { ok: true; response: string }
  | { ok: false; error: "chat_disabled" | "chat_failed" };

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator(chatSchema)
  .handler(async ({ data }): Promise<ChatResult> => {
    // Webhook INTERNO de n8n (no expuesto a internet): se alcanza por
    // shared_network como http://n8n.app.prod:5678/webhook/<id>. Se define en
    // envs/.env.prod (UTCS_N8N_CHAT_WEBHOOK_URL) y se inyecta via el compose.
    // Si no esta definida (dev/nonprod, donde n8n no existe), el chat responde
    // chat_disabled y el widget muestra el mensaje de "no disponible".
    const webhook = process.env.N8N_CHAT_WEBHOOK_URL;
    if (!webhook) {
      return { ok: false, error: "chat_disabled" };
    }

    try {
      const upstream = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId, message: data.message }),
        signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
      });

      if (!upstream.ok) {
        console.error(`[chat] n8n respondio ${upstream.status}`);
        return { ok: false, error: "chat_failed" };
      }

      const body = (await upstream.json().catch(() => null)) as { response?: unknown } | null;
      // El nodo "Respond to Webhook" de n8n devuelve { response: "..." }.
      const response = body?.response;
      if (typeof response !== "string" || response.trim() === "") {
        console.error("[chat] respuesta de n8n sin campo `response` valido");
        return { ok: false, error: "chat_failed" };
      }

      return { ok: true, response };
    } catch (err) {
      // Timeout (AbortError), n8n caido, DNS, etc.
      console.error("[chat] fallo al contactar n8n:", err instanceof Error ? err.message : err);
      return { ok: false, error: "chat_failed" };
    }
  });
