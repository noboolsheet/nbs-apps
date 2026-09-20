'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Selector de tema claro/oscuro/sistema. La fuente única del COLOR son los tokens de `globals.css`:
 * - `data-theme="dark"`  fuerza oscuro (gana al SO)
 * - `data-theme="light"` fuerza claro (gana al SO)
 * - sin atributo → sigue `prefers-color-scheme` del sistema
 * Aquí solo elegimos el atributo y lo persistimos en localStorage. El script anti-flash (`themeScript`) lo aplica
 * antes del primer paint para evitar parpadeo; este hook lo mantiene sincronizado en cliente.
 */
export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'ct-theme';

/** Aplica el tema al <html> (data-theme) — sin tocar el atributo cuando es "system". */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/**
 * Script que corre ANTES del primer paint (inyectado en <head>): lee la preferencia guardada y fija `data-theme`,
 * de modo que no haya parpadeo claro→oscuro. Se auto-invoca; tolera localStorage bloqueado.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>('system');

  // Estado inicial desde localStorage (tras el montaje, para no romper la hidratación).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') setThemeState(stored);
      else setThemeState('system');
    } catch {
      /* localStorage no disponible */
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      if (t === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* localStorage no disponible */
    }
  }, []);

  return { theme, setTheme };
}
