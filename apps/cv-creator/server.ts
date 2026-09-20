import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import * as mammoth from "mammoth";
import WordExtractor from "word-extractor";
import dotenv from "dotenv";
import * as db from "./server/db";
import { hashPassword, verifyPassword, startSession, endSession, requireAuth } from "./server/auth";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ALLOW_REGISTRATION = (process.env.ALLOW_REGISTRATION ?? "true") !== "false";

// Limpieza inicial de sesiones caducadas y de análisis con más de 24h (idempotente).
db.purgeExpiredSessions();
db.purgeExpiredAnalyses();

// Detras de Caddy (reverse proxy): confiar en un solo hop para que el rate-limit
// vea la IP real del cliente (X-Forwarded-For) y no la del proxy.
app.set("trust proxy", 1);

// Enable large JSON body parsing for base64 file uploads
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

// Rate limit del endpoint de IA: /api/parse-cv llama a Gemini (cuota de pago), asi
// que limitamos por IP para que nadie en la LAN/Tailscale dispare el gasto.
const parseCvLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 peticiones por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
});

// Rate limit de auth: frena la fuerza bruta de login/registro por IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos." },
});

// ---- Autenticación ----
const publicUser = (u: db.UserRow) => ({
  id: u.id,
  email: u.email,
  name: u.name ?? "",
  avatar: u.avatar ?? null,
});

app.post("/api/auth/register", authLimiter, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!ALLOW_REGISTRATION) {
    return res.status(403).json({ error: "El registro está desactivado." });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Email no válido." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
  }
  if (db.getUserByEmail(email)) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
  }
  const { hash, salt } = hashPassword(password);
  const user = db.createUser(email, hash, salt);
  startSession(req, res, user.id);
  return res.json({ user: publicUser(user) });
});

app.post("/api/auth/login", authLimiter, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = db.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  startSession(req, res, user.id);
  return res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  endSession(req, res);
  return res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = db.getUserById(req.userId!);
  if (!user) return res.status(401).json({ error: "No autenticado." });
  return res.json({ user: publicUser(user) });
});

// ---- CVs (todo bajo sesión; cada usuario solo ve los suyos) ----
app.get("/api/resumes", requireAuth, (req, res) => {
  const user = db.getUserById(req.userId!);
  return res.json({
    resumes: db.listResumes(req.userId!),
    activeId: user?.active_resume_id ?? null,
  });
});

app.put("/api/resumes/:id", requireAuth, (req, res) => {
  const resume = req.body;
  if (!resume || resume.id !== req.params.id) {
    return res.status(400).json({ error: "Datos de CV no válidos." });
  }
  db.upsertResume(req.userId!, resume);
  return res.json({ ok: true });
});

app.delete("/api/resumes/:id", requireAuth, (req, res) => {
  db.deleteResume(req.userId!, req.params.id);
  return res.json({ ok: true });
});

app.put("/api/state/active", requireAuth, (req, res) => {
  const activeId = req.body?.activeId ?? null;
  db.setActiveResume(req.userId!, activeId);
  return res.json({ ok: true });
});

// ---- Perfil ----
app.put("/api/profile", requireAuth, (req, res) => {
  const name = req.body?.name != null ? String(req.body.name).slice(0, 120) : null;
  const avatar = req.body?.avatar != null ? String(req.body.avatar) : null;
  // Tope defensivo del tamaño del avatar (data URL). ~300 KB en base64.
  if (avatar && avatar.length > 400_000) {
    return res.status(400).json({ error: "La imagen es demasiado grande." });
  }
  db.updateProfile(req.userId!, name, avatar);
  const user = db.getUserById(req.userId!);
  return res.json({ user: user ? publicUser(user) : null });
});

app.put("/api/profile/password", requireAuth, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }
  const user = db.getUserById(req.userId!);
  if (!user || !verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: "La contraseña actual no es correcta." });
  }
  const { hash, salt } = hashPassword(newPassword);
  db.updatePassword(req.userId!, hash, salt);
  return res.json({ ok: true });
});

