import React, { useRef, useState } from 'react';
import * as api from '../api';
import { AuthUser } from '../api';
import { resizeImageToDataUrl } from '../fileUtils';
import { User, Camera, Loader2, Check, AlertCircle, Trash2 } from 'lucide-react';

interface ProfileScreenProps {
  user: AuthUser;
  onUpdated: (user: AuthUser) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

// Vista "Mi perfil": editar nombre, foto (avatar) y cambiar la contraseña.
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onUpdated, showToast }) => {
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState<string | null>(user.avatar);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const pickAvatar = async (file: File) => {
    try {
      setAvatar(await resizeImageToDataUrl(file, 128));
    } catch {
      showToast('No se pudo procesar la imagen.', 'error');
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile(name.trim(), avatar);
      onUpdated(updated);
      showToast('Perfil actualizado');
    } catch (err: any) {
      showToast(err.message || 'No se pudo guardar el perfil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setChangingPw(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      showToast('Contraseña actualizada');
    } catch (err: any) {
      setPwError(err.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setChangingPw(false);
    }
  };

  const initial = (name || user.email).charAt(0).toUpperCase();

  return (
    <main className="p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Mi perfil</h2>

        {/* Datos + avatar */}
        <div className="bg-surface border border-line rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="" className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 flex items-center justify-center text-2xl font-bold">
                  {initial}
                </div>
              )}
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow cursor-pointer"
                aria-label="Cambiar foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink truncate">{user.email}</p>
              {avatar && (
                <button
                  onClick={() => setAvatar(null)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-rose-600 dark:hover:text-rose-300 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Quitar foto
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Nombre
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-brand-500"
                placeholder="Tu nombre"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Email
            </label>
            <input
              id="profile-email"
              value={user.email}
              disabled
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm bg-surface-2 text-ink-muted"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-md shadow-brand-100"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>

        {/* Cambiar contraseña */}
        <form
          onSubmit={changePassword}
          className="bg-surface border border-line rounded-2xl shadow-sm p-6 space-y-4"
        >
          <h3 className="text-sm font-bold text-ink">Cambiar contraseña</h3>
          <div>
            <label htmlFor="profile-current-pw" className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Contraseña actual
            </label>
            <input
              id="profile-current-pw"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="profile-new-pw" className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Nueva contraseña
            </label>
            <input
              id="profile-new-pw"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-brand-500"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          {pwError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={changingPw}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            {changingPw && <Loader2 className="w-4 h-4 animate-spin" />}
            Actualizar contraseña
          </button>
        </form>
      </div>
    </main>
  );
};
