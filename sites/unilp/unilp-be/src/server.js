import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import contactRoutes from './routes/contact.js'
import chatRoutes from './routes/chat.js'
import { verifyMailer } from './lib/mailer.js'

const app = express()

// Detras de Caddy: confiar en el primer proxy para leer la IP real (rate-limit).
app.set('trust proxy', 1)

app.use(helmet())

// CORS restringido a los origenes permitidos. En produccion el frontend llama
// same-origin (unilp.it/api/...) por lo que CORS casi no aplica, pero protege
// frente a llamadas desde otros origenes y cubre el caso de `next dev`.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin (curl, same-origin server-to-server) -> permitir.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Origin no permitido'))
    },
    methods: ['POST'],
  }),
)

// Limite de body pequeno: el formulario es texto, no necesita mas.
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/', contactRoutes)
app.use('/', chatRoutes)

// 404 por defecto
app.use((_req, res) => res.status(404).json({ ok: false, error: 'not_found' }))

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
  console.log(`[unilp-be] escuchando en :${port}`)
  // Verificacion no bloqueante del emisor de email.
  verifyMailer()
    .then((provider) => console.log(`[unilp-be] emisor de email listo (${provider})`))
    .catch((err) => console.warn('[unilp-be] aviso email:', err.message))
})
