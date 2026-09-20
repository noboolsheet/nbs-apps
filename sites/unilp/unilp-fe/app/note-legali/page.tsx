import type { Metadata } from 'next'
import NoteLegaliPage from './note-legali-client'

export const metadata: Metadata = {
  title: 'Note Legali | U.N.I.L.P.',
  description: 'Note legali del sito U.N.I.L.P.: identificazione del titolare, proprietà intellettuale, responsabilità e legislazione applicabile.',
  alternates: { canonical: '/note-legali' },
  robots: { index: true, follow: true },
}

export default function Page() {
  return <NoteLegaliPage />
}
