import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Todas las rutas de Better Auth: /api/auth/sign-in, /sign-up, /sign-out, /get-session, ...
export const { GET, POST } = toNextJsHandler(auth);
