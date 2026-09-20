import React, { useEffect, useRef, useState } from 'react';
import * as api from '../api';
import { Analysis, AnalysisReport } from '../api';
import { ResumeData } from '../types';
import { fileToPayload } from '../fileUtils';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  FileUp,
  Clock,
  Trash2,
  Target,
  Lightbulb,
  ThumbsUp,
  XCircle,
  FileText,
  Info,
} from 'lucide-react';

interface AnalyzeScreenProps {
  resumes: ResumeData[];
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const MAX_MB = 8;

const scoreColor = (n: number) =>
  n >= 70 ? 'text-emerald-600 dark:text-emerald-300' : n >= 40 ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300';
const scoreBar = (n: number) =>
  n >= 70 ? 'bg-emerald-500' : n >= 40 ? 'bg-amber-500' : 'bg-rose-500';

const timeAgo = (ts: number) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  return `hace ${h} h`;
};

// Vista "Comparar con oferta": sube/pega una oferta, elige un CV (propio o externo)
// y obtén un informe de compatibilidad con IA. Historial efímero (se borra a las 24h).
export const AnalyzeScreen: React.FC<AnalyzeScreenProps> = ({ resumes, showToast }) => {
  // Oferta
  const [jobMode, setJobMode] = useState<'file' | 'text'>('text');
  const [jobText, setJobText] = useState('');
  const [jobFile, setJobFile] = useState<File | null>(null);

  // CV
  const [cvMode, setCvMode] = useState<'own' | 'upload'>(resumes.length ? 'own' : 'upload');
  const [cvResumeId, setCvResumeId] = useState<string>(resumes[0]?.id || '');
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);

  const jobFileRef = useRef<HTMLInputElement>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listAnalyses().then(setHistory).catch(() => {});
  }, []);

  const checkFile = (f: File): boolean => {
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera el máximo de ${MAX_MB} MB.`);
      return false;
    }
    return true;
  };

  const runAnalysis = async () => {
    setError(null);
    // Validaciones de entrada
    if (jobMode === 'text' && !jobText.trim()) return setError('Pega el texto de la oferta.');
    if (jobMode === 'file' && !jobFile) return setError('Sube el archivo de la oferta.');
    if (cvMode === 'own' && !cvResumeId) return setError('Selecciona un CV.');
    if (cvMode === 'upload' && !cvFile) return setError('Sube un CV.');

    setAnalyzing(true);
    try {
      const body: Parameters<typeof api.analyze>[0] = {};
      body.jobText = jobMode === 'text' ? jobText : undefined;
      if (jobMode === 'file' && jobFile) body.jobFile = await fileToPayload(jobFile);
      if (cvMode === 'own') body.cvResumeId = cvResumeId;
      if (cvMode === 'upload' && cvFile) {
        body.cvFile = await fileToPayload(cvFile);
        body.cvLabel = cvFile.name;
      }
      const result = await api.analyze(body);
      setCurrent(result);
      setHistory((h) => [result, ...h.filter((a) => a.id !== result.id)]);
      showToast('Análisis completado');
    } catch (err: any) {
      setError(err.message || 'No se pudo completar el análisis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const removeFromHistory = async (id: string) => {
    await api.deleteAnalysis(id).catch(() => {});
    setHistory((h) => h.filter((a) => a.id !== id));
    if (current?.id === id) setCurrent(null);
  };

  const tabBtn = (activeVal: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
      activeVal ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-ink-muted hover:bg-slate-200 dark:hover:bg-slate-700'
    }`;

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
            Comparar CV con una oferta
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Sube o pega una oferta, elige un CV y obtén un informe de compatibilidad con IA.
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-surface border border-line rounded-2xl shadow-sm p-5 space-y-5">
          {/* Oferta */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                1. Oferta de trabajo
              </label>
              <div className="flex gap-1.5">
                <button onClick={() => setJobMode('text')} className={tabBtn(jobMode === 'text')}>
                  Pegar texto
                </button>
                <button onClick={() => setJobMode('file')} className={tabBtn(jobMode === 'file')}>
                  Subir archivo
                </button>
              </div>
            </div>
            {jobMode === 'text' ? (
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                rows={5}
                aria-label="Texto de la oferta de trabajo"
                placeholder="Pega aquí la descripción del puesto y los requisitos…"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-brand-500 resize-y"
              />
            ) : (
              <div>
                <input
                  ref={jobFileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,image/*,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && checkFile(f)) {
                      setJobFile(f);
                      setError(null);
                    }
                  }}
                />
                <button
                  onClick={() => jobFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-line hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-900/40 text-ink-muted text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  {jobFile ? jobFile.name : 'Subir la oferta (PDF, DOC, DOCX, imagen)'}
                </button>
              </div>
            )}
          </div>

          {/* CV */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                2. Tu CV
              </label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCvMode('own')}
                  disabled={!resumes.length}
                  className={`${tabBtn(cvMode === 'own')} ${!resumes.length ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Mis CVs
                </button>
                <button onClick={() => setCvMode('upload')} className={tabBtn(cvMode === 'upload')}>
                  Subir archivo
                </button>
              </div>
            </div>
            {cvMode === 'own' ? (
              <select
                value={cvResumeId}
                onChange={(e) => setCvResumeId(e.target.value)}
                aria-label="Elegir uno de tus CVs"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-brand-500 bg-surface cursor-pointer"
              >
                {resumes.length === 0 && <option value="">No tienes CVs</option>}
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <div>
                <input
                  ref={cvFileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,image/*,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && checkFile(f)) {
                      setCvFile(f);
                      setError(null);
                    }
                  }}
                />
                <button
                  onClick={() => cvFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-line hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-900/40 text-ink-muted text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  {cvFile ? cvFile.name : 'Subir un CV (PDF, DOC, DOCX, imagen)'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-md shadow-brand-100"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Analizando…' : 'Analizar'}
          </button>
        </div>

        {/* Informe actual */}
        {current && <ReportCard analysis={current} />}

        {/* Historial */}
        <div className="bg-surface border border-line rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-ink">Historial</h3>
            <span className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Info className="w-3 h-3" /> Se borra automáticamente cada 24 horas
            </span>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-ink-muted py-3">Aún no has hecho ningún análisis.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <button
                    onClick={() => setCurrent(a)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer"
                  >
                    <span className={`text-sm font-bold ${scoreColor(a.report.compatibility)}`}>
                      {a.report.compatibility}%
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink truncate">
                        {a.jobTitle}
                      </span>
                      <span className="block text-[11px] text-ink-muted truncate">
                        {a.cvLabel} · <Clock className="w-2.5 h-2.5 inline" /> {timeAgo(a.createdAt)}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => removeFromHistory(a.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    aria-label="Eliminar del historial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
};

// Tarjeta con el informe de compatibilidad.
const ReportCard: React.FC<{ analysis: Analysis }> = ({ analysis }) => {
  const r: AnalysisReport = analysis.report;
  return (
    <div className="bg-surface border border-line rounded-2xl shadow-sm p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className="text-center flex-shrink-0">
          <div className={`text-4xl font-bold ${scoreColor(r.compatibility)}`}>{r.compatibility}%</div>
          <div className="text-[11px] uppercase tracking-wider text-ink-muted font-bold">Compatibilidad</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink mb-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> {analysis.jobTitle}
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className={`h-full ${scoreBar(r.compatibility)}`} style={{ width: `${r.compatibility}%` }} />
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">{r.verdict}</p>
        </div>
      </div>

      {/* Consejo para el resumen inicial */}
      <div className="bg-brand-50/70 dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800/50 rounded-xl p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-800 mb-1">
          <Target className="w-3.5 h-3.5" /> Consejo para tu resumen/perfil
        </div>
        <p className="text-xs text-brand-900/80 leading-relaxed">{r.summaryAdvice}</p>
      </div>

      {/* Consejos de texto/habilidades */}
      {r.textAdvice && r.textAdvice.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Cómo mejorar tu CV
          </div>
          <ul className="space-y-1.5">
            {r.textAdvice.map((t, i) => (
              <li key={i} className="text-xs text-ink-muted leading-relaxed flex gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Habilidades que faltan */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-ink mb-2">
          <XCircle className="w-3.5 h-3.5 text-rose-500" /> Habilidades que te faltan
        </div>
        {r.missingSkills.length === 0 ? (
          <p className="text-xs text-ink-muted">No se detectaron carencias importantes. ¡Buen encaje!</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {r.missingSkills.map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-semibold rounded-lg border border-rose-100 dark:border-rose-900/50"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Puntos fuertes */}
      {r.strengths && r.strengths.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink mb-2">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /> Tus puntos fuertes
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.strengths.map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold rounded-lg border border-emerald-100 dark:border-emerald-900/50"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
