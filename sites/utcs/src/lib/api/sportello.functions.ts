import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sendSportelloEmail } from "../mailer.server";

// Server function del formulario "Apri il tuo sportello APL!" (pagina /apl). El
// cuerpo de .handler corre solo en el servidor (SSR Nitro node-server):
// nodemailer y mailer.server se tree-shakean del bundle del cliente. Se invoca
// desde la pagina /apl:
//   await sendSportello({ data: { name, email, city, phone, message, website } })
//
// A diferencia de /contatti aqui el telefono es obbligatorio y el messaggio
// facoltativo, y existe el campo citta.

const sportelloSchema = z.object({
  name: z.string().trim().min(1, "Nome obbligatorio").max(200),
  email: z.string().trim().email("Email non valida").max(200),
  city: z.string().trim().min(1, "Città obbligatoria").max(100),
  phone: z.string().trim().min(1, "Telefono obbligatorio").max(60),
  message: z.string().trim().max(5000).optional().default(""),
  // Honeypot: un humano nunca rellena este campo oculto.
  website: z.string().max(0).optional().default(""),
});

export const sendSportello = createServerFn({ method: "POST" })
  .inputValidator(sportelloSchema)
  .handler(async ({ data }) => {
    // Honeypot relleno -> respondemos ok pero NO enviamos nada (no dar pistas al bot).
    if (data.website && data.website.trim() !== "") {
      return { ok: true as const };
    }

    await sendSportelloEmail({
      name: data.name,
      email: data.email,
      city: data.city,
      phone: data.phone,
      message: data.message,
    });

    return { ok: true as const };
  });
