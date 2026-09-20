import type { Metadata } from 'next'
import PrivacyPage from './privacy-client'

export const metadata: Metadata = {
  title: 'Privacy Policy | U.N.I.L.P.',
  description: 'Informativa sul trattamento dei dati personali raccolti dal sito U.N.I.L.P. ai sensi del Regolamento UE 679/2016 (GDPR).',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
}

export default function Page() {
  return <PrivacyPage />
}
