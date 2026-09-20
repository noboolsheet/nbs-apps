"use client"

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { translations, languages, type Language } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// El chat llama same-origin a `/api/chat` (Caddy lo proxea al backend, que a su
// vez hace de proxy al webhook interno de n8n). En `next dev` contra un backend
// local se puede sobreescribir con NEXT_PUBLIC_API_BASE_URL, igual que el form
// de contacto (ver app/contatti/contatti-client.tsx).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api'

// Mismo motor de i18n que el resto del sitio, pero sin el TranslationProvider:
// este widget se monta en el layout (fuera de los provider por-pagina), asi que
// lee el idioma directamente de localStorage (misma clave que el provider) y
// reacciona a los cambios. Italiano es el fallback.
const LANG_STORAGE_KEY = 'unilp-lang'
const SESSION_STORAGE_KEY = 'unilp-chat-session'
// Flag por sesion: si el usuario cierra el chat, no lo volvemos a auto-abrir en
// esa sesion/pestana. Una sesion nueva (sessionStorage vacio) vuelve a abrirlo.
const DISMISS_STORAGE_KEY = 'unilp-chat-dismissed'
// Solo auto-abrimos en escritorio: en movil el panel taparia la pantalla. 768px
// = breakpoint `md` de Tailwind, el mismo que usa el resto del sitio.
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'
// Pequena espera antes de auto-abrir, para una entrada menos abrupta.
const AUTO_OPEN_DELAY_MS = 900

function readLanguage(): Language {
  if (typeof window === 'undefined') return 'it'
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY)
  if (stored && stored in languages) return stored as Language
  const nav = window.navigator.language.slice(0, 2).toLowerCase()
  if (nav in languages) return nav as Language
  return 'it'
}

// El idioma "fuente de verdad" del sitio es `document.documentElement.lang`, que
// el TranslationProvider mantiene sincronizado (translation-provider.tsx). Lo
// observamos para reaccionar a cambios EN LA MISMA PESTANA (el evento `storage`
// solo se dispara entre pestanas). Si el <html lang> aun no es valido, caemos a
// la deteccion por localStorage/navigator.
function readLanguageFromDom(): Language {
  if (typeof document !== 'undefined') {
    const htmlLang = document.documentElement.lang
    if (htmlLang && htmlLang in languages) return htmlLang as Language
  }
  return readLanguage()
}

// sessionId persistente para que n8n mantenga la memoria de la conversacion.
// Cumple el esquema del backend (^[A-Za-z0-9_-]{8,64}$).
function getSessionId(): string {
  let id = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id =
      window.crypto?.randomUUID?.() ??
      `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    window.localStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

type Message = { role: 'user' | 'bot'; text: string }

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('it')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const t = (translations[language] ?? translations.it).chat

  // Sincronizar el idioma con el del sitio: al montar, observando el atributo
  // `lang` de <html> (que cambia el selector via el provider, en la misma
  // pestana) y ante cambios en otras pestanas (`storage`).
  useEffect(() => {
    setLanguage(readLanguageFromDom())

    const observer = new MutationObserver(() => setLanguage(readLanguageFromDom()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    })

    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_STORAGE_KEY) setLanguage(readLanguageFromDom())
    }
    window.addEventListener('storage', onStorage)

    return () => {
      observer.disconnect()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  // Auto-apertura al entrar: solo en escritorio y solo si el usuario no ha
  // cerrado el chat en esta sesion. Corre post-hidratacion, asi que el render
  // inicial (isOpen=false) coincide con el del servidor.
  useEffect(() => {
    if (!window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return
    if (window.sessionStorage.getItem(DISMISS_STORAGE_KEY)) return
    const id = window.setTimeout(() => setIsOpen(true), AUTO_OPEN_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [])

  // Cerrar cuenta como "dismiss" de la sesion: no se vuelve a auto-abrir hasta
  // una sesion nueva. Lo usan tanto la X como el lanzador estando abierto.
  const handleClose = () => {
    setIsOpen(false)
    window.sessionStorage.setItem(DISMISS_STORAGE_KEY, '1')
  }

  // Auto-scroll al ultimo mensaje.
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending, isOpen])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isSending) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setIsSending(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getSessionId(), message: text }),
        // Backstop: el RAG+LLM puede tardar; abortamos a los 30s.
        signal: AbortSignal.timeout(30000),
      })
      // No confiar solo en el status: validar el body (el fallback SPA de nginx
      // devuelve index.html con 200). Exigimos { ok:true, response:string }.
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; response?: string; error?: string }
        | null

      if (res.ok && payload?.ok === true && typeof payload.response === 'string') {
        setMessages((prev) => [...prev, { role: 'bot', text: payload.response as string }])
      } else {
        const botText = payload?.error === 'chat_disabled' ? t.unavailable : t.error
        setMessages((prev) => [...prev, { role: 'bot', text: botText }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: t.error }])
    } finally {
      setIsSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 print:hidden">
      {isOpen && (
        <div
          role="dialog"
          aria-label={t.title}
          className="chat-panel-enter flex h-[min(70vh,30rem)] w-[min(92vw,23rem)] flex-col overflow-hidden rounded-xl border border-ink-line bg-paper-cream shadow-xl"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between bg-warm-brick px-4 py-3 text-paper-cream">
            <span className="font-medium">{t.title}</span>
            <button
              type="button"
              onClick={handleClose}
              aria-label={t.close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-paper-cream/80 transition-colors hover:bg-warm-brick-deep hover:text-paper-cream"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            <ChatBubble role="bot" text={t.greeting} />
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} text={m.text} />
            ))}
            {isSending && (
              <p className="text-xs italic text-ink-quiet" aria-live="polite">
                {t.sending}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Entrada */}
          <div className="flex items-center gap-2 border-t border-ink-line bg-paper-cream px-3 py-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              disabled={isSending}
              maxLength={1000}
              className="bg-white"
            />
            <Button
              type="button"
              size="icon"
              onClick={sendMessage}
              disabled={isSending || input.trim() === ''}
              aria-label={t.send}
              className="bg-warm-brick text-paper-cream hover:bg-warm-brick-deep"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Lanzador flotante */}
      <Button
        type="button"
        size="icon-lg"
        onClick={() => setIsOpen(true)}
        aria-label={t.launcher}
        aria-expanded={isOpen}
        className={cn(
          'rounded-full bg-warm-brick text-paper-cream shadow-lg hover:bg-warm-brick-deep',
          isOpen && 'hidden',
          // Rebote periodico para recordar que el chat esta ahi (solo cerrado).
          !isOpen && 'chat-bounce',
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  )
}

function ChatBubble({ role, text }: Message) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <span
        className={cn(
          'inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2',
          isUser
            ? 'bg-warm-brick text-paper-cream'
            : 'bg-paper-cream-deep text-ink-black',
        )}
      >
        {text}
      </span>
    </div>
  )
}
