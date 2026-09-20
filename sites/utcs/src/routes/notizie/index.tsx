import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  FileText,
  Briefcase,
  UserSearch,
  Calendar,
  ArrowRight,
  Paperclip,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendCandidatura } from "@/lib/api/candidatura.functions";
import { getNotizie } from "@/lib/api/notizie.functions";
import { canonical, ogUrl, ldJson, itemListSchema } from "@/lib/seo";

export const Route = createFileRoute("/notizie/")({
  head: ({ loaderData }) => ({
    meta: [
      { title: "Notizie e Bandi – UAI-UTCS" },
      {
        name: "description",
        content:
          "Avvisi, bandi pubblici, offerte di lavoro attive e sezione per chi è in cerca di occupazione.",
      },
      { property: "og:title", content: "Notizie e Bandi – UAI-UTCS" },
      { property: "og:description", content: "Tutte le novità dell'Associazione UAI-UTCS." },
      ogUrl("/notizie"),
      // ItemList con avvisi/bandi attuali (datos cargados por el loader).
      ldJson(
        itemListSchema(
          (loaderData?.avvisi ?? []).map((a) => ({ name: a.title, url: a.link })),
        ),
      ),
    ],
    links: [canonical("/notizie")],
  }),
  loader: () => getNotizie(),
  component: NotiziePage,
});

// Mensaje genérico pre-rellenado al candidarse a una oferta concreta. El usuario
// puede editarlo: es solo un punto de partida.
function candidaturaMessage(role: string, city: string) {
  return `Salve, sono interessato/a all'offerta di lavoro che ho visto sul vostro sito per ${role} nella città di ${city} e vorrei avere più informazioni. In allegato vi lascio il mio CV. Grazie.`;
}

