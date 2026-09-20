import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { sendChat } from "@/lib/api/chat.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Widget del chatbot de UAI-UTCS. Habla con la server function sendChat, que a
// su vez hace de proxy al webhook interno de n8n. utcs es un sitio solo en
// italiano (__root.tsx fija <html lang="it"> y no hay selector de idioma), asi
// que los textos son constantes en italiano (a diferencia del widget de unilp,
// que reacciona al idioma del sitio).
const STRINGS = {
  launcher: "Apri la chat di assistenza",
  title: "Assistenza UAI-UTCS",
  close: "Chiudi la chat",
  greeting: "Ciao, sono Marco, il tuo assistente virtuale di Intelligenza Artificiale e sono qui per tutto ciò di cui hai bisogno. Come posso aiutarti oggi?",
  placeholder: "Scrivi un messaggio…",
  send: "Invia",
  sending: "Sto scrivendo…",
  error: "Si è verificato un problema. Riprova più tardi.",
  unavailable: "La chat non è al momento disponibile. Riprova più tardi.",
} as const;

// sessionId persistente para que n8n mantenga la memoria de la conversacion.
// Cumple el esquema del servidor (^[A-Za-z0-9_-]{8,64}$).
const SESSION_STORAGE_KEY = "utcs-chat-session";
// Flag por sesion: si el usuario cierra el chat, no lo volvemos a auto-abrir en
// esa sesion/pestana. Una sesion nueva (sessionStorage vacio) vuelve a abrirlo.
const DISMISS_STORAGE_KEY = "utcs-chat-dismissed";
// Solo auto-abrimos en escritorio: en movil el panel taparia la pantalla. 768px
// = breakpoint `md` de Tailwind, el mismo que usa el resto del sitio.
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
// Pequena espera antes de auto-abrir, para una entrada menos abrupta.
const AUTO_OPEN_DELAY_MS = 900;

function getSessionId(): string {
  let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id =
      window.crypto?.randomUUID?.() ??
      `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

type Message = { role: "user" | "bot"; text: string };

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Auto-apertura al entrar: solo en escritorio y solo si el usuario no ha
  // cerrado el chat en esta sesion. Corre post-hidratacion, asi que el render
  // inicial (isOpen=false) coincide con el del servidor.
  useEffect(() => {
    if (!window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return;
    if (window.sessionStorage.getItem(DISMISS_STORAGE_KEY)) return;
    const id = window.setTimeout(() => setIsOpen(true), AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  // Auto-scroll al ultimo mensaje.
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isOpen]);

  // Cerrar cuenta como "dismiss" de la sesion: no se vuelve a auto-abrir hasta
  // una sesion nueva. Lo usan tanto la X como el lanzador estando abierto.
  const handleClose = () => {
    setIsOpen(false);
    window.sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsSending(true);

    try {
      const payload = await sendChat({ data: { sessionId: getSessionId(), message: text } });
      if (payload.ok) {
        setMessages((prev) => [...prev, { role: "bot", text: payload.response }]);
      } else {
        const botText = payload.error === "chat_disabled" ? STRINGS.unavailable : STRINGS.error;
        setMessages((prev) => [...prev, { role: "bot", text: botText }]);
      }
    } catch {
      // Rechazo de la server function: error de red, timeout (AbortError), etc.
      setMessages((prev) => [...prev, { role: "bot", text: STRINGS.error }]);
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 print:hidden">
      {isOpen && (
        <div
          role="dialog"
          aria-label={STRINGS.title}
          className="chat-panel-enter flex h-[min(70vh,30rem)] w-[min(92vw,23rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <span className="font-medium">{STRINGS.title}</span>
            <button
              type="button"
              onClick={handleClose}
              aria-label={STRINGS.close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4 text-sm">
            <ChatBubble role="bot" text={STRINGS.greeting} />
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} text={m.text} />
            ))}
            {isSending && (
              <p className="text-xs italic text-muted-foreground" aria-live="polite">
                {STRINGS.sending}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Entrada */}
          <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={STRINGS.placeholder}
              aria-label={STRINGS.placeholder}
              disabled={isSending}
              maxLength={1000}
              className="bg-background"
            />
            <Button
              type="button"
              size="icon"
              onClick={sendMessage}
              disabled={isSending || input.trim() === ""}
              aria-label={STRINGS.send}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Lanzador flotante */}
      <Button
        type="button"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label={STRINGS.launcher}
        aria-expanded={isOpen}
        className={cn(
          // [&_svg]:!size-6 gana al [&_svg]:size-4 del buttonVariants (icono
          // proporcionado al lanzador de 3.5rem, no 1rem).
          "h-14 w-14 rounded-full shadow-lg [&_svg]:!size-6",
          isOpen && "hidden",
          // Rebote periodico para recordar que el chat esta ahi (solo cerrado).
          !isOpen && "chat-bounce",
        )}
      >
        <MessageCircle />
      </Button>
    </div>
  );
}

function ChatBubble({ role, text }: Message) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <span
        className={cn(
          "inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {text}
      </span>
    </div>
  );
}
