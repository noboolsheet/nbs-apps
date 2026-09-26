'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/lib/auth-client';
import { Avatar } from '@/components/ui/avatar';
import { btnGhost } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/**
 * Editor de foto de perfil en Ajustes: muestra el avatar (foto o iniciales) con una "camarita" para subir una imagen
 * desde el ordenador. La foto se redimensiona en cliente a un data URL pequeño y se guarda en el usuario vía Better
 * Auth (`updateUser({ image })`), que escribe la columna `users.image`. No hay almacenamiento de ficheros: para una
 * app self-hosted de una sola usuaria, un data URL redimensionado es suficiente y evita servir archivos.
 *
 * MEJORA DIFERIDA (pendiente): permitir hacer la foto con la cámara del dispositivo (getUserMedia). No implementado aún.
 */
const MAX_DIMENSION = 256; // px — lado máximo tras redimensionar
const JPEG_QUALITY = 0.85;

export function ProfilePhoto({ user }: { user: { name: string; image?: string | null } }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(user.image ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo fichero
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('settings.photoMustBeImage'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await resizeToDataUrl(file);
      const res = await updateUser({ image: dataUrl });
      if (res.error) throw new Error(res.error.message ?? 'Error');
      setImage(dataUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.photoSaveError'));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setError(null);
    setBusy(true);
    try {
      const res = await updateUser({ image: '' });
      if (res.error) throw new Error(res.error.message ?? 'Error');
      setImage(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.photoRemoveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={user.name} image={image} size="lg" />
        {/* Camarita para subir la foto desde el ordenador. */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={t('settings.changePhoto')}
          title={t('settings.changePhoto')}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-fg shadow-sm transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={btnGhost}>
            {busy ? 'Guardando…' : image ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {image && (
            <button type="button" onClick={onRemove} disabled={busy} className={`${btnGhost} text-danger`}>
              {t('common.unset')}
            </button>
          )}
        </div>
        <p className="text-xs text-fg-subtle">{t('settings.changePhotoHint')}</p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}

/** Lee un fichero de imagen, lo redimensiona (lado máx. MAX_DIMENSION, centrado/cuadrado) y devuelve un data URL JPEG. */
async function resizeToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height); // recorte cuadrado central
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const target = Math.min(MAX_DIMENSION, side);

  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const cx = canvas.getContext('2d');
  if (!cx) throw new Error(t('settings.photoProcessError'));
  cx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
