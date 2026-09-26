/**
 * Indicador de «esto está en marcha», para acciones que no terminan al instante (un sync encolado que ejecuta el
 * worker). Es un SVG con `animate-spin`, no un glifo de texto: un carácter girando cambia de tamaño entre fuentes y
 * se ve torcido.
 *
 * `aria-hidden` porque quien lo acompaña siempre pone el texto («Sincronizando…»): sin eso, un lector de pantalla
 * anunciaría un elemento decorativo y no el estado.
 */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 animate-spin ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {/* Aro de fondo + arco: el contraste entre los dos es lo que hace visible el giro. */}
      <circle cx="8" cy="8" r="6" className="opacity-25" />
      <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
    </svg>
  );
}
