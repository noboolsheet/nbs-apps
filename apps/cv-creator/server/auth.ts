import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import * as db from "./db";

// Extiende Express.Request con el id de usuario que adjunta requireAuth.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const COOKIE_NAME = "cv_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

// ---- Hash de contraseñas (scrypt, integrado en Node — sin dependencias) ----
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  // Longitudes distintas romperían timingSafeEqual; comprobarlo antes.
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// ---- Sesiones ----
export function startSession(req: Request, res: Response, userId: string): void {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.createSession(userId, token, expiresAt);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure solo si la petición llegó por HTTPS. Con `trust proxy`, req.secure
    // refleja el X-Forwarded-Proto de Caddy (prod=https). En dev directo (http)
    // queda sin Secure para que la cookie funcione sobre http://localhost:<puerto>.
    secure: req.secure,
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function endSession(req: Request, res: Response): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) db.deleteSession(token);
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

// Middleware: exige una sesión válida y adjunta req.userId.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }
  const session = db.getSession(token);
  if (!session) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "Sesión expirada." });
    return;
  }
  req.userId = session.user_id;
  next();
}
