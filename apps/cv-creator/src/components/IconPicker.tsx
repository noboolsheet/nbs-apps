import React, { useRef } from 'react';
import { ResumeAppearance } from '../types';
import {
  ICON_OPTIONS,
  COLOR_OPTIONS,
  DEFAULT_ICON,
  DEFAULT_COLOR,
  AppearanceBadge
} from './appearance';
import { X, Upload, Check } from 'lucide-react';
import { Modal } from './Modal';

interface IconPickerProps {
  appearance?: ResumeAppearance;
  onChange: (appearance: ResumeAppearance) => void;
  onClose: () => void;
}

// Redimensiona la imagen a un cuadrado pequeño (data URL) para no inflar
// localStorage. Recorta al centro (cover) a 96x96.
const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const IconPicker: React.FC<IconPickerProps> = ({ appearance, onChange, onClose }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const activeIcon = appearance?.type !== 'image' ? appearance?.icon || DEFAULT_ICON : undefined;
  const activeColor = appearance?.color || DEFAULT_COLOR;

  const handleImage = async (file: File) => {
    try {
      const dataUrl = await resizeImage(file);
      onChange({ type: 'image', image: dataUrl });
    } catch {
      // Silencioso: si falla la lectura, no cambia la apariencia.
    }
  };

  return (
    <Modal onClose={onClose} ariaLabel="Personalizar icono" className="max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <AppearanceBadge appearance={appearance} className="w-10 h-10 rounded-xl" />
            <h3 className="font-bold text-sm text-ink">Personalizar icono</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Colores */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isActive = appearance?.type !== 'image' && activeColor === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() =>
                      onChange({ type: 'icon', icon: activeIcon || DEFAULT_ICON, color: c.key })
                    }
                    className={`w-9 h-9 rounded-lg ${c.bg} ${c.fg} flex items-center justify-center border-2 transition cursor-pointer ${
                      isActive ? 'border-slate-800' : 'border-transparent hover:border-slate-300'
                    }`}
                    title={c.key}
                  >
                    {isActive && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Iconos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Icono</p>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map(({ key, Icon }) => {
                const isActive = appearance?.type !== 'image' && activeIcon === key;
                return (
                  <button
                    key={key}
                    onClick={() =>
                      onChange({ type: 'icon', icon: key, color: activeColor })
                    }
                    className={`aspect-square rounded-lg flex items-center justify-center border transition cursor-pointer ${
                      isActive
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300'
                        : 'border-line text-ink-muted hover:bg-surface-2 hover:text-ink'
                    }`}
                    title={key}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Imagen */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Imagen</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-line hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-900/40 text-ink-muted text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Subir una imagen
            </button>
            {appearance?.type === 'image' && (
              <button
                onClick={() => onChange({ type: 'icon', icon: DEFAULT_ICON, color: DEFAULT_COLOR })}
                className="mt-2 text-[11px] text-ink-muted hover:text-rose-600 dark:hover:text-rose-300 font-semibold cursor-pointer"
              >
                Quitar imagen y volver a un icono
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Listo
          </button>
        </div>
    </Modal>
  );
};
