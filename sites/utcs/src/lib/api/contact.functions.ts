import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sendContactEmail } from "../mailer.server";

// Server function del formulario de contacto. El cuerpo de .handler corre
// solo en el servidor (SSR Nitro node-server): nodemailer y mailer.server se
// tree-shakean del bundle del cliente. Se invoca desde la pagina /contatti:
//   await sendContact({ data: { name, email, phone, message, website } })

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nome obbligatorio").max(200),
  email: z.string().trim().email("Email non valida").max(200),
  phone: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().min(1, "Messaggio obbligatorio").max(5000),
  // Honeypot: un humano nunca rellena este campo oculto.
  website: z.string().max(0).optional().default(""),
});

export const sendContact = createServerFn({ method: "POST" })
  .inputValidator(contactSchema)
  .handler(async ({ data }) => {
    // Honeypot relleno -> respondemos ok pero NO enviamos nada (no dar pistas al bot).
    if (data.website && data.website.trim() !== "") {
      return { ok: true as const };
    }

    await sendContactEmail({
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    });

    return { ok: true as const };
  });
