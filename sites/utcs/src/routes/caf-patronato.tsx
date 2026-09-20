import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/caf-patronato")({
  head: () => ({
    meta: [
      { title: "CAF e Patronato – UAI-UTCS" },
      { name: "description", content: "Servizi CAF (730, ISEE, Detrazioni, UNICO) e Patronato (disoccupazione, NASpI, pensioni, invalidità) presso UAI-UTCS." },
      { property: "og:title", content: "CAF e Patronato – UAI-UTCS" },
      { property: "og:description", content: "Pratiche fiscali e previdenziali al servizio dei cittadini." },
      ogUrl("/caf-patronato"),
    ],
    links: [canonical("/caf-patronato")],
  }),
  component: CafPatronatoPage,
});

const CAF = [
  { code: "730", title: "Modello 730", text: "Dichiarazione dei redditi per dipendenti e pensionati con liquidazione diretta in busta paga." },
  { code: "ISEE", title: "Modello ISEE", text: "Calcolo dell'indicatore della situazione economica equivalente per accedere a prestazioni agevolate." },
  { code: "DETR.", title: "Modello Detrazioni", text: "Gestione delle detrazioni d'imposta e dei carichi familiari." },
  { code: "UNICO", title: "Modello UNICO", text: "Dichiarazione dei redditi per titolari di partita IVA e contribuenti complessi." },
];

const PATRONATO = [
  { title: "Domande disoccupazione agricole", text: "Indennità per lavoratori del settore agricolo." },
  { title: "NASpI e Dis-coll", text: "Indennità mensile di disoccupazione per lavoratori dipendenti e collaboratori." },
  { title: "Pensioni", text: "Pratiche di pensione di vecchiaia, anticipata, di reversibilità, supplementare." },
  { title: "Prestazioni e Sostegno al Reddito", text: "Assegno unico, bonus, indennità integrative al reddito." },
  { title: "Invalidità e Protezione", text: "Riconoscimento invalidità civile, L. 104, accompagnamento e tutele." },
  { title: "Inail", text: "Rendite, infortuni e malattie professionali." },
  { title: "SFL", text: "Supporto per la formazione e il lavoro." },
  { title: "ADI", text: "Assegno di inclusione." },
];

function CafPatronatoPage() {
  return (
    <>
      <PageHero
        eyebrow="CAF & Patronato"
        title="Pratiche fiscali e previdenziali, gestite con competenza"
        description="Il nostro CAF e il Patronato UAI-UTCS ti accompagnano in ogni adempimento, dalla dichiarazione dei redditi alle pratiche previdenziali."
      />

      {/* CAF */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors duration-300 hover:bg-primary hover:text-primary-foreground">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Centro di Assistenza Fiscale</div>
            <h2 className="text-headline font-bold">CAF</h2>
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {CAF.map((c) => (
            <div key={c.code} className="flex gap-5 rounded-2xl border border-border bg-surface p-6">
              <div className="font-display text-2xl font-bold text-primary shrink-0 min-w-16">{c.code}</div>
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/contatti">Richiedi più informazioni <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Patronato */}
      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors duration-300 hover:bg-primary hover:text-primary-foreground">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Previdenza & Assistenza</div>
              <h2 className="text-headline font-bold">Patronato</h2>
            </div>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PATRONATO.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border bg-background p-6">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/contatti">Richiedi più informazioni <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}