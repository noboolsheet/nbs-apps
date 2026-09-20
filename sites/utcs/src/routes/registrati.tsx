import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Check, Download, FileText, UserPlus, Users, FileMinus, Sprout, Briefcase } from "lucide-react";

export const Route = createFileRoute("/registrati")({
  head: () => ({
    meta: [
      { title: "Registrati – UAI-UTCS" },
      { name: "description", content: "Diventa associato UAI-UTCS. Compila il modulo digitale di adesione per imprese e autonomi del turismo, commercio e servizi." },
      { property: "og:title", content: "Registrati – UAI-UTCS" },
      { property: "og:description", content: "Adesione digitale all'Associazione Nazionale UAI-UTCS." },
      ogUrl("/registrati"),
    ],
    links: [canonical("/registrati")],
  }),
  component: RegistratiPage,
});

const BENEFITS = [
  "Accesso a servizi sindacali, CAF e Patronato",
  "Consulenza creditizia e finanziaria dedicata",
  "Corsi di formazione gratuiti o finanziati",
  "Convenzioni esclusive con partner di eccellenza",
  "Assistenza legale e contrattuale per CCNL",
  "Rete nazionale e visibilità per la tua impresa",
];

const MODULES = [
  {
    group: "adesione" as const,
    title: "Adesione Artigiani e Commercianti",
    desc: "Modulo di iscrizione per artigiani, commercianti e piccole imprese.",
    icon: Briefcase,
    file: "/documents/1_ADESIONE_UAI_ART_COM_ALLEGATO_B.pdf",
  },
  {
    group: "adesione" as const,
    title: "Adesione Aziende Agricoltura, IAP e C.D.",
    desc: "Per aziende agricole, Imprenditori Agricoli Professionali e Coltivatori Diretti.",
    icon: Sprout,
    file: "/documents/2_ADESIONE_UAI_AGRICOLRURA_4.pdf",
  },
  {
    group: "adesione" as const,
    title: "Adesione Pensionati",
    desc: "Modulo dedicato ai pensionati che vogliono aderire all'associazione.",
    icon: Users,
    file: "/documents/3_DELEGA_UAI_PENSIONATI.pdf",
  },
  {
    group: "revoca" as const,
    title: "Revoca altre Associazioni — Art. e Com.",
    desc: "Revoca della delega ad altre associazioni di artigiani e commercianti.",
    icon: FileMinus,
    file: "/documents/4_REVOCA_ALTRE_-ASSOCIAZIONI_ART_COM.pdf",
  },
  {
    group: "revoca" as const,
    title: "Revoca altre Associazioni Agricole",
    desc: "Revoca della delega ad altre associazioni del settore agricolo.",
    icon: FileMinus,
    file: "/documents/5_REVOCA_ALTRE_ASSOCIAZIONI_IN_AGRICOLUTRA.pdf",
  },
  {
    group: "revoca" as const,
    title: "Revoca altre Associazioni Pensionati",
    desc: "Revoca della delega ad altre associazioni di pensionati.",
    icon: FileMinus,
    file: "/documents/6_REVOCA_ALTRO_SINDACATO_PENSIONATI.pdf",
  },
];

function RegistratiPage() {
  return (
    <>
      <PageHero
        eyebrow="Affiliati"
        title="Diventa parte della comunità UAI-UTCS"
        description="Scarica il modulo PDF più adatto alla tua categoria, compilalo e invialo via email a demo@example.com."
      />

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3 lg:items-start">
          <aside className="lg:col-span-1 lg:sticky lg:top-24">
            <h2 className="text-headline font-bold">Perché unirsi a UAI-UTCS?</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Aderire a UAI-UTCS significa entrare in una rete nazionale solida e accreditata,
              con accesso immediato a servizi e consulenze pensate per il tuo settore.
            </p>
            <ul className="mt-8 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="h-4 w-4 text-primary" /> Hai bisogno di aiuto?
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                I nostri consulenti sono a disposizione per guidarti nella compilazione e nella scelta del modulo corretto.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <a href="/contatti">Contatta un consulente</a>
              </Button>
            </div>
          </aside>

          <div className="lg:col-span-2 space-y-10">
            {(["adesione", "revoca"] as const).map((group) => (
              <div key={group}>
                <div className="flex items-center gap-3 mb-5">
                  <h3 className="font-display text-2xl font-semibold">
                    {group === "adesione" ? "Moduli di Adesione" : "Moduli di Revoca"}
                  </h3>
                  <span
                    className="h-px flex-1"
                    style={{ background: "var(--gradient-italia)" }}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {MODULES.filter((m) => m.group === group).map((m) => (
                    <div
                      key={m.title}
                      className="group flex flex-col rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                          <m.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground leading-snug">{m.title}</h4>
                          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-border">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" /> PDF · Modulo ufficiale
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="tap-44 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <a href={m.file} target="_blank" rel="noreferrer">
                            <Download className="mr-1.5 h-4 w-4" /> Scarica
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}