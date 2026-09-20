import React, { useRef, useState } from 'react';
import { X, FileUp, Sparkles, Loader2, AlertCircle, Wand2, Globe } from 'lucide-react';
import { TemplateLanguage } from '../types';
import { LANGUAGE_OPTIONS } from '../languages';
import { Modal } from './Modal';

interface UploadCvModalProps {
  onClose: () => void;
  onFile: (file: File, language: TemplateLanguage) => void;
  isParsing: boolean;
  error: string | null;
}

const MAX_MB = 8;
const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const isValidType = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
};

// Pantalla para cargar un CV existente (arrastrar o buscar). Acepta PDF/DOC/DOCX
// y, gracias a la IA, adapta CVs con cualquier plantilla al modelo de la app.
export const UploadCvModal: React.FC<UploadCvModalProps> = ({ onClose, onFile, isParsing, error }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [language, setLanguage] = useState<TemplateLanguage>('es');

  const validateAndSend = (file: File) => {
    setLocalError(null);
    if (!isValidType(file)) {
      setLocalError('Formato no admitido. Sube un archivo PDF, DOC o DOCX.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`El archivo supera el máximo de ${MAX_MB} MB.`);
      return;
    }
    onFile(file, language);
  };

  const handleDrag = (e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isParsing) setDragActive(active);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isParsing) return;
    if (e.dataTransfer.files?.[0]) validateAndSend(e.dataTransfer.files[0]);
  };

  const shownError = localError || error;

  return (
    <Modal onClose={onClose} ariaLabel="Cargar un CV" className="max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-bold text-sm text-ink">Cargar un CV</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mensaje de adaptación por IA */}
          <div className="flex items-start gap-2.5 bg-brand-50/70 dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800/50 rounded-xl p-3">
            <Wand2 className="w-4 h-4 text-brand-600 dark:text-brand-300 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-brand-900/80 leading-relaxed">
              ¿Tu CV tiene otro formato o una plantilla distinta? No importa: la IA leerá la
              información y la <strong>adaptará automáticamente</strong> a las plantillas de CV Express.
            </p>
          </div>

          {/* Idioma del CV que se sube (queda fijo) */}
          <div>
            <label htmlFor="upload-language" className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-500" />
              Idioma del CV
            </label>
            <select
              id="upload-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as TemplateLanguage)}
              disabled={isParsing}
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-brand-500 bg-surface cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zona de arrastre / búsqueda */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              dragActive
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/40'
                : 'border-line hover:border-slate-300 bg-surface-2/50'
            }`}
            onDragEnter={(e) => handleDrag(e, true)}
            onDragOver={(e) => handleDrag(e, true)}
            onDragLeave={(e) => handleDrag(e, false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={ACCEPT}
              onChange={(e) => e.target.files?.[0] && validateAndSend(e.target.files[0])}
            />

            {isParsing ? (
              <div className="flex flex-col items-center justify-center py-3 space-y-3">
                <Loader2 className="w-9 h-9 text-brand-600 dark:text-brand-300 animate-spin" />
                <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  Analizando y adaptando tu CV con IA...
                </div>
                <p className="text-xs text-ink-muted max-w-sm">
                  Estamos extrayendo tus datos y rellenando la plantilla. Puede tardar unos segundos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-11 h-11 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300">
                  <FileUp className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-ink">
                  Arrastra tu archivo aquí
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
                >
                  Buscar en el equipo
                </button>
              </div>
            )}
          </div>

          {/* Condiciones del archivo */}
          <ul className="text-[11px] text-ink-muted space-y-1">
            <li>• Formatos admitidos: <strong>PDF, DOC, DOCX</strong>.</li>
            <li>• Tamaño máximo: <strong>{MAX_MB} MB</strong>.</li>
            <li>• Los .doc/.docx se leen extrayendo su texto; para máxima fidelidad, usa PDF.</li>
          </ul>

          {shownError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{shownError}</span>
            </div>
          )}
        </div>
    </Modal>
  );
};
