import { createSign } from 'node:crypto';
import { withTimeout } from '../http';

/**
 * Proveedor de access tokens de Google vía **cuenta de servicio** (flujo JWT-bearer). Firma un JWT RS256
 * con la clave privada de la SA y lo canjea en el token endpoint por un access token, que se **cachea** hasta
 * poco antes de expirar (resuelve el problema del token estático que caduca ~1h). Solo lectura de Drive.
 * La clave NUNCA se guarda en la DB: vive en el entorno del worker.
 */
export interface GoogleServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function b64url(s: string | Buffer): string {
  return Buffer.from(s).toString('base64url');
}

export function makeGoogleTokenProvider(
  key: GoogleServiceAccountKey,
  scope: string,
  fetchImpl: typeof fetch = fetch,
): () => Promise<string> {
  const tokenUri = key.token_uri ?? 'https://oauth2.googleapis.com/token';
  const f = withTimeout(fetchImpl);
  let cached: { token: string; expEpoch: number } | null = null;

  return async function getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.expEpoch - 60 > now) return cached.token;

    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(
      JSON.stringify({ iss: key.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 }),
    );
    const signingInput = `${header}.${claim}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(key.private_key).toString('base64url');
    const assertion = `${signingInput}.${signature}`;

    const res = await f(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) {
      // Incluye el cuerpo de Google (p. ej. {"error":"invalid_grant","error_description":"..."}) para
      // diagnosticar: clave revocada/borrada, JWT inválido, desfase de reloj, scope, etc. — no solo "HTTP 400".
      const body = await res.text().catch(() => '');
      throw new Error(`Google token → HTTP ${res.status}${body ? `: ${body.slice(0, 500)}` : ''}`);
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new Error('Google token: respuesta sin access_token');
    cached = { token: json.access_token, expEpoch: now + (json.expires_in ?? 3600) };
    return cached.token;
  };
}
