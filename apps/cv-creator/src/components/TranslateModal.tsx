import React, { useState } from 'react';
import { TemplateLanguage } from '../types';
import { LANGUAGE_OPTIONS } from '../languages';
import { Modal } from './Modal';
import { X, Globe, Loader2, AlertCircle, Check, Languages, CheckCircle2 } from 'lucide-react';

interface TranslateModalProps {
  currentLanguage: TemplateLanguage;
  missing: string[]; // vacío = CV completo
  translating: boolean;
  error: string | null;
  onClose: () => void;
  onTranslate: (target: TemplateLanguage) => void;
}

// Modal para traducir el CV a otro idioma (crea una copia). Solo permite traducir
// cuando el CV está completo, para no gastar traducciones a medias.
export const TranslateModal: React.FC<TranslateModalProps> = ({
  currentLanguage,
  missing,
  translating,
  error,
  onClose,
  onTranslate,
}) => {
  const others = LANGUAGE_OPTIONS.filter((l) => l.code !== currentLanguage);
  const [target, setTarget] = useState<TemplateLanguage>(others[0]?.code || 'en');
  const complete = missing.length === 0;

  return (
    <Modal onClose={onClose} ariaLabel="Traducir CV" className="max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Languages className="w-4 h-4 text-brand-600 dark:text-brand-300" /> Traducir CV
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!complete ? (
            // Guía: termina el CV antes de traducir.
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-300 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  Termina tu CV antes de traducirlo. Así evitas gastar una traducción en una versión a
                  medias. Te falta por completar:
                </p>
              </div>
              <ul className="space-y-1.5">
                {missing.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-xs text-ink-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                  Tu CV está listo para traducir. Se creará una <strong>copia</strong> en el idioma
                  elegido; el original no se modifica.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-brand-500" />
                  Traducir a
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Idioma destino de la traducción">
                  {others.map((l) => {
                    const isActive = target === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => setTarget(l.code)}
                        disabled={translating}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          isActive
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm'
                            : 'border-line hover:border-slate-300 bg-surface text-ink-muted hover:bg-surface-2'
                        }`}
                      >
                        {isActive && <Check className="w-3 h-3 text-brand-600 dark:text-brand-300" />}
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-line flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => onTranslate(target)}
            disabled={!complete || translating}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
            {translating ? 'Traduciendo…' : 'Traducir'}
          </button>
        </div>
    </Modal>
  );
};
