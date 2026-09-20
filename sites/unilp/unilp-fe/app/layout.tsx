import type { Metadata } from 'next'

import './globals.css'
import { Inter, Geist_Mono, Source_Serif_4 } from 'next/font/google'
import { GoogleAnalytics } from '@/components/google-analytics'
import { ChatWidget } from '@/components/chat-widget'
import { buildWebSite, ORG_ID } from '@/lib/structured-data'

const isProduction = process.env.NODE_ENV === 'production'

// El chatbot solo se habilita en prod: n8n vive unicamente en ese entorno. Es
// un build-arg (NEXT_PUBLIC_*) porque NODE_ENV no distingue prod de nonprod (en
// ambos `next build` compila en modo production). Ver Dockerfile + compose.prod.
const isChatEnabled = process.env.NEXT_PUBLIC_CHAT_ENABLED === 'true'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans-inter',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif-source',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-geist',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unilp.noboolsheet.local'

const DEFAULT_TITLE = 'U.N.I.L.P. - Unione Nazionale Italiana Lavoratori e Pensionati'
const DEFAULT_DESCRIPTION = 'Organizzazione sindacale nazionale unitaria, democratica ed autonoma che promuove la libera associazione e l\'autotutela solidale e collettiva degli iscritti.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | U.N.I.L.P.',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: 'U.N.I.L.P.',
  authors: [{ name: 'U.N.I.L.P.' }],
  // All three languages are served from the same set of URLs (the switcher is
  // client-side, there is no per-locale routing), so emitting hreflang alternates
  // that all resolve to the canonical is a duplicate-canonical signal with no SEO
  // value. Only the self-canonical is declared. Reintroduce `languages` here if
  // locale-prefixed routes (e.g. /es, /en) ever ship.
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'U.N.I.L.P.',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: '/',
    locale: 'it_IT',
    alternateLocale: ['es_ES', 'en_US'],
    // TODO: replace with a dedicated 1200x630 social card. The brand logo is a placeholder.
    images: [
      { url: '/images/logo-unilp.png', alt: 'U.N.I.L.P. — Unione Nazionale Italiana Lavoratori e Pensionati' },
    ],
  },
  twitter: {
    card: 'summary',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ['/images/logo-unilp.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  // NGO refleja la naturaleza de sindicato sin ánimo de lucro; Organization se
  // mantiene como tipo base para máxima compatibilidad. El @id permite que los
  // nodos Service/WebSite de otras páginas referencien esta misma entidad.
  '@type': ['NGO', 'Organization'],
  '@id': ORG_ID,
  name: 'U.N.I.L.P. - Unione Nazionale Italiana Lavoratori e Pensionati',
  alternateName: 'U.N.I.L.P.',
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo-unilp.png`,
  description: DEFAULT_DESCRIPTION,
  areaServed: { '@type': 'Country', name: 'Italia' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Via Roma 1',
    postalCode: '00100',
    addressLocality: 'Roma',
    addressCountry: 'IT',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+390000000000',
      email: 'demo@example.com',
      availableLanguage: ['it', 'es', 'en'],
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="it"
      className={`bg-background ${inter.variable} ${sourceSerif.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationJsonLd,
              buildWebSite(DEFAULT_TITLE, DEFAULT_DESCRIPTION),
            ]),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {/* GA se carga solo tras aceptar cookies (ver components/google-analytics.tsx). */}
        {isProduction && <GoogleAnalytics />}
        {/* Chatbot n8n: solo en prod (ver isChatEnabled). */}
        {isChatEnabled && <ChatWidget />}
      </body>
    </html>
  )
}
