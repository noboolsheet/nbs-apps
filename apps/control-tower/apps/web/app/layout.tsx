import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { themeScript } from '@/lib/theme';
import { t } from '@/lib/i18n';

// Fuente de la app. `next/font` la auto-hospeda en el build (sin petición a Google en runtime) y expone la variable
// CSS `--font-sans`, que es el TOKEN de fuente (lo consume `body` en globals.css). Cambiar de fuente = cambiar aquí.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Control Tower',
  description: t('app.tagline'),
  icons: { icon: '/control-tower-icono.png', apple: '/control-tower-icono.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={sans.variable}>
      <head>
        {/* Anti-flash: fija data-theme según la preferencia guardada antes del primer paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
