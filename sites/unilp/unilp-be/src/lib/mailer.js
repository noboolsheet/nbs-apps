import nodemailer from 'nodemailer'

/*
  Emisor de email del formulario de contacto: cliente del SMTP de Gmail usando
  una "app password" (no la contrasena normal de la cuenta). No montamos un
  servidor de correo; solo nos conectamos al de Google.

  Se usa el puerto 587 (STARTTLS, SMTP_SECURE=false). El destino es CONTACT_TO y
  `replyTo` es el email del visitante. Gmail solo permite enviar DESDE la cuenta
  autenticada, asi que el remitente es siempre SMTP_USER.

  Variables de entorno (ver .env.example):
    SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, CONTACT_TO
*/

const SEND_TIMEOUT_MS = 10_000

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Faltan variables SMTP_HOST / SMTP_USER / SMTP_PASS')
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE ?? 'false') === 'true', // false=587 (STARTTLS), true=465 (SSL)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fallar rapido si el puerto saliente esta bloqueado, en vez de colgarse.
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  })

  return transporter
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Envia el mensaje del formulario al buzon configurado (CONTACT_TO).
 * El remitente es la cuenta Gmail autenticada (SMTP_USER); `replyTo` es el
 * email del visitante para poder responderle directamente.
 */
export async function sendContactEmail({ name, email, message }) {
  const to = process.env.CONTACT_TO || process.env.SMTP_USER
  const from = process.env.SMTP_USER

  const text =
    `Nuovo messaggio dal modulo di contatto di unilp.it\n\n` +
    `Nome:  ${name}\n` +
    `Email: ${email}\n\n` +
    `Messaggio:\n${message}\n`

  const html =
    `<h2>Nuovo messaggio dal modulo di contatto di unilp.it</h2>` +
    `<p><strong>Nome:</strong> ${escapeHtml(name)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}</p>` +
    `<p><strong>Messaggio:</strong></p>` +
    `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`

  await getTransporter().sendMail({
    from: `"Modulo contatti unilp.it" <${from}>`,
    to,
    replyTo: `"${name}" <${email}>`,
    subject: `Nuovo contatto da unilp.it — ${name}`,
    text,
    html,
  })
}

/** Verifica la conexion SMTP (conectividad + auth) al arrancar o en smtp-check. */
export async function verifyMailer() {
  await getTransporter().verify()
  return 'smtp'
}
