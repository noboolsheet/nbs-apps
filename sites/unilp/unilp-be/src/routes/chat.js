import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { parseChat } from '../lib/validation.js'

const router = Router()

// Webhook INTERNO de n8n (no expuesto a internet): el backend lo alcanza por
// shared_network como `http://n8n.app.prod:5678/webhook/<id>`. Se define en
// envs/.env.prod y se inyecta via el compose. Si no esta definida (dev/nonprod,
// donde n8n no existe), el chat responde 503 y el widget del frontend no se
// muestra.
const N8N_CHAT_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL

// El RAG + LLM tarda mas que un email; damos 30s antes de abortar.
const N8N_TIMEOUT_MS = 30_000

// Anti-abuso: max 20 mensajes/min por IP. Caddy ya aplica su propio rate-limit
// (api_zone 10/5s) por encima; este es el limite a nivel de aplicacion.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'too_many_requests' },
})

router.post('/chat', chatLimiter, async (req, res) => {
  if (!N8N_CHAT_WEBHOOK_URL) {
    // Chat no configurado en este entorno (p.ej. nonprod/dev sin n8n).
    return res.status(503).json({ ok: false, error: 'chat_disabled' })
  }

  const result = parseChat(req.body)
  if (!result.success) {
    return res.status(400).json({ ok: false, error: 'validation_failed' })
  }

  const { sessionId, message } = result.data

  try {
    const upstream = await fetch(N8N_CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
      signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    })

    if (!upstream.ok) {
      console.error(`[chat] n8n respondio ${upstream.status}`)
      return res.status(502).json({ ok: false, error: 'chat_failed' })
    }

    const data = await upstream.json().catch(() => null)
    // El nodo "Respond to Webhook" de n8n devuelve { response: "..." }.
    const response = data?.response
    if (typeof response !== 'string' || response.trim() === '') {
      console.error('[chat] respuesta de n8n sin campo `response` valido')
      return res.status(502).json({ ok: false, error: 'chat_failed' })
    }

    return res.status(200).json({ ok: true, response })
  } catch (err) {
    // Timeout (AbortError), n8n caido, DNS, etc.
    console.error('[chat] fallo al contactar n8n:', err.message)
    return res.status(502).json({ ok: false, error: 'chat_failed' })
  }
})

export default router
