import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import {
  Users, Compass, Briefcase, GraduationCap, Search, Sparkles,
  Megaphone, Accessibility, UserCheck, BookOpen, FileText, ArrowRight, Building2, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { sendSportello } from "@/lib/api/sportello.functions";

export const Route = createFileRoute("/apl")({
  head: () => ({
    meta: [
      { title: "Agenzia per il Lavoro APL – UAI-UTCS" },
      { name: "description", content: "L'APL UAI-UTCS: orientamento, tirocini, incontro domanda/offerta, autoimpiego, servizi Eures e inserimento mirato disabilità." },
      { property: "og:title", content: "APL – Agenzia per il Lavoro UAI-UTCS" },
      { property: "og:description", content: "Servizi accreditati per il lavoro e l'inserimento professionale." },
      ogUrl("/apl"),
    ],
    links: [canonical("/apl")],
  }),
  component: APLPage,
});

const SERVICES = [
  { icon: Users, title: "Accoglienza", text: "Primo contatto e analisi del bisogno." },
  { icon: Compass, title: "Orientamento professionale", text: "Percorsi per definire un progetto di carriera." },
  { icon: Briefcase, title: "Accompagnamento al lavoro", text: "Supporto continuo nella ricerca di impiego." },
  { icon: GraduationCap, title: "Tirocinio formativo", text: "Esperienze in azienda con tutoring dedicato." },
  { icon: Search, title: "Incontro domanda/offerta", text: "Matching tra candidati e imprese del territorio." },
  { icon: Sparkles, title: "Autoimpiego", text: "Supporto per chi vuole avviare un'attività in proprio." },
  { icon: Megaphone, title: "Offerte di Lavoro", text: "Pubblicazione sul SIISL per accedere agli incentivi." },
  { icon: Accessibility, title: "Inserimento mirato disabilità", text: "Percorsi dedicati alla L. 68/99." },
  { icon: UserCheck, title: "Fatti notare dalle Aziende", text: "Candidati e pubblica il tuo Curriculum." },
  { icon: Globe, title: "Tirocini extra UE", text: "Incentivi per Aziende e opportunità per immigrati." },
  { icon: BookOpen, title: "Iniziative formative", text: "Corsi su misura per riqualificarsi." },
  { icon: FileText, title: "DID e pratiche", text: "Gestione DID e pratiche amministrative." },
];

function APLPage() {
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      await sendSportello({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          city: String(fd.get("city") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          message: String(fd.get("message") ?? ""),
          website: String(fd.get("website") ?? ""), // honeypot
        },
      });
      form.reset();
      setConsent(false);
      toast.success("Richiesta inviata!", { description: "Ti ricontatteremo a breve." });
    } catch {
      toast.error("Invio non riuscito", { description: "Riprova più tardi." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Agenzia per il Lavoro"
        title="Connettiamo persone, imprese e opportunità"
        description="L'APL UAI-UTCS è il presidio accreditato dal Ministero del Lavoro che gestisce orientamento, tirocini e ricerca attiva di impiego sul territorio nazionale."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/notizie">
              <Search className="mr-2 h-4 w-4" /> Trova l'offerta di lavoro per te
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#sportello">Apri il tuo sportello APL!</a>
          </Button>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-headline font-bold">Quali servizi sono disponibili presso le nostre sedi APL?</h2>
          <p className="mt-4 text-muted-foreground lg:text-lg">
            I nostri uffici offrono un servizio integrato di accoglienza, orientamento
            e collocamento per lavoratori e imprese.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sportello APL */}
      <section id="sportello" className="bg-surface border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              <Building2 className="h-3 w-3" /> Diventa sportello
            </div>
            <h2 className="mt-5 text-headline font-bold">Apri il tuo sportello APL!</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Vuoi diventare un punto di riferimento per il lavoro nel tuo territorio?
              Affiliati alla rete APL UAI-UTCS: ti forniremo formazione, software gestionale,
              materiali e supporto continuo per offrire servizi accreditati nella tua zona.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Formazione completa per gli operatori", "Accesso alla rete nazionale di imprese", "Software e procedure standardizzate", "Marchio e visibilità su tutto il territorio"].map((it) => (
                <li key={it} className="flex items-center gap-2 text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {it}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-background p-8 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-xl font-semibold">Richiedi informazioni</h3>
            <p className="mt-2 text-sm text-muted-foreground">Compila i dati: ti contatteremo entro 48 ore.</p>
            <form
              className="mt-6 space-y-4"
              onSubmit={handleSubmit}
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome e cognome <span className="text-accent">*</span>
                </span>
                <input
                  name="name"
                  required
                  maxLength={200}
                  autoComplete="name"
                  className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email <span className="text-accent">*</span>
                </span>
                <input
                  name="email"
                  required
                  type="email"
                  maxLength={200}
                  autoComplete="email"
                  className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Città <span className="text-accent">*</span>
                </span>
                <input
                  name="city"
                  required
                  maxLength={100}
                  autoComplete="address-level2"
                  className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Telefono <span className="text-accent">*</span>
                </span>
                <input
                  name="phone"
                  required
                  type="tel"
                  maxLength={60}
                  autoComplete="tel"
                  className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Messaggio (facoltativo)
                </span>
                <textarea
                  name="message"
                  maxLength={5000}
                  rows={4}
                  className="w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
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
              <Button
                type="submit"
                disabled={submitting || !consent}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Invio in corso…" : "Invia richiesta"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Offerte */}
      <section id="offerte" className="mx-auto max-w-7xl px-4 py-20 lg:px-8 scroll-mt-24">
        <div
          className="overflow-hidden rounded-3xl p-10 lg:p-16 text-background relative"
          style={{ background: "var(--gradient-italia)" }}
        >
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-background/10 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <h2 className="text-headline font-bold">Trova l'offerta di lavoro per te</h2>
            <p className="mt-4 text-background/90 text-lg">
              Consulta le posizioni aperte presso le aziende partner della nostra rete.
            </p>
            <Button asChild size="lg" className="mt-8 bg-background text-foreground hover:bg-background/90">
              <Link to="/notizie">
                Vai alle offerte attive <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}