import React, { useState, useRef, useEffect } from 'react';
import { ResumeData, ResumeAppearance } from '../types';
import { AppearanceBadge } from './appearance';
import { IconPicker } from './IconPicker';
import {
  FileText,
  MoreVertical,
  Copy,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  Plus,
  PenLine,
  ArrowDownUp,
  BookOpen,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  resumes: ResumeData[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCreateBlank: () => void;
  onUpload: () => void;
  onChangeAppearance: (id: string, appearance: ResumeAppearance) => void;
}

// Fecha "Actualizado" legible; se ejecuta en el navegador (Date disponible).
const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

export const Dashboard: React.FC<DashboardProps> = ({
  resumes,
  onOpen,
  onDuplicate,
  onDelete,
  onRename,
  onCreateBlank,
  onUpload,
  onChangeAppearance
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  // Id del CV cuyo selector de icono/imagen está abierto.
  const [pickerId, setPickerId] = useState<string | null>(null);

  // Menú kebab accesible: ref al contenedor (role=menu) y al botón que lo abrió,
  // para navegar con flechas, cerrar con Esc y devolver el foco al abridor.
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Al abrir el menú, enfocar el primer item.
  useEffect(() => {
    if (openMenuId) {
      (menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement | null)?.focus();
    }
  }, [openMenuId]);

  const closeMenu = () => {
    setOpenMenuId(null);
    menuTriggerRef.current?.focus();
  };

  const handleMenuKey = (e: React.KeyboardEvent) => {
    const nodes = menuRef.current?.querySelectorAll('[role="menuitem"]');
    const items = (nodes ? Array.from(nodes) : []) as HTMLElement[];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };
  // Orden de la rejilla: recientes primero, o por nombre asc/desc.
  const [sortBy, setSortBy] = useState<'recent' | 'name-asc' | 'name-desc'>('recent');

  const sortedResumes = [...resumes].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    // recent: por updatedAt descendente
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  const startRename = (r: ResumeData) => {
    setRenamingId(r.id);
    setRenameValue(r.name);
    setOpenMenuId(null);
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) {
      onRename(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  // Empty state: sin CVs, enseña las dos formas de empezar (incluida la de IA).
  if (resumes.length === 0) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-ink">Empecemos tu primer currículum</h2>
        <p className="text-sm text-ink-muted mt-1 max-w-md">
          Créalo desde cero, o <strong>sube un CV que ya tengas</strong> (PDF, DOC o DOCX) y la IA
          extraerá tus datos y los adaptará a nuestras plantillas.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={onCreateBlank}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md shadow-brand-100 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" /> Crear en blanco
          </button>
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-line hover:bg-surface-2 text-ink text-sm font-bold rounded-xl shadow-sm cursor-pointer transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" /> Cargar un CV con IA
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow p-6 max-w-[1700px] w-full mx-auto">
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Mis Currículums</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          {resumes.length} {resumes.length === 1 ? 'currículum' : 'currículums'} · haz clic en uno para editarlo
        </p>
      </div>

      {/* Barra de acciones: crear/cargar (izquierda) alineados con el orden (derecha) */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateBlank}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-100"
            title="Crear un currículum limpio en blanco"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
          <button
            onClick={onUpload}
            className="px-4 py-2.5 bg-surface border border-line hover:bg-surface-2 text-ink text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Subir un CV existente (PDF/DOC/DOCX) y adaptarlo con IA"
          >
            <BookOpen className="w-4 h-4" />
            Cargar CV
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <ArrowDownUp className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-surface border border-line rounded-lg px-2 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="recent">Modificación reciente</option>
            <option value="name-asc">Nombre (A → Z)</option>
            <option value="name-desc">Nombre (Z → A)</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedResumes.map((r) => (
          <div
            key={r.id}
            className="group relative bg-surface border border-line rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-300 focus-within:border-brand-400 focus-within:shadow-md transition flex flex-col gap-3 min-h-[150px]"
          >
            {/* Botón que cubre la tarjeta: abre el CV (accesible por teclado). Los
                controles (icono, menú, título) van por encima con z-10. */}
            {renamingId !== r.id && (
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                aria-label={`Abrir ${r.name}`}
                className="absolute inset-0 z-0 rounded-2xl cursor-pointer"
              />
            )}

            {/* Fila superior: icono (clic para personalizar) + menú de 3 puntos */}
            <div className="relative z-10 flex items-start justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPickerId(r.id);
                }}
                className="rounded-xl cursor-pointer hover:opacity-80 transition"
                aria-label={`Cambiar icono de ${r.name}`}
              >
                <AppearanceBadge appearance={r.appearance} />
              </button>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    menuTriggerRef.current = e.currentTarget;
                    setOpenMenuId(openMenuId === r.id ? null : r.id);
                  }}
                  className="p-1.5 text-ink-muted hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  aria-label={`Opciones de ${r.name}`}
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === r.id}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {openMenuId === r.id && (
                  <>
                    {/* Backdrop invisible: cierra el menú al clicar fuera */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                      }}
                    />
                    <div
                      ref={menuRef}
                      role="menu"
                      aria-label={`Opciones de ${r.name}`}
                      onKeyDown={handleMenuKey}
                      className="absolute right-0 mt-1 w-44 bg-surface border border-line rounded-xl shadow-lg z-20 py-1 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        role="menuitem"
                        onClick={() => {
                          onOpen(r.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-2 focus:bg-surface-2 focus:outline-none cursor-pointer"
                      >
                        <PenLine className="w-3.5 h-3.5" /> Modificar
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          onDuplicate(r.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-2 focus:bg-surface-2 focus:outline-none cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicar
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => startRename(r)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-2 focus:bg-surface-2 focus:outline-none cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Renombrar
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          onDelete(r.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus:bg-rose-50 dark:focus:bg-rose-950/40 focus:outline-none cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Nombre (o edición inline al renombrar) */}
            {renamingId === r.id ? (
              <div className="relative z-10 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  aria-label="Nuevo nombre del CV"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(r.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="flex-grow min-w-0 bg-surface border border-brand-300 text-sm font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={() => commitRename(r.id)}
                  className="p-1 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded cursor-pointer"
                  aria-label="Guardar"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                  aria-label="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative z-10 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(r);
                  }}
                  className="group/title flex items-center gap-1 max-w-full cursor-pointer"
                  aria-label={`Renombrar ${r.name}`}
                >
                  <span className="text-sm font-bold text-ink truncate">{r.name}</span>
                  <PenLine className="w-3 h-3 text-slate-400 group-hover/title:text-brand-600 flex-shrink-0 transition" />
                </button>
                <p className="text-xs text-ink-muted truncate pointer-events-none">
                  {r.personalDetails.fullName || 'Sin nombre'}
                  {r.personalDetails.jobTitle ? ` · ${r.personalDetails.jobTitle}` : ''}
                </p>
              </div>
            )}

            {/* Pie: última actualización */}
            <div className="relative z-10 mt-auto flex items-center gap-1.5 text-[11px] text-ink-muted font-medium pt-1 pointer-events-none">
              <Clock className="w-3 h-3" />
              Actualizado {formatDate(r.updatedAt)}
            </div>
          </div>
        ))}
      </div>

      {pickerId && (
        <IconPicker
          appearance={resumes.find((r) => r.id === pickerId)?.appearance}
          onChange={(appearance) => onChangeAppearance(pickerId, appearance)}
          onClose={() => setPickerId(null)}
        />
      )}
    </main>
  );
};
