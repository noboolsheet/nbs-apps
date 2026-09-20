import React from 'react';
import { Menu, FileText, LogOut, Target, User, Settings, Sun, Moon } from 'lucide-react';
import { Theme } from '../theme';

export type DrawerSection = 'dashboard' | 'analyze' | 'profile' | 'settings';

interface SideDrawerProps {
  expanded: boolean;
  onToggle: () => void;
  activeSection: DrawerSection;
  onNavigate: (section: DrawerSection) => void;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  onLogout: () => void;
  theme: Theme; // tema efectivo (para el icono del toggle rápido)
  onToggleTheme: () => void;
}

// Rail de navegación estilo Gemini: SIEMPRE visible. Colapsado (w-16) muestra solo
// iconos; expandido (w-64) muestra iconos + nombres. La hamburguesa vive dentro del
// propio rail (arriba). Se renderiza solo fuera del editor.
export const SideDrawer: React.FC<SideDrawerProps> = ({
  expanded,
  onToggle,
  activeSection,
  onNavigate,
  userName,
  userEmail,
  userAvatar,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  // Un item de navegación; colapsado = icono-solo (con tooltip), expandido = icono+texto.
  const navItem = (section: DrawerSection, icon: React.ReactNode, label: string) => {
    const active = activeSection === section;
    return (
      <button
        onClick={() => onNavigate(section)}
        aria-current={active ? 'page' : undefined}
        aria-label={expanded ? undefined : label}
        title={expanded ? undefined : label}
        className={`w-full flex items-center rounded-lg text-left transition cursor-pointer ${
          expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2.5'
        } ${active ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'text-ink-muted hover:bg-surface-2'}`}
      >
        <span className="flex-shrink-0">{icon}</span>
        {expanded && <span className="text-xs font-semibold truncate">{label}</span>}
      </button>
    );
  };

  const initial = (userName || userEmail).charAt(0).toUpperCase();
  // El botón activa el modo CONTRARIO al actual (icono + etiqueta lo reflejan).
  const themeAction = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  return (
    <aside
      className={`no-print h-full flex-shrink-0 overflow-hidden bg-surface border-r border-line transition-[width] duration-200 ease-in-out ${
        expanded ? 'w-64' : 'w-16'
      }`}
    >
      <div className={`h-full flex flex-col ${expanded ? 'w-64' : 'w-16'}`}>
        {/* Cabecera: "Menú" (al expandir) + la hamburguesa, dentro del rail. */}
        <div
          className={`flex items-center h-16 border-b border-line ${
            expanded ? 'justify-between px-3' : 'justify-center'
          }`}
        >
          {expanded && <span className="pl-1 text-sm font-bold text-ink">Menú</span>}
          <button
            onClick={onToggle}
            aria-label={expanded ? 'Contraer menú' : 'Expandir menú'}
            aria-expanded={expanded}
            title={expanded ? 'Contraer menú' : 'Expandir menú'}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Secciones" className="flex-grow overflow-y-auto p-2 space-y-0.5">
          {navItem('dashboard', <FileText className="w-5 h-5" />, 'Currículums')}
          {navItem('analyze', <Target className="w-5 h-5" />, 'Comparar con oferta')}
          {navItem('profile', <User className="w-5 h-5" />, 'Mi perfil')}
          {navItem('settings', <Settings className="w-5 h-5" />, 'Configuración')}
        </nav>

        {/* Pie: perfil + toggle rápido de tema + cerrar sesión. */}
        <div className="border-t border-line p-2 space-y-0.5">
          {/* Acceso al perfil */}
          <button
            onClick={() => onNavigate('profile')}
            aria-label={expanded ? undefined : 'Mi perfil'}
            title={expanded ? undefined : userName || userEmail}
            className={`w-full flex items-center rounded-lg hover:bg-surface-2 transition cursor-pointer ${
              expanded ? 'gap-2.5 px-1.5 py-1.5' : 'justify-center py-1.5'
            }`}
          >
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {initial}
              </div>
            )}
            {expanded && (
              <span className="min-w-0 text-left">
                {userName && <span className="block text-xs font-semibold text-ink truncate">{userName}</span>}
                <span className="block text-[11px] text-ink-muted truncate">{userEmail}</span>
              </span>
            )}
          </button>

          {/* Cerrar sesión + toggle de tema (solo icono) a su lado. */}
          <div className={expanded ? 'flex items-center gap-1' : 'flex flex-col gap-0.5'}>
            <button
              onClick={onLogout}
              aria-label={expanded ? undefined : 'Cerrar sesión'}
              title={expanded ? undefined : 'Cerrar sesión'}
              className={`flex items-center rounded-lg text-ink-muted hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 transition cursor-pointer ${
                expanded ? 'flex-1 gap-2.5 px-2.5 py-2' : 'justify-center py-2.5'
              }`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {expanded && <span className="text-xs font-semibold">Cerrar sesión</span>}
            </button>

            {/* Toggle rápido de tema: luna si está oscuro, sol si está claro (modo activo). */}
            <button
              onClick={onToggleTheme}
              aria-label={themeAction}
              title={themeAction}
              className={`flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 transition cursor-pointer flex-shrink-0 ${
                expanded ? 'p-2' : 'py-2.5'
              }`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Moon className="w-5 h-5 flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
