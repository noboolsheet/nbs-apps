#!/usr/bin/env node
// Reset de contraseña / listado de usuarios de cv-creator (utilidad de administracion).
//
// La contraseña se guarda como hash scrypt de un solo sentido (ver server/auth.ts), asi
// que NO se puede recuperar: solo reescribirla. Este script replica exactamente el mismo
// hashing (scrypt, 64 bytes, salt de 16 bytes en hex) para que el login siga funcionando,
// y actualiza `users.password_hash`/`password_salt` conservando CVs y analisis.
//
// La imagen de runtime solo copia `dist/` + `node_modules` (no el codigo fuente), por eso
// este script es AUTOCONTENIDO (no importa ./server/*) y esta pensado para ejecutarse
// DENTRO del contenedor, que ya trae `better-sqlite3` y la BD montada en /app/data.
//
// OJO: copia el script a /app (WORKDIR, junto a node_modules), NO a /tmp. Node resuelve
// los import de `node_modules` subiendo desde el directorio del propio script; desde /tmp
// nunca alcanza /app/node_modules y revienta con ERR_MODULE_NOT_FOUND (better-sqlite3).
//
// --- Uso (en la Pi) ---
//   Listar usuarios registrados:
//     docker cp apps/cv-creator/reset-password.mjs cv-creator.app.prod:/app/rp.mjs
//     docker exec cv-creator.app.prod node /app/rp.mjs --list
//
//   Resetear la contraseña de un email:
//     docker exec cv-creator.app.prod node /app/rp.mjs <email> <nueva_password>
//
// En el host directamente (si tienes node + better-sqlite3): apunta la BD con DATA_DIR:
//     DATA_DIR=/opt/noboolsheet/cv-creator node apps/cv-creator/reset-password.mjs --list

import { scryptSync, randomBytes } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = process.env.DATA_DIR || "/app/data";
const DB_PATH = path.join(DATA_DIR, "cv-creator.db");

// Mismas reglas que /api/auth/register en server.ts.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD = 8;

// Mismo esquema que hashPassword() en server/auth.ts.
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function openDb() {
  let db;
  try {
    db = new Database(DB_PATH, { fileMustExist: true });
  } catch {
    console.error(`❌ No se encontro la BD en ${DB_PATH}.`);
    console.error("   Ejecuta dentro del contenedor cv-creator, o define DATA_DIR al dir del .db.");
    process.exit(1);
  }
  // La BD usa WAL (journal_mode = WAL): si abres una copia del .db sin su sidecar
  // -wal, la tabla `users` puede no aparecer. Dentro del contenedor se abre la BD
  // viva y no ocurre; aqui avisamos limpio en vez de reventar con un stack trace.
  const hasUsers = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  if (!hasUsers) {
    console.error(`❌ La BD ${DB_PATH} no tiene tabla 'users'.`);
    console.error("   ¿Es la BD correcta? Si copiaste el .db, incluye tambien el archivo -wal,");
    console.error("   o mejor ejecuta este script dentro del contenedor sobre la BD viva.");
    db.close();
    process.exit(1);
  }
  return db;
}

function listUsers() {
  const db = openDb();
  // `name` se añade por migracion (db.ts) y puede faltar en BD antiguas: seleccionalo
  // solo si existe, para no romper con "no such column".
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  const select = ["email", cols.includes("name") ? "name" : null, "created_at"]
    .filter(Boolean)
    .join(", ");
  const rows = db.prepare(`SELECT ${select} FROM users ORDER BY created_at`).all();
  db.close();
  if (rows.length === 0) {
    console.log("No hay usuarios registrados.");
    return;
  }
  console.log(`Usuarios registrados (BD: ${DB_PATH}):`);
  console.table(rows);
}

function resetPassword(rawEmail, newPassword) {
  const email = String(rawEmail).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    console.error("❌ Email no valido.");
    process.exit(1);
  }
  if (String(newPassword).length < MIN_PASSWORD) {
    console.error(`❌ La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    process.exit(1);
  }

  const db = openDb();
  const { hash, salt } = hashPassword(newPassword);
  const result = db
    .prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE email = ?")
    .run(hash, salt, email);
  db.close();

  if (result.changes === 1) {
    console.log(`✅ Contraseña actualizada para ${email}. Ya puedes iniciar sesion con la nueva.`);
  } else {
    console.error(`❌ No existe ningun usuario con el email ${email}. Usa --list para verlos.`);
    process.exit(1);
  }
}

// --- CLI ---
const args = process.argv.slice(2);

if (args[0] === "--list" || args[0] === "-l") {
  listUsers();
} else if (args.length === 2) {
  resetPassword(args[0], args[1]);
} else {
  console.error("Uso:");
  console.error("  node reset-password.mjs --list                     # lista usuarios");
  console.error("  node reset-password.mjs <email> <nueva_password>   # resetea la contraseña");
  process.exit(1);
}
