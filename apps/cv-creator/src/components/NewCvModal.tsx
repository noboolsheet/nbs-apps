import React, { useState } from 'react';
import { TemplateLanguage } from '../types';
import { LANGUAGE_OPTIONS } from '../languages';
import { Modal } from './Modal';
import { X, Plus, Check, Globe } from 'lucide-react';

interface NewCvModalProps {
  onClose: () => void;
  onCreate: (language: TemplateLanguage) => void;
}

// Modal para crear un CV en blanco eligiendo su idioma (queda fijo para ese CV).
export const NewCvModal: React.FC<NewCvModalProps> = ({ onClose, onCreate }) => {
  const [language, setLanguage] = useState<TemplateLanguage>('es');

  return (
    <Modal onClose={onClose} ariaLabel="Nuevo CV" className="max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-bold text-sm text-ink">Nuevo CV</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-500" />
              Idioma del CV
            </span>
            <p className="text-[11px] text-ink-muted mb-2.5">
              Es el idioma en el que escribirás el CV. Luego podrás traducirlo a otro idioma (se creará
              una copia).
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Idioma del CV">
              {LANGUAGE_OPTIONS.map((l) => {
                const isActive = language === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
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
        </div>

        <div className="px-5 py-3 border-t border-line flex justify-end">
          <button
            onClick={() => onCreate(language)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Crear CV en blanco
          </button>
        </div>
    </Modal>
  );
};
