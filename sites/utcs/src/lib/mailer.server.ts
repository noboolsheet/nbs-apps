// Emisor de email del formulario de contacto de utcs.it.
//
// El sufijo .server.ts impide que Vite incluya este modulo (y nodemailer) en el
// bundle del cliente: solo corre en el servidor SSR (Nitro node-server).
//
// No montamos un servidor de correo: nos conectamos al SMTP de Gmail con una
// "app password" (no la contrasena normal de la cuenta). Puerto 587 = STARTTLS
// (SMTP_SECURE=false). El destino es CONTACT_TO y `replyTo` es el email del
// visitante. Gmail solo permite enviar DESDE la cuenta autenticada, asi que el
// remitente es siempre SMTP_USER.
//
// Variables de entorno (ver .env.example): SMTP_HOST, SMTP_PORT, SMTP_SECURE,
// SMTP_USER, SMTP_PASS, CONTACT_TO.
import process from "node:process";
import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

const SEND_TIMEOUT_MS = 10_000;

// En Cloudflare Workers el env bindea por request, pero aqui corremos en Node
// (node-server), asi que process.env esta disponible. Aun asi creamos el
// transporter de forma perezosa para leer el env en el primer envio.
let transporter: Transporter | null = null;

/**
 * ¿Hay SMTP configurado? En el modo DEMO estático no se define ninguna variable
 * SMTP, así que los formularios deben comportarse como "enviado" sin enviar nada.
 */
function smtpConfigured(): boolean {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

/**
 * Punto único de envío de bajo nivel para TODOS los formularios (contatto,
 * sportello, candidatura). Si no hay SMTP configurado (demo), se omite el envío
 * y se resuelve con éxito para no romper la UX de "mensaje inviato". La
 * validación de los formularios y el resto del flujo se mantienen intactos.
 */
async function deliver(mail: SendMailOptions): Promise<void> {
  if (!smtpConfigured()) {
    console.log("[demo] email sending disabled; skipping");
    return;
  }
  await getTransporter().sendMail(mail);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Faltan variables SMTP_HOST / SMTP_USER / SMTP_PASS");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE ?? "false") === "true", // false=587 (STARTTLS), true=465 (SSL)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fallar rapido si el puerto saliente esta bloqueado, en vez de colgarse.
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });

  return transporter;
}

/**
 * Resuelve el buzón destino. Si `CONTACT_TO` no está definido en el entorno, los
 * emails caen al remitente autenticado (`SMTP_USER`) en vez de al buzón previsto
 * (p. ej. demo@example.com): avisamos para que ese desvío no pase desapercibido.
 */
function resolveRecipient(): string | undefined {
  if (!process.env.CONTACT_TO) {
    console.warn(
      "[mailer] CONTACT_TO no definido: los email irán a SMTP_USER (fallback), no al buzón previsto.",
    );
  }
  return process.env.CONTACT_TO || process.env.SMTP_USER;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

/**
 * Envia el mensaje del formulario al buzon configurado (CONTACT_TO). El
 * remitente es la cuenta Gmail autenticada (SMTP_USER); `replyTo` es el email
 * del visitante para poder responderle directamente.
 */
export async function sendContactEmail({
  name,
  email,
  phone,
  message,
}: ContactPayload): Promise<void> {
  const to = resolveRecipient();
  const from = process.env.SMTP_USER;
  const phoneLine = phone && phone.trim() !== "" ? phone : "—";

  const text =
    `Nuovo messaggio dal modulo di contatto di utcs.it\n\n` +
    `Nome:      ${name}\n` +
    `Email:     ${email}\n` +
    `Telefono:  ${phoneLine}\n\n` +
    `Messaggio:\n${message}\n`;

  const html =
    `<h2>Nuovo messaggio dal modulo di contatto di utcs.it</h2>` +
    `<p><strong>Nome:</strong> ${escapeHtml(name)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Telefono:</strong> ${escapeHtml(phoneLine)}</p>` +
    `<p><strong>Messaggio:</strong></p>` +
    `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  await deliver({
    from: `"Modulo contatti utcs.it" <${from}>`,
    to,
    replyTo: `"${name}" <${email}>`,
    subject: `Nuovo contatto da utcs.it — ${name}`,
    text,
    html,
  });
}

export type SportelloPayload = {
  name: string;
  email: string;
  city: string;
  phone: string;
  message?: string;
};

/**
 * Envia una richiesta del formulario "Apri il tuo sportello APL!" al buzon
 * configurado (CONTACT_TO). El remitente es la cuenta Gmail autenticada
 * (SMTP_USER); `replyTo` es el email del visitante para responderle directamente.
 */
export async function sendSportelloEmail({
  name,
  email,
  city,
  phone,
  message,
}: SportelloPayload): Promise<void> {
  const to = resolveRecipient();
  const from = process.env.SMTP_USER;
  const messageLine = message && message.trim() !== "" ? message : "—";

  const text =
    `Nuova richiesta sportello APL da utcs.it\n\n` +
    `Nome:      ${name}\n` +
    `Email:     ${email}\n` +
    `Città:     ${city}\n` +
    `Telefono:  ${phone}\n\n` +
    `Messaggio:\n${messageLine}\n`;

  const html =
    `<h2>Nuova richiesta sportello APL da utcs.it</h2>` +
    `<p><strong>Nome:</strong> ${escapeHtml(name)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Città:</strong> ${escapeHtml(city)}<br>` +
    `<strong>Telefono:</strong> ${escapeHtml(phone)}</p>` +
    `<p><strong>Messaggio:</strong></p>` +
    `<p style="white-space:pre-wrap">${escapeHtml(messageLine)}</p>`;

  await deliver({
    from: `"Sportello APL utcs.it" <${from}>`,
    to,
    replyTo: `"${name}" <${email}>`,
    subject: `Nuova richiesta sportello APL — ${name}`,
    text,
    html,
  });
}

export type CandidaturaPayload = {
  name: string;
  email: string;
  message: string;
  cv: { filename: string; content: Buffer; contentType?: string };
};

/**
 * Envia una candidatura spontanea (banca dati lavoro) al buzon CONTACT_TO con el
 * CV adjunto. `replyTo` es el email del candidato para responderle directamente.
 */
export async function sendCandidaturaEmail({
  name,
  email,
  message,
  cv,
}: CandidaturaPayload): Promise<void> {
  const to = resolveRecipient();
  const from = process.env.SMTP_USER;
  const messageLine = message && message.trim() !== "" ? message : "—";

  const text =
    `Nuova candidatura spontanea da utcs.it\n\n` +
    `Nome:     ${name}\n` +
    `Email:    ${email}\n\n` +
    `Messaggio:\n${messageLine}\n\n` +
    `CV in allegato: ${cv.filename}\n`;

  const html =
    `<h2>Nuova candidatura spontanea da utcs.it</h2>` +
    `<p><strong>Nome:</strong> ${escapeHtml(name)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}</p>` +
    `<p><strong>Messaggio:</strong></p>` +
    `<p style="white-space:pre-wrap">${escapeHtml(messageLine)}</p>` +
    `<p><strong>CV in allegato:</strong> ${escapeHtml(cv.filename)}</p>`;

  await deliver({
    from: `"Candidature utcs.it" <${from}>`,
    to,
    replyTo: `"${name}" <${email}>`,
    subject: `Nuova candidatura spontanea — ${name}`,
    text,
    html,
    attachments: [{ filename: cv.filename, content: cv.content, contentType: cv.contentType }],
  });
}
