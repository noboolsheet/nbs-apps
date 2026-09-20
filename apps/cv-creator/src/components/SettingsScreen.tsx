import React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { ThemePref } from '../theme';

interface SettingsScreenProps {
  themePref: ThemePref;
  onChangeThemePref: (pref: ThemePref) => void;
}

const THEME_OPTIONS: { value: ThemePref; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'system', label: 'Sistema', hint: 'Sigue el tema de tu dispositivo', icon: <Monitor className="w-5 h-5" /> },
  { value: 'light', label: 'Claro', hint: 'Fondo claro siempre', icon: <Sun className="w-5 h-5" /> },
  { value: 'dark', label: 'Oscuro', hint: 'Fondo oscuro siempre', icon: <Moon className="w-5 h-5" /> },
];

// Vista "Configuración": opciones del sistema. Por ahora, el tema de la interfaz.
export const SettingsScreen: React.FC<SettingsScreenProps> = ({ themePref, onChangeThemePref }) => {
  return (
    <main className="p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Configuración</h2>

        {/* Tema */}
        <section className="bg-surface border border-line rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink">Apariencia</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Elige el tema de la interfaz. La vista previa del CV se mantiene siempre clara.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Tema de la interfaz"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            {THEME_OPTIONS.map((opt) => {
              const active = themePref === opt.value;
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChangeThemePref(opt.value)}
                  className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                      : 'border-line text-ink-muted hover:border-brand-300 hover:bg-surface-2'
                  }`}
                >
                  {active && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <span className={active ? 'text-brand-600 dark:text-brand-300' : 'text-ink-muted'}>{opt.icon}</span>
                  <span className="text-sm font-bold text-ink">{opt.label}</span>
                  <span className="text-[11px] text-ink-muted leading-snug">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};
