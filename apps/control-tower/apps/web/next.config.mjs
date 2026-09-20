/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compila los paquetes del workspace desde TypeScript (sin build previo).
  transpilePackages: ['@ct/shared', '@ct/validation', '@ct/db', '@ct/domain', '@ct/application'],
  // Salida standalone para una imagen Docker mínima (M18).
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // postgres.js sólo debe cargarse en el servidor (Next 15: top-level).
  serverExternalPackages: ['postgres'],
  // Importar .md como string crudo (la guía de uso se inlinea en el bundle → funciona en standalone sin fs en runtime).
  webpack: (config) => {
    config.module.rules.push({ test: /\.md$/, type: 'asset/source' });
    return config;
  },
  // El lint del workspace (eslint flat config en la raíz) es la fuente de verdad;
  // no duplicar la config de Next durante el build (CI corre `pnpm lint` aparte).
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  // Cabeceras de seguridad (defensa en profundidad; Caddy añade las suyas en prod).
  async headers() {
    // CSP conservadora para una app self-contained (sin CDNs). `unsafe-inline` es necesario para el script de
    // tema inline y los scripts de hidratación de Next; en DEV se añaden `unsafe-eval`/`ws:` (HMR/react-refresh).
    // Aun con unsafe-inline, aporta: object-src none, base-uri/form-action self, connect-src self (no exfiltración),
    // frame-ancestors self. Revisar en el navegador tras desplegar.
    const isDev = process.env.NODE_ENV !== 'production';
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      `connect-src 'self'${isDev ? ' ws:' : ''}`,
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
