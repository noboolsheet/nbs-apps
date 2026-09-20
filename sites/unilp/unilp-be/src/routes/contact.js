import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { parseContact } from '../lib/validation.js'
import { sendContactEmail } from '../lib/mailer.js'

const router = Router()

// Anti-spam: max 5 envios cada 10 min por IP. Caddy pasa la IP real via
// X-Forwarded-For (ver `trust proxy` en server.js).
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'too_many_requests' },
})

router.post('/contact', contactLimiter, async (req, res) => {
  const result = parseContact(req.body)

  if (!result.success) {
    return res.status(400).json({ ok: false, error: 'validation_failed' })
  }

  const { name, email, message, website } = result.data

  // Honeypot: un humano nunca rellena este campo oculto. Si viene con contenido,
  // respondemos 200 (para no dar pistas al bot) pero NO enviamos nada.
  if (website && website.trim() !== '') {
    return res.status(200).json({ ok: true })
  }

  try {
    await sendContactEmail({ name, email, message })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[contact] fallo al enviar el email:', err.message)
    return res.status(502).json({ ok: false, error: 'send_failed' })
  }
})

export default router
