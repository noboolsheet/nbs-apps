import type { Metadata } from 'next'
import CookiesPage from './cookies-client'

export const metadata: Metadata = {
  title: 'Cookie Policy | U.N.I.L.P.',
  description: 'Informativa sull\'uso dei cookie sul sito U.N.I.L.P.: cookie tecnici, analitici, gestione delle preferenze e disattivazione.',
  alternates: { canonical: '/cookies' },
  robots: { index: true, follow: true },
}

export default function Page() {
  return <CookiesPage />
}
