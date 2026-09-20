import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ExternalLink, GraduationCap, ArrowRight } from "lucide-react";
import { FORMAZIONE_TYPES } from "@/lib/formazione";

export const Route = createFileRoute("/formazione/")({
  head: () => ({
    meta: [
      { title: "Formazione – UAI-UTCS" },
      { name: "description", content: "E-learning, formazione aziendale, formazione finanziata, corsi in FAD: tutte le opportunità formative dell'ecosistema UAI-UTCS." },
      { property: "og:title", content: "Formazione – UAI-UTCS" },
      { property: "og:description", content: "Corsi e percorsi formativi per imprese e lavoratori." },
      ogUrl("/formazione"),
    ],
    links: [canonical("/formazione")],
  }),
  component: FormazionePage,
});

const PARTNERS = [
  {
    name: "Fondo Conoscenza",
    desc: "Fondo interprofessionale per la formazione continua.",
    logo: "/images/logo_fondo_conoscenza.png",
    href: "https://www.fondoconoscenza.it",
  },
  {
    name: "EFESTO",
    desc: "Partner per la formazione professionale e i percorsi finanziati.",
    logo: "/images/logo-efesto.png",
    href: "https://example.com",
  },
  {
    name: "Centro Studi Tesla",
    desc: "Centro studi e ricerche tecniche.",
    logo: "/images/logo-centro-studi-tesla.png",
    href: "https://www.centrostuditesla.it/",
  },
];

function FormazionePage() {
  return (
    <>
      <PageHero
        eyebrow="Formazione"
        title="Crescere è la migliore strategia di impresa"
        description="Quattro modalità formative integrate per rispondere a ogni esigenza: dall'obbligo normativo allo sviluppo delle competenze del tuo team."
      />

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {FORMAZIONE_TYPES.map((t) => (
            <div
              key={t.slug}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all hover:shadow-[var(--shadow-elegant)] hover:border-primary/40"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <t.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold">{t.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{t.text}</p>
              <Button asChild variant="ghost" className="mt-5 px-0 hover:bg-transparent hover:text-primary">
                <Link to="/formazione/$slug" params={{ slug: t.slug }}>
                  Vedi dettagli <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="flex items-start gap-4 max-w-2xl">
            <GraduationCap className="h-8 w-8 text-primary shrink-0 mt-1" />
            <div>
              <h2 className="text-headline font-bold">Piattaforme e siti istituzionali</h2>
              <p className="mt-3 text-muted-foreground">
                Collegamenti diretti ai portali di formazione del nostro ecosistema.
              </p>
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PARTNERS.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/40"
              >
                <img
                  src={p.logo}
                  alt={p.name}
                  className="h-10 w-auto max-w-[96px] shrink-0 object-contain"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
