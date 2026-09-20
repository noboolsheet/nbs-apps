import type { MetadataRoute } from 'next'
import { translations } from '@/lib/i18n'

export const dynamic = 'force-static'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unilp.noboolsheet.local'

const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'monthly' as const },
  { path: '/chi-siamo', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/i-nostri-servizi', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/i-nostri-lavoratori', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/modulo-iscrizione', priority: 0.9, changeFrequency: 'yearly' as const },
  { path: '/contatti', priority: 0.7, changeFrequency: 'yearly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/note-legali', priority: 0.3, changeFrequency: 'yearly' as const },
]

const SERVICE_ROUTES = translations.it.servicesPage.items.map((item) => ({
  path: `/i-nostri-servizi/${item.id}`,
  priority: 0.7,
  changeFrequency: 'monthly' as const,
}))

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [...STATIC_ROUTES, ...SERVICE_ROUTES].map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
