import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { VALUE_ILLUSTRATIONS } from "@/components/site/ValueIllustrations";

export const Route = createFileRoute("/chi-siamo")({
  head: () => ({
    meta: [
      { title: "Chi Siamo – UAI-UTCS Unione Turismo Commercio Servizi" },
      {
        name: "description",
        content:
          "La storia di UAI-UTCS dal 1990 ad oggi: dall'ecosistema UAI alla sede nazionale UAI-UTCS. Valori democratici, missione e visione.",
      },
      { property: "og:title", content: "Chi Siamo – UAI-UTCS" },
      {
        property: "og:description",
        content: "Una storia di rappresentanza al servizio delle PMI italiane.",
      },
      ogUrl("/chi-siamo"),
    ],
    links: [canonical("/chi-siamo")],
  }),
  component: ChiSiamoPage,
});

type TimelineItem = {
  year: string;
  title: string;
  text: string;
  highlight?: boolean;
};

const TIMELINE: TimelineItem[] = [
  {
    year: "1990",
    title: "Nasce UAI a Roma",
    text: "Viene fondata a livello nazionale l'Unione Artigiani Italiani (UAI): la Confederazione matrice che rappresenta le piccole e medie imprese, dalla quale prenderanno vita le sedi su tutto il territorio.",
  },
  {
    year: "2005",
    title: "Accreditamento Regionale, CAF e Patronato",
    text: "Con il riconoscimento Ministeriale, UAI amplia i propri servizi integrando al CAF per la gestione delle pratiche fiscali (730, ISEE, RED) e il Patronato per l'assistenza previdenziale e sociale.",
  },
  {
    year: "2016",
    title: "Sede Nazionale UAI-UTCS",
    text: "Viene istituita la UAI-UTCS nazionale, un traguardo fondamentale che consolida la presenza strategica dell'organizzazione a livello centralizzato. La nuova struttura diventa il punto di riferimento per l'assistenza sulla contrattazione collettiva (CCNL), ottenendo i prestigiosi accreditamenti dal Ministero del Lavoro e all'INPS.",
    highlight: true,
  },
  {
    year: "Oggi",
    title: "Una rete in crescita",
    text: "UAI-UTCS si conferma una rete nazionale che cresce, si accredita, si rafforza dal CAF e Patronato all'Agenzia per il Lavoro, dalla formazione finanziata alla contrattazione Collettiva. Un unico interlocutore che trasforma la burocrazia in soluzioni, la formazione in crescita, la tutela accanto all'impresa. Con servizi concreti e partner di eccellenza.",
  },
];

const VALUES = [
  {
    illustration: VALUE_ILLUSTRATIONS.democrazia,
    title: "Democrazia",
    text: "Ascolto delle basi e processi partecipativi nelle decisioni associative.",
  },
  {
    illustration: VALUE_ILLUSTRATIONS.solidarieta,
    title: "Solidarietà",
    text: "Sostegno reciproco tra associati e tutela dei lavoratori del settore.",
  },
  {
    illustration: VALUE_ILLUSTRATIONS.competenza,
    title: "Competenza",
    text: "Servizi specialistici garantiti da consulenti accreditati e qualificati.",
  },
  {
    illustration: VALUE_ILLUSTRATIONS.territorio,
    title: "Territorio",
    text: "Presenza locale e relazione diretta con le imprese italiane.",
  },
];

function ChiSiamoPage() {
  return (
    <>
      <PageHero
        eyebrow="Chi Siamo"
        title="Una storia di rappresentanza al servizio delle imprese italiane"
        description="Dal 1990 l'ecosistema UAI-UTCS è la voce delle PMI di turismo, commercio e servizi. Un percorso di crescita, accreditamenti e servizi sempre al fianco di chi lavora."
      />

      {/* Timeline */}
      <section className="mx-auto max-w-5xl px-4 py-20 lg:px-8">
        <div className="relative">
          <div
            className="absolute left-4 top-0 bottom-0 w-px bg-border lg:left-1/2"
            aria-hidden="true"
          />
          <div className="space-y-12">
            {TIMELINE.map((t, i) => (
              <div
                key={t.year}
                className={`relative grid gap-6 lg:grid-cols-2 lg:gap-12 ${
                  i % 2 === 0 ? "" : "lg:[direction:rtl]"
                }`}
              >
                <div
                  className={`pl-12 lg:pl-0 ${i % 2 === 0 ? "lg:pr-12 lg:text-right" : "lg:pl-12 lg:[direction:ltr]"}`}
                >
                  <div
                    className={`absolute left-0 top-2 flex items-center justify-center rounded-full text-background font-bold lg:left-1/2 lg:-translate-x-1/2 ${
                      t.highlight
                        ? "h-12 w-12 text-base ring-4 ring-accent-soft"
                        : "h-8 w-8 text-xs"
                    }`}
                    style={{ background: t.highlight ? "var(--accent)" : "var(--primary)" }}
                  >
                    {i + 1}
                  </div>
                  <div className="font-display text-4xl font-bold text-primary">{t.year}</div>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{t.title}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed lg:[direction:ltr]">
                    {t.text}
                  </p>
                </div>
                <div />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valori */}
      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
              I nostri valori
            </div>
            <h2 className="mt-5 text-headline font-bold">
              Principi democratici e visione di crescita
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="group rounded-2xl border border-border bg-background p-7 text-center transition duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)] motion-safe:hover:-translate-y-1.5"
              >
                <v.illustration className="mx-auto h-24 w-24 transition-transform duration-300 ease-out motion-safe:group-hover:scale-110" />
                <h3 className="mt-5 font-display text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Come possiamo aiutarti */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="rounded-3xl border border-border bg-surface p-10 lg:p-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-headline font-bold">Come possiamo aiutarti</h2>
              <p className="mt-4 text-muted-foreground lg:text-lg leading-relaxed">
                In UAI-UTCS supportiamo concretamente la tua attività: dalla consulenza creditizia e
                finanziaria all'assistenza sindacale, dalla formazione obbligatoria e finanziata
                alla gestione delle pratiche fiscali e previdenziali. Un unico interlocutore per
                ogni esigenza della tua impresa.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/registrati">
                  Affiliati ora <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ul className="space-y-3">
              {[
                "Consulenza creditizia per accedere a finanziamenti agevolati",
                "Pratiche CAF e Patronato per la tua azienda e i tuoi dipendenti",
                "Tirocini formativi e ricerca personale tramite la nostra APL",
                "Corsi di formazione obbligatoria e finanziata",
                "Convenzioni esclusive con partner di eccellenza",
                "Assistenza legale e sindacale dedicata",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl bg-background p-4 border border-border"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    ✓
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
