'use client';

/** Helpers de fetch para componentes de cliente. Devuelven { data } o { error }. */
export interface ApiError {
  code: string;
  kind: string;
  message: string;
  details?: unknown;
}

async function request<T>(url: string, method: string, body?: unknown): Promise<{ data?: T; error?: ApiError }> {
  // Nunca rechaza: un fallo de red (offline/DNS/servidor caído) se devuelve como { error }, no como excepción.
  // Así los llamadores (autoguardado por campo, botones de acción…) siempre resetean su estado y muestran el error,
  // en vez de quedarse "guardando…" para siempre sin aviso.
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { error: { code: 'NETWORK', kind: 'NETWORK', message: 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.' } };
  }
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: ApiError };
  if (!res.ok) {
    return { error: json.error ?? { code: 'ERROR', kind: 'INTERNAL', message: `HTTP ${res.status}` } };
  }
  return { data: json.data };
}

export const getJson = <T>(url: string) => request<T>(url, 'GET');
export const postJson = <T>(url: string, body: unknown) => request<T>(url, 'POST', body);
export const patchJson = <T>(url: string, body: unknown) => request<T>(url, 'PATCH', body);
export const deleteJson = <T>(url: string) => request<T>(url, 'DELETE');