// Initialize GoogleGenAI client lazily or when env is present
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint to parse PDF/Image/Text resumes
app.post("/api/parse-cv", requireAuth, parseCvLimiter, async (req, res) => {
  try {
    const { fileBase64, mimeType, textContent, fileName } = req.body;

    if (!fileBase64 && !textContent) {
      return res.status(400).json({ error: "No CV data provided to parse." });
    }

    const ai = getGeminiClient();

    // Gemini lee PDF/imagen directamente (inlineData), pero NO interpreta de forma
    // fiable los binarios de Word. Para .doc/.docx extraemos el texto aqui (mammoth
    // para .docx, word-extractor para .doc) y se lo pasamos como texto. Asi la app
    // puede adaptar CVs con plantillas ajenas a las nuestras.
    let extractedText: string | undefined = textContent;
    let inlineData: { data: string; mimeType: string } | undefined;

    if (fileBase64 && mimeType) {
      const base64Data = fileBase64.replace(/^data:.*?;base64,/, "");
      const lowerName = String(fileName || "").toLowerCase();
      const isDocx =
        mimeType.includes("wordprocessingml") || lowerName.endsWith(".docx");
      const isDoc = mimeType === "application/msword" || lowerName.endsWith(".doc");

      if (isDocx || isDoc) {
        const buffer = Buffer.from(base64Data, "base64");
        try {
          if (isDocx) {
            extractedText = (await mammoth.extractRawText({ buffer })).value;
          } else {
            const doc = await new WordExtractor().extract(buffer);
            extractedText = doc.getBody();
          }
        } catch (e) {
          console.error("Error extrayendo texto del documento Word:", e);
          return res.status(422).json({
            success: false,
            error: "No se pudo leer el documento Word. Prueba a exportarlo a PDF.",
          });
        }
        if (!extractedText || !extractedText.trim()) {
          return res.status(422).json({
            success: false,
            error: "El documento no contiene texto legible. Prueba con un PDF.",
          });
        }
      } else {
        inlineData = { data: base64Data, mimeType };
      }
    }

    let parts: any[] = [];

    if (inlineData) {
      parts.push({ inlineData });
    }

    parts.push({
      text: extractedText
        ? `Here is the text from a resume: "${extractedText}". Please extract all information.`
        : "Extract all resume/curriculum vitae details from the attached file.",
    });

    // We will instruct the model to fill in as much detail as possible in the specified schema format.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction:
          "You are an expert ATS (Applicant Tracking System) and resume analyzer. " +
          "Your job is to read resumes (PDF files, images, or raw text) and convert them " +
          "into a highly accurate structured JSON format matching the schema provided. " +
          "Fill in as much detail as possible. If some fields are missing, omit them or provide sensible defaults. " +
          "Ensure that date fields are parsed clean (e.g. 'Oct 2022' or 'Current'). " +
          "For languages, estimate proficiency level as an integer rating from 1 to 5.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personalDetails: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING, description: "Full Name of the candidate" },
                jobTitle: { type: Type.STRING, description: "Professional Title or Headline (e.g. 'Software Engineer')" },
                phone: { type: Type.STRING, description: "Phone number with country code if available" },
                email: { type: Type.STRING, description: "Email address" },
                dateOfBirth: { type: Type.STRING, description: "Date of Birth (e.g. '12/19/1998')" },
                placeOfBirth: { type: Type.STRING, description: "Place of birth (e.g. 'Cuba')" },
                currentResidence: { type: Type.STRING, description: "Current location/residence (e.g. 'Cosenza, Italy')" },
                summary: { type: Type.STRING, description: "A summary or profile paragraph of the candidate" },
                website: { type: Type.STRING, description: "Portfolio website URL if present" },
                linkedin: { type: Type.STRING, description: "LinkedIn Profile URL" }
              },
              required: ["fullName", "summary"]
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  jobTitle: { type: Type.STRING },
                  company: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING, description: "Format: Month Year, e.g. 'Apr 2026'" },
                  endDate: { type: Type.STRING, description: "Format: Month Year or 'Current'" },
                  description: { type: Type.STRING, description: "Detail of the roles, achievements and tasks performed" }
                },
                required: ["jobTitle", "company"]
              },
              description: "Work history/experience list"
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  degree: { type: Type.STRING, description: "Degree or certification obtained, e.g. 'Master in Computer Science'" },
                  school: { type: Type.STRING, description: "University or School name" },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["degree", "school"]
              },
              description: "Education history"
            },
            skills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Skill name or technology" },
                  level: { type: Type.INTEGER, description: "Optional skill rating from 1 to 5" }
                },
                required: ["name"]
              }
            },
            languages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Language name, e.g. 'Spanish'" },
                  level: { type: Type.INTEGER, description: "Proficiency score from 1 (basic) to 5 (native)" }
                },
                required: ["name", "level"]
              }
            }
          },
          required: ["personalDetails", "experience", "education", "skills", "languages"]
        },
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsedJson });
  } catch (error: any) {
    // Loguear el detalle completo server-side, pero NO filtrarlo al cliente
    // (podria exponer detalles internos o del error de Gemini).
    console.error("Error parsing CV with Gemini:", error);
    return res.status(500).json({
      success: false,
      error: "No se pudo procesar el CV. Inténtalo de nuevo.",
    });
  }
});

