// Preferencia guardada por el usuario. 'system' = seguir al SO (por defecto).
export type ThemePref = 'light' | 'dark' | 'system';
// Tema efectivo que se aplica al DOM.
export type Theme = 'light' | 'dark';
const KEY = 'cv-theme';

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Tema efectivo: la elección manual, o la del SO si la preferencia es 'system'.
export function effectiveTheme(pref: ThemePref = getThemePref()): Theme {
  return pref === 'system' ? systemTheme() : pref;
}

export function applyTheme(pref: ThemePref = getThemePref()): void {
  document.documentElement.classList.toggle('dark', effectiveTheme(pref) === 'dark');
}

export function setThemePref(pref: ThemePref): void {
  localStorage.setItem(KEY, pref);
  applyTheme(pref);
}

// Escucha los cambios de tema del SO (relevante cuando la preferencia es 'system').
// Devuelve una función de limpieza.
export function watchSystemTheme(cb: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => cb();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
