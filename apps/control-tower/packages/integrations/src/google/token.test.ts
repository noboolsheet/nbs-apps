import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { makeGoogleTokenProvider } from './token';

describe('google token provider (service account)', () => {
  it('firma un JWT RS256 verificable, lo canjea y cachea', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const priv = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString();

    let calls = 0;
    let assertion = '';
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      calls++;
      const body = new URLSearchParams(init?.body as string);
      assertion = body.get('assertion') ?? '';
      return { ok: true, json: async () => ({ access_token: 'tok-123', expires_in: 3600 }) } as Response;
    }) as unknown as typeof fetch;

    const getToken = makeGoogleTokenProvider(
      { client_email: 'sa@x.iam.gserviceaccount.com', private_key: priv },
      'https://www.googleapis.com/auth/drive.readonly',
      fakeFetch,
    );

    expect(await getToken()).toBe('tok-123');
    expect(calls).toBe(1);
    // Cacheado: la segunda llamada no vuelve a pedir token.
    expect(await getToken()).toBe('tok-123');
    expect(calls).toBe(1);

    // El JWT tiene 3 partes y su firma verifica con la clave pública de la SA.
    const [h = '', c = '', s = ''] = assertion.split('.');
    const verify = createVerify('RSA-SHA256');
    verify.update(`${h}.${c}`);
    verify.end();
    expect(verify.verify(pub, Buffer.from(s, 'base64url'))).toBe(true);
  });
});