// ---- Análisis: comparar un CV con una oferta de trabajo ----

// Convierte un fichero (o texto) en "parts" para Gemini: PDF/imagen como inlineData,
// Word extraído a texto, texto plano tal cual. Devuelve { error } si el Word no se lee.
async function extractParts(input: {
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  textContent?: string;
}): Promise<{ parts: any[] } | { error: string }> {
  const { fileBase64, mimeType, fileName, textContent } = input;
  if (textContent && textContent.trim()) return { parts: [{ text: textContent }] };
  if (fileBase64 && mimeType) {
    const base64Data = fileBase64.replace(/^data:.*?;base64,/, "");
    const lowerName = String(fileName || "").toLowerCase();
    const isDocx = mimeType.includes("wordprocessingml") || lowerName.endsWith(".docx");
    const isDoc = mimeType === "application/msword" || lowerName.endsWith(".doc");
    if (isDocx || isDoc) {
      const buffer = Buffer.from(base64Data, "base64");
      let text: string;
      try {
        text = isDocx
          ? (await mammoth.extractRawText({ buffer })).value
          : (await new WordExtractor().extract(buffer)).getBody();
      } catch (e) {
        console.error("Error extrayendo texto Word:", e);
        return { error: "No se pudo leer el documento Word. Prueba a exportarlo a PDF." };
      }
      if (!text || !text.trim())
        return { error: "El documento no contiene texto legible. Prueba con un PDF." };
      return { parts: [{ text }] };
    }
    return { parts: [{ inlineData: { data: base64Data, mimeType } }] };
  }
  return { parts: [] };
}

// Serializa un CV guardado (ResumeData) a texto legible para pasárselo a la IA.
function resumeToText(resume: any): string {
  const p = resume.personalDetails || {};
  const lines: string[] = [];
  lines.push(`Nombre: ${p.fullName || ""}`);
  if (p.jobTitle) lines.push(`Puesto: ${p.jobTitle}`);
  if (p.summary) lines.push(`Resumen/Perfil: ${p.summary}`);
  const list = (arr: any[], fmt: (x: any) => string, title: string) => {
    if (arr?.length) {
      lines.push(`\n${title}:`);
      arr.forEach((x) => lines.push(`- ${fmt(x)}`));
    }
  };
  list(resume.experience, (e) => `${e.jobTitle || ""} en ${e.company || ""} (${e.startDate || ""}–${e.endDate || ""}). ${e.description || ""}`, "Experiencia");
  list(resume.education, (e) => `${e.degree || ""} — ${e.school || ""} (${e.startDate || ""}–${e.endDate || ""})`, "Educación");
  list(resume.skills, (s) => s.name, "Habilidades");
  list(resume.languages, (l) => `${l.name} (nivel ${l.level}/5)`, "Idiomas");
  return lines.join("\n");
}

