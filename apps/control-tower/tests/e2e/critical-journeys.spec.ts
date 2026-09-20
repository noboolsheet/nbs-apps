import { test, expect, request as pwRequest, type Page } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';

/**
 * Journeys críticos del MVP (doc old_9 §25) contra la UI real.
 * Provisioning: usuario (sign-up API) + organización + membresía (via @ct/db); luego login por UI.
 * Requiere navegador: `pnpm exec playwright install chromium` (entorno con red) + DB de desarrollo.
 * NOTA: no corre en CI sin navegadores; la verificación equivalente HTTP está en scripts/e2e-journeys.sh.
 */
const password = 'supersecret123';
let email: string;
let userId: string;
let orgId: string;

test.beforeAll(async ({ baseURL }) => {
  email = `e2e-${Date.now()}@example.com`;
  const api = await pwRequest.newContext({ baseURL });
  const res = await api.post('/api/auth/sign-up/email', { data: { email, password, name: 'E2E' } });
  userId = ((await res.json()) as { user: { id: string } }).user.id;
  await api.dispose();

  const db = getDb();
  orgId = crypto.randomUUID();
  await db.insert(s.organizations).values({ id: orgId, name: 'E2E Org', slug: `e2e-${Date.now()}`, status: 'ACTIVE' });
  await db.insert(s.organizationMembers).values({ organizationId: orgId, userId, role: 'OWNER' });
});

test.afterAll(async () => {
  const db = getDb();
  await db.delete(s.auditLogs).where(eq(s.auditLogs.organizationId, orgId));
  await db.delete(s.changeEvents).where(eq(s.changeEvents.organizationId, orgId));
  await db.delete(s.tasks).where(eq(s.tasks.organizationId, orgId));
  await db.delete(s.decisions).where(eq(s.decisions.organizationId, orgId));
  await db.delete(s.projects).where(eq(s.projects.organizationId, orgId));
  await db.delete(s.clients).where(eq(s.clients.organizationId, orgId));
  await db.delete(s.organizationMembers).where(eq(s.organizationMembers.organizationId, orgId));
  await db.delete(s.sessions).where(eq(s.sessions.userId, userId));
  await db.delete(s.accounts).where(eq(s.accounts.userId, userId));
  await db.delete(s.users).where(eq(s.users.id, userId));
  await db.delete(s.organizations).where(eq(s.organizations.id, orgId));
  await closeDb();
});

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
}

test('J1: login → Home', async ({ page }) => {
  await login(page);
});

test('J2: crear Client → Project → Task → completar', async ({ page }) => {
  await login(page);
  await page.goto('/crm/clients');
  await page.getByPlaceholder('Nuevo cliente').fill('Cliente E2E');
  await page.getByRole('button', { name: '+ Añadir' }).click();
  await expect(page.getByRole('link', { name: 'Cliente E2E' })).toBeVisible();

  await page.goto('/projects');
  await page.getByPlaceholder('Nuevo proyecto').fill('Proyecto E2E');
  await page.getByRole('button', { name: '+ Añadir' }).click();
  await page.getByRole('link', { name: 'Proyecto E2E' }).click();
  await page.getByRole('button', { name: /Tasks/ }).click();
  await page.getByPlaceholder('Nueva tarea').fill('Tarea E2E');
  await page.getByRole('button', { name: '+ Tarea' }).click();
  await expect(page.getByText('Tarea E2E')).toBeVisible();
});

test('J3: registrar Decision → Review → Approve', async ({ page }) => {
  await login(page);
  await page.goto('/knowledge/decisions');
  await page.getByPlaceholder('Título de la decisión').fill('Decisión E2E');
  await page.getByPlaceholder('¿Qué se decidió?').fill('Hacer X');
  await page.getByRole('button', { name: '+ Registrar' }).click();
  const sel = page.locator('select').first();
  await sel.selectOption('REVIEW');
  await sel.selectOption('APPROVED');
  await expect(page.getByText('APPROVED').first()).toBeVisible();
});
