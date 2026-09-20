import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { ExternalLink, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/convenzioni")({
  head: () => ({
    meta: [
      { title: "Convenzioni – UAI-UTCS" },
      {
        name: "description",
        content:
          "I partner ufficiali UAI-UTCS e le convenzioni esclusive riservate agli associati: Workservice, Up Day, Banca Mediolanum e molti altri.",
      },
      { property: "og:title", content: "Convenzioni – UAI-UTCS" },
      {
        property: "og:description",
        content: "Vantaggi esclusivi grazie alla nostra rete di partner certificati.",
      },
      ogUrl("/convenzioni"),
    ],
    links: [canonical("/convenzioni")],
  }),
  component: ConvenzioniPage,
});

type Partner = {
  name: string;
  desc: string;
  logo: string;
  color: string;
  href?: string;
  to?: string;
};

const PARTNERS: Partner[] = [
  {
    name: "Workservice",
    desc: "Workservice è un leader strategico nella gestione dei dati contabili e nell'elaborazione delle buste paga. Il suo vantaggio principale risiede in una piattaforma digitale completamente automatizzata, intuitiva e accessibile, che semplifica le attività amministrative complesse per ogni tipo di utente. Attraverso questa partnership, le nostre aziende associate accedono a soluzioni operative all'avanguardia, supportate da una consulenza contrattuale d'eccellenza e da un'assistenza integrale nei rapporti con gli istituti ufficiali.",
    logo: "/images/logo-workservice.png",
    color: "#404040",
    to: "/",
  },
  {
    name: "Up Day",
    desc: "Up Day è un'azienda specializzata nella gestione di piani di welfare aziendale e benefit aziendali per i dipendenti. La sua principale forza è la progettazione su misura di soluzioni motivazionali come buoni pasto e buoni carburante, che aumentano la soddisfazione lavorativa e ottimizzano le risorse fiscali. Grazie a questo accordo, gli associati beneficiano di condizioni commerciali altamente competitive, che includono significativi sconti diretti e l'azzeramento totale delle spese di spedizione.",
    logo: "/images/logo_upday.png",
    color: "#F39200",
    href: "https://www.day.it/",
  },
  {
    name: "Banca Mediolanum",
    desc: "Banca Mediolanum è una prestigiosa istituzione finanziaria che offre un ecosistema completo di soluzioni bancarie e assicurative. Si distingue per una gestione patrimoniale altamente efficiente attraverso conti operativi, mutui personalizzati e polizze dedicate a ogni profilo. La nostra collaborazione strategica garantisce ai membri un accesso immediato a vantaggi economici esclusivi, esenzioni temporanee dai canoni e tariffe preferenziali progettate per dare slancio ai loro progetti.",
    logo: "/images/logo-mediolanum.png",
    color: "#14387F",
    href: "https://www.bancamediolanum.it/",
  },
  {
    name: "Fondo Conoscenza",
    desc: "Fondo Conoscenza è un consolidato fondo paritetico interprofessionale focalizzato sullo sviluppo del capitale umano. Il suo servizio principale consente alle imprese di formare continuamente i propri dipendenti in qualsiasi settore produttivo. Il grande vantaggio di questa partnership è la possibilità di finanziare programmi formativi specializzati a costo zero per il datore di lavoro, canalizzando in modo efficiente i contributi obbligatori ordinari che vengono già versati abitualmente.",
    logo: "/images/logo_fondo_conoscenza.png",
    color: "#E07E50",
    href: "https://www.fondoconoscenza.it/",
  },
  {
    name: "Efesto",
    desc: "Efesto è un organismo europeo di formazione e orientamento focalizzato sul rafforzamento del tessuto aziendale. L'ente si specializza nell'affiancare manager e professionisti nei complessi processi di passaggio generazionale e nella formazione continua avanzata. Attraverso questa alleanza strategica, promuoviamo la competitività e la continuità delle imprese, sostenendo attivamente il merito giovanile mediante l'erogazione di borse di studio e corsi di formazione gratuiti.",
    logo: "/images/logo-efesto.png",
    color: "#6FA32E",
    href: "https://example.com",
  },
  {
    name: "Easy Life",
    desc: "Easy Life esprime una solida realtà educativa specializzata nel potenziare le capacità individuali attraverso un metodo di apprendimento innovativo. In qualità di centro accreditato Cambridge, offre certificazioni ufficiali di lingue, informatica e accesso a percorsi di laurea online con risultati misurabili. L'accordo con questa scuola di metodo offre al nostro collettivo un contesto formativo d'eccellenza per raggiungere una realizzazione professionale superiore.",
    logo: "/images/logo-easy-life.png",
    color: "#E2231A",
    href: "https://www.easy-life.com/",
  },
  {
    name: "Axis Italy",
    desc: "Axis Italy è un punto di riferimento per la mobilità aziendale, specializzato nel noleggio a breve e lungo termine di veicoli commerciali e privati. La sua proposta di valore si basa su una consulenza tecnica che progetta flotte su misura e su un servizio a canone mensile unico tutto compreso. Questa cooperazione strategica permette ai nostri associati di rinnovare la propria mobilità con sconti esclusivi, azzerando i rischi finanziari grazie a coperture integrali e assistenza continua.",
    logo: "/images/logo_axis.png",
    color: "#2AA8E0",
    href: "https://www.axisitaly.com/",
  },
  {
    name: "Verifiche Italia Srl",
    desc: "Verifiche Italia è un'entità tecnica specializzata nell'ispezione e nel controllo di sicurezza degli impianti elettrici. La sua attività principale comprende gli audit di protezione, le verifiche dei sistemi di messa a terra e le certificazioni ai sensi delle normative vigenti. La partnership con questo partner garantisce ai membri della nostra rete un accesso diretto e preferenziale a tecnici qualificati, assicurando un rigoroso rispetto normativo e una totale tranquillità operativa.",
    logo: "/images/Logo_VerificheItalia.png",
    color: "#1B75BC",
    href: "https://www.verificheitalia.com/",
  },
  {
    name: "Centro Studi Tesla",
    desc: "Centro Studi Tesla è un istituto leader nel settore dell'istruzione a distanza che collabora con le principali università telematiche. La sua offerta accademica comprende corsi di laurea, master ufficiali e corsi di perfezionamento professionale accessibili da qualsiasi luogo. Attraverso questa convenzione, offriamo alla nostra comunità un accesso privilegiato e fortemente agevolato a una formazione flessibile, orientata al successo lavorativo e alla massima valorizzazione del potenziale.",
    logo: "/images/logo-centro-studi-tesla.png",
    color: "#34488A",
    href: "https://www.centrostuditesla.it/",
  },
];

function ConvenzioniPage() {
  return (
    <>
      <PageHero
        eyebrow="Convenzioni"
        title="Vantaggi esclusivi per i nostri associati"
        description="Una rete di partner di eccellenza che ti offre condizioni dedicate, servizi premium e opportunità riservate agli associati UAI-UTCS."
      />

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
            >
              <div
                className="flex h-32 items-center justify-center p-6"
                style={{ background: p.color }}
              >
                <div className="flex h-full max-h-20 w-full items-center justify-center rounded-xl bg-white px-5 py-3 shadow-sm">
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="max-h-full w-auto max-w-[150px] object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                {p.to ? (
                  <Link
                    to={p.to}
                    className="tap-44 mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Visita il sito <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="tap-44 mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Visita il sito <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