app.post("/api/analyze", requireAuth, parseCvLimiter, async (req, res) => {
  try {
    const { cvResumeId, cvFile, jobFile, jobText, cvLabel } = req.body;

    // --- Parts del CV (uno existente o subido) ---
    let cvParts: any[];
    let cvLabelFinal: string = cvLabel || "CV";
    if (cvResumeId) {
      const resume = db.listResumes(req.userId!).find((r) => r.id === cvResumeId) as any;
      if (!resume) return res.status(400).json({ error: "CV no encontrado." });
      cvParts = [{ text: resumeToText(resume) }];
      cvLabelFinal = resume.name || cvLabelFinal;
    } else if (cvFile) {
      const ex = await extractParts(cvFile);
      if ("error" in ex) return res.status(422).json({ error: ex.error });
      cvParts = ex.parts;
    } else {
      return res.status(400).json({ error: "Falta el CV a analizar." });
    }

    // --- Parts de la oferta (archivo o texto) ---
    let jobParts: any[];
    if (jobText && String(jobText).trim()) {
      jobParts = [{ text: String(jobText) }];
    } else if (jobFile) {
      const ex = await extractParts(jobFile);
      if ("error" in ex) return res.status(422).json({ error: ex.error });
      jobParts = ex.parts;
    } else {
      return res.status(400).json({ error: "Falta la oferta de trabajo." });
    }

    const ai = getGeminiClient();
    const parts = [
      { text: "=== CURRÍCULUM DEL CANDIDATO ===" },
      ...cvParts,
      { text: "=== OFERTA DE TRABAJO Y REQUISITOS ===" },
      ...jobParts,
      { text: "Analiza la compatibilidad del currículum con la oferta siguiendo el esquema." },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction:
          "Eres un reclutador experto y un sistema ATS. Compara el currículum del candidato con la oferta " +
          "de trabajo y sus requisitos. Responde SIEMPRE en español, de forma concreta y accionable. " +
          "Da un porcentaje realista de compatibilidad, consejos específicos para reescribir los textos " +
          "(sobre todo el resumen/perfil inicial) y las habilidades para encajar mejor, y lista con claridad " +
          "las habilidades o requisitos de la oferta que faltan en el CV.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jobTitle: { type: Type.STRING, description: "Título del puesto de la oferta" },
            compatibility: { type: Type.INTEGER, description: "Porcentaje de compatibilidad, 0 a 100" },
            verdict: { type: Type.STRING, description: "Valoración global breve (1-2 frases)" },
            summaryAdvice: {
              type: Type.STRING,
              description: "Consejo concreto para reescribir el texto de resumen/perfil inicial del CV y adaptarlo a la oferta",
            },
            textAdvice: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Consejos para modificar textos y habilidades del CV",
            },
            missingSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Habilidades o requisitos de la oferta que faltan en el CV",
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Puntos fuertes del CV que encajan con la oferta",
            },
          },
          required: ["compatibility", "verdict", "summaryAdvice", "missingSkills"],
        },
      },
    });

    const report = JSON.parse(response.text || "{}");
    const createdAt = Date.now();
    const id = randomUUID();
    const jobTitle = report.jobTitle || "Oferta de trabajo";

    db.purgeExpiredAnalyses();
    db.createAnalysis(req.userId!, { id, cvLabel: cvLabelFinal, jobTitle, report, createdAt });

    return res.json({ id, cvLabel: cvLabelFinal, jobTitle, report, createdAt });
  } catch (error) {
    console.error("Error analizando CV vs oferta:", error);
    return res.status(500).json({ error: "No se pudo completar el análisis. Inténtalo de nuevo." });
  }
});

app.get("/api/analyses", requireAuth, (req, res) => {
  db.purgeExpiredAnalyses();
  return res.json({ analyses: db.listAnalyses(req.userId!) });
});

app.delete("/api/analyses/:id", requireAuth, (req, res) => {
  db.deleteAnalysis(req.userId!, req.params.id);
  return res.json({ ok: true });
});

// ---- Traducir el CONTENIDO de un CV a otro idioma (para crear una copia) ----
const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  en: "English",
  it: "Italian",
  de: "German",
  fr: "French",
  pt: "Portuguese",
};

app.post("/api/translate-cv", requireAuth, parseCvLimiter, async (req, res) => {
  try {
    const { resume, targetLanguage } = req.body || {};
    const targetName = LANGUAGE_NAMES[targetLanguage];
    if (!resume || !targetName) {
      return res.status(400).json({ success: false, error: "Datos de traducción no válidos." });
    }

    const ai = getGeminiClient();
    const parts = [
      { text: "=== CURRÍCULUM (contenido a traducir) ===" },
      { text: resumeToText(resume) },
      { text: `Devuelve SOLO los campos de texto traducidos al idioma: ${targetName}, según el esquema.` },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction:
          `Traduce el contenido del currículum al idioma: ${targetName}. ` +
          "Traduce SOLO: el puesto (jobTitle), el resumen/perfil (summary), los puestos y descripciones " +
          "de experiencia, el título de estudios (degree) y las descripciones de educación, los términos " +
          "genéricos de habilidades y los nombres de idiomas. " +
          "NO traduzcas ni alteres: nombres de personas, empresas, escuelas/universidades, emails, teléfonos, " +
          "URLs, fechas, ni tecnologías o nombres propios (p. ej. React, Excel, Photoshop, AWS). " +
          "Si un elemento aparece como 'Current' o similar, tradúcelo al equivalente del idioma destino. " +
          "MANTÉN exactamente el mismo número y orden de elementos en cada lista (experiencia, educación, " +
          "habilidades, idiomas) que el currículum original.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personalDetails: {
              type: Type.OBJECT,
              properties: {
                jobTitle: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  jobTitle: { type: Type.STRING },
                  location: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  degree: { type: Type.STRING },
                  location: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } },
            },
            languages: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } },
            },
          },
          required: ["personalDetails", "experience", "education", "skills", "languages"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error traduciendo CV:", error);
    return res.status(500).json({ success: false, error: "No se pudo traducir el CV. Inténtalo de nuevo." });
  }
});

// Serve frontend with Vite middleware in dev or static files in production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
