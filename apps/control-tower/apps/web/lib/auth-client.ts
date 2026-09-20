'use client';

import { createAuthClient } from 'better-auth/react';

/** Cliente de Better Auth para componentes de cliente (login/signup/signout). */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, updateUser } = authClient;
