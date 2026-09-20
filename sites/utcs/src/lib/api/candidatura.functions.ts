import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sendCandidaturaEmail } from "../mailer.server";

// Server function de la candidatura spontanea (sezione "In cerca di lavoro").
// Recibe FormData porque incluye un archivo (CV). El cuerpo de .handler corre
// solo en el servidor (SSR Nitro node-server): nodemailer/mailer.server se
// tree-shakean del bundle del cliente. Se invoca desde /notizie:
//   const fd = new FormData(form); await sendCandidatura({ data: fd });

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

// Validación de los campos de texto, a la par de /contatti e /apl: límites de
// longitud y formato de email. Evita que datos sin formato (p. ej. CRLF) lleguen
// a `replyTo`/`subject` y acota el tamaño de cada campo.
const candidaturaFieldsSchema = z.object({
  name: z.string().trim().min(1, "Nome obbligatorio").max(200),
  email: z.string().trim().min(1, "Email obbligatoria").email("Email non valida").max(200),
  message: z.string().trim().max(5000).optional().default(""),
});

export const sendCandidatura = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("Dati non validi");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const website = String(data.get("website") ?? ""); // honeypot
    const cv = data.get("cv");

    // Honeypot relleno -> respondemos ok pero NO enviamos nada (no dar pistas al bot).
    // Avisamos (sin datos personales) por si el autocompletado del navegador rellena
    // el campo oculto y descarta una candidatura legítima de forma silenciosa.
    if (website.trim() !== "") {
      console.warn("[candidatura] honeypot activado: descartado sin enviar");
      return { ok: true as const };
    }

    // Valida nome/email/messaggio (longitud + formato email) antes de continuar.
    const { name, email, message } = candidaturaFieldsSchema.parse({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
    });

    if (!(cv instanceof File) || cv.size === 0) throw new Error("Curriculum obbligatorio");
    if (cv.size > MAX_BYTES) throw new Error("Il file supera i 5 MB");

    const validType = ALLOWED_TYPES.has(cv.type) || /\.(pdf|docx)$/i.test(cv.name);
    if (!validType) throw new Error("Formato non valido: ammessi solo PDF o DOCX");

    const content = Buffer.from(await cv.arrayBuffer());

    try {
      await sendCandidaturaEmail({
        name,
        email,
        message,
        cv: { filename: cv.name, content, contentType: cv.type || undefined },
      });
    } catch (err) {
      // El cliente solo recibe un error genérico; dejamos el real en el log del servidor.
      console.error("[candidatura] fallo al enviar email", err);
      throw err;
    }

    return { ok: true as const };
  });