function NotiziePage() {
  const { avvisi, offerte } = Route.useLoaderData();
  // `nonce` cambia en cada clic de "Candidati" para re-aplicar el prefill aunque
  // se reclique la misma oferta.
  const [prefill, setPrefill] = useState({ text: "", nonce: 0 });

  return (
    <>
      <PageHero
        eyebrow="Notizie"
        title="Avvisi, bandi e opportunità"
        description="Resta aggiornato sulle ultime novità dell'associazione, sui bandi pubblici attivi e sulle offerte di lavoro della nostra rete."
      />

      <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 space-y-20">
        {/* Avvisi */}
        <section>
          <SectionTitle icon={Megaphone} title="Avvisi e bandi" />
          {avvisi.length === 0 ? (
            <p className="mt-8 text-muted-foreground">Al momento non ci sono avvisi.</p>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {avvisi.map((a, i) => (
                <article
                  key={i}
                  className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-primary-soft text-primary hover:bg-primary-soft border-0">
                      {a.tag}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {a.date}
                    </div>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.text}</p>
                  {a.link && (
                    <a
                      href={a.link}
                      target="_blank"
                      rel="noreferrer"
                      className="tap-44 mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
                    >
                      Leggi tutto <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Offerte di lavoro */}
        <section>
          <SectionTitle
            icon={Briefcase}
            title="Offerte di lavoro attive"
            subtitle="Posizioni aperte gestite tramite la nostra APL"
          />
          {offerte.length === 0 ? (
            <p className="mt-8 text-muted-foreground">Nessuna offerta attiva al momento.</p>
          ) : (
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-background">
              <div className="divide-y divide-border">
                {offerte.map((o, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-surface"
                  >
                    <div>
                      <div className="font-semibold">{o.role}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {o.city} · {o.type}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="tap-44"
                      onClick={() => {
                        setPrefill((p) => ({
                          text: candidaturaMessage(o.role, o.city),
                          nonce: p.nonce + 1,
                        }));
                        document
                          .getElementById("candidatura")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Candidati <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Candidatura spontanea */}
        <section id="candidatura" className="scroll-mt-24">
          <SectionTitle
            icon={UserSearch}
            title="In cerca di lavoro?"
            subtitle="Lascia la tua candidatura spontanea: il tuo profilo verrà valutato da uno dei nostri consulenti."
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-5 lg:items-start">
            <div className="lg:col-span-2">
              <p className="text-muted-foreground leading-relaxed">
                Inviaci i tuoi dati e il tuo curriculum: lo inseriremo nella nostra banca dati e ti
                contatteremo quando ci sarà un'opportunità in linea con le tue competenze.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" /> Formati ammessi: PDF o DOCX
                  (max 5 MB)
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" /> I tuoi dati sono trattati
                  secondo il GDPR
                </li>
              </ul>
              <img
                src="/images/ricerca-lavoro.webp"
                alt="Persona in cerca di lavoro"
                className="mt-8 w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
            <div className="lg:col-span-3 lg:mt-32">
              <CandidaturaForm prefill={prefill} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

function CandidaturaForm({ prefill }: { prefill: { text: string; nonce: number } }) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const MAX_BYTES = 5 * 1024 * 1024;

  // Al candidarse a una oferta concreta (clic en "Candidati"), pre-rellena el
  // mensaje y enfoca el campo. El guard evita disparar en el montaje inicial.
  useEffect(() => {
    if (!prefill.nonce) return;
    setMessage(prefill.text);
    setSent(false);
    messageRef.current?.focus({ preventScroll: true });
  }, [prefill]);

  function validateFile(file: File | null): string | null {
    if (!file || file.size === 0) return "Allega il tuo curriculum.";
    if (file.size > MAX_BYTES) return "Il file supera i 5 MB.";
    if (!/\.(pdf|docx)$/i.test(file.name)) return "Formato non valido: solo PDF o DOCX.";
    return null;
  }

  // Refleja el archivo seleccionado (por clic o por drop) en el estado del form.
  function applyFile(file: File | null) {
    setFileName(file ? file.name : null);
    setError(file ? validateFile(file) : null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    // Asignamos el archivo soltado al input real para que viaje en new FormData(form).
    if (fileInputRef.current) fileInputRef.current.files = e.dataTransfer.files;
    applyFile(file);
  }

  // Quita el archivo cargado y limpia el input real.
  function clearFile() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileName(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const cv = fd.get("cv");
    const fileErr = validateFile(cv instanceof File ? cv : null);
    if (fileErr) {
      setError(fileErr);
      return;
    }

    setSubmitting(true);
    try {
      await sendCandidatura({ data: fd });
      form.reset();
      setConsent(false);
      setFileName(null);
      setMessage("");
      setSent(true);
    } catch {
      setError("Non è stato possibile inviare la candidatura. Riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="mt-5 text-2xl font-bold">Candidatura inviata!</h3>
        <p className="mt-2 text-muted-foreground">
          Grazie. Il tuo profilo è stato ricevuto: ti contatteremo per eventuali opportunità.
        </p>
        <Button
          onClick={() => setSent(false)}
          className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Invia un'altra candidatura
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-background p-8 shadow-[var(--shadow-soft)] space-y-5"
    >
      <h3 className="font-display text-xl font-semibold">Lascia la tua candidatura</h3>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nome e cognome <span className="text-accent">*</span>
        </span>
        <input name="name" required maxLength={200} className={INPUT_CLASS} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Email <span className="text-accent">*</span>
        </span>
        <input name="email" type="email" required maxLength={200} className={INPUT_CLASS} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Messaggio <span className="text-accent">*</span>
        </span>
        <textarea
          ref={messageRef}
          name="message"
          required
          maxLength={5000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${INPUT_CLASS} resize-none`}
          placeholder="Presentati in breve: esperienza, ruolo cercato, disponibilità."
        />
      </label>

      <div className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Curriculum (PDF o DOCX) <span className="text-accent">*</span>
        </span>
        <div className="flex items-center gap-2">
          <label
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors ${
              dragActive
                ? "border-primary bg-primary-soft"
                : "border-input bg-surface hover:border-primary"
            }`}
          >
            <Paperclip className="h-4 w-4 shrink-0 text-primary" />
            <span className={`truncate ${fileName ? "text-foreground" : "text-muted-foreground"}`}>
              {fileName ??
                (dragActive ? "Rilascia il file qui…" : "Trascina qui il file o scegli…")}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              name="cv"
              required
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          {fileName && (
            <button
              type="button"
              onClick={clearFile}
              aria-label="Rimuovi il file"
              title="Rimuovi il file"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Honeypot anti-spam: oculto para humanos, los bots lo rellenan. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <label className="flex items-start gap-3 text-xs text-muted-foreground">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        Acconsento al trattamento dei dati personali ai sensi del GDPR.
      </label>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={submitting || !consent}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Invio in corso…" : "Invia candidatura"}
      </Button>
    </form>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Megaphone;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold lg:text-3xl">{title}</h2>
      </div>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
