import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Building2, ShieldCheck, Briefcase, Scale, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/servizi")({
  head: () => ({
    meta: [
      { title: "Servizi – UAI-UTCS" },
      {
        name: "description",
        content:
          "Cinque aree di servizio integrate: Agenzia per il Lavoro, Finanza e Opportunità, Sicurezza e Ambiente, Tecnica, Servizi Sindacali.",
      },
      { property: "og:title", content: "Servizi – UAI-UTCS" },
      {
        property: "og:description",
        content: "Tutti i servizi UAI-UTCS per imprese, autonomi e lavoratori.",
      },
      ogUrl("/servizi"),
    ],
    links: [canonical("/servizi")],
  }),
  component: ServiziPage,
});

const AREAS = [
  {
    id: "agenzia-lavoro",
    icon: Users,
    title: "Area Agenzia per il Lavoro",
    desc: "Servizi per imprese, lavoratori e pubbliche amministrazioni.",
    items: [
      {
        name: "Ricerca e selezione del personale",
        desc: "Troviamo i talenti giusti per la tua azienda: selezione rapida, profili qualificati e candidati pronti all'inserimento. Un servizio professionale che riduce tempi e costi di assunzione.",
      },
      {
        name: "Consulenza su incentivi e agevolazioni per le assunzioni",
        desc: "Guidiamo le aziende nella scelta degli incentivi per assumere: consulenza mirata, verifica dei requisiti e supporto completo per ottenere bonus e agevolazioni in modo rapido e sicuro.",
      },
      {
        name: "Pubblicazione offerte di lavoro su piattaforma ministeriale SIISL",
        desc: "Pubblichiamo le offerte di lavoro sulla piattaforma ministeriale SIISL, garantendo alle aziende il pieno rispetto dell'obbligo normativo previsto dalla Legge 159/2025 e una gestione trasparente delle vacancy.",
      },
      {
        name: "Incrocio domanda–offerta",
        desc: "Favoriamo un incontro rapido tra aziende e candidati: matching mirato, profili qualificati e inserimenti veloci per sostenere davvero la crescita delle imprese.",
      },
      {
        name: "Accoglienza e presa in carico",
        desc: "Accogliamo ogni persona con un servizio dedicato: ascolto, analisi del profilo e presa in carico immediata per attivare un percorso personalizzato verso lavoro, crescita e nuove opportunità.",
      },
      {
        name: "Bilancio competenze e orientamento",
        desc: "Valorizziamo ogni talento con un bilancio competenze mirato e un orientamento personalizzato: scopri punti di forza, obiettivi e opportunità per accelerare il tuo inserimento lavorativo.",
      },
      {
        name: "Supporto alla ricerca attiva del lavoro",
        desc: "Affianchiamo le persone nella ricerca attiva del lavoro con strumenti, strategie e supporto dedicato: CV efficace, candidatura mirata e preparazione ai colloqui per accelerare l'inserimento.",
      },
      {
        // ⚠️ DESCRIZIONE SCRITTA DA CLAUDE — DA RIVEDERE E MODIFICARE
        name: "Attivazione tirocini extracurriculari",
        desc: "Attiviamo tirocini extracurriculari come ponte concreto tra formazione e lavoro: definizione del progetto formativo individuale, abbinamento con l'azienda ospitante, gestione di convenzioni e adempimenti e monitoraggio del percorso fino al possibile inserimento.",
      },
      {
        name: "Tirocini per cittadini extra UE",
        desc: "Autorizzati dal Ministero del Lavoro, attiviamo tirocini per cittadini extra UE garantendo procedure sicure, percorsi formativi qualificati e inserimenti mirati nelle aziende. Il servizio comprende convenzioni ministeriali, nulla osta, piani formativi, gestione documentale, indennizzo mensile per il tirocinante e una tantum per l'azienda ospitante.",
      },
      {
        name: "Politiche attive del lavoro",
        desc: "Accreditati presso Regioni, Ministero del Lavoro e Fondo Conoscenza, attiviamo e gestiamo le Politiche del Lavoro con percorsi personalizzati, orientamento, formazione e inserimenti mirati nelle aziende.",
      },
      {
        name: "Programmi di inserimento e reinserimento lavorativo",
        desc: "Accreditati presso Regioni, Ministero del Lavoro e Fondo Conoscenza, realizziamo programmi di inserimento e reinserimento lavorativo con percorsi personalizzati attuati tramite il Fondo per inserimenti mirati nelle aziende.",
      },
      {
        name: "Autoimpiego",
        desc: "Supportiamo l'autoimpiego con orientamento specialistico, definizione dell'idea imprenditoriale e business plan. Grazie all'Ente Nazionale per il Microcredito e all'Ente di formazione EFESTO, i beneficiari accedono alla formazione gratuita erogata interamente in FAD sincrona, propedeutica per avviare la propria attività.",
      },
      {
        name: "Tutoraggio e monitoraggio percorsi formativi",
        desc: "Garantiamo tutoraggio e monitoraggio costante dei percorsi formativi, assicurando supporto continuo ai partecipanti, verifica delle attività, qualità didattica e corretta realizzazione dei progetti nelle aziende associate.",
      },
      {
        name: "Servizi amministrativi e contrattuali",
        desc: "Supportiamo le aziende nella gestione amministrativa e contrattuale dei percorsi formativi: predisposizione di progetti e convenzioni, verifica della documentazione, adempimenti normativi, monitoraggio delle scadenze e corretta applicazione delle procedure previste dalla normativa vigente.",
      },
    ],
  },
  {
    id: "finanza",
    icon: Building2,
    title: "Area Finanza e Opportunità",
    desc: "Bandi, agevolazioni e incentivi per chi vuole avviare o sviluppare la propria attività.",
    items: [
      {
        name: "Servizi alle PMI",
        desc: "Consulenza strategica e operativa dedicata alle Piccole e Medie Imprese per ottimizzare la gestione aziendale, pianificare la crescita e cogliere le migliori opportunità di sviluppo sul mercato.",
      },
      {
        name: "Finanziamenti e agevolazioni",
        desc: "Selezione e accesso a linee di credito agevolate, fondi perduti e incentivi finanziari per sostenere i tuoi investimenti commerciali, l'innovazione tecnologica e la liquidità aziendale.",
      },
      {
        name: "Contributi Leggi Regionali",
        desc: "Monitoraggio e gestione dei bandi promossi dalla Regione, volti a finanziare progetti locali di digitalizzazione, sostenibilità e potenziamento delle attività produttive del territorio.",
      },
      {
        name: "Microimpresa / Lavoro Autonomo",
        desc: "Soluzioni di microcredito e strumenti di finanza agevolata pensati appositamente per supportare i professionisti, i lavoratori autonomi e le piccolissime realtà commerciali nella fase di avvio o consolidamento.",
      },
      {
        name: "Creazione piccole imprese",
        desc: "Accompagnamento completo per aspiranti imprenditori nella nascita di nuove attività: dalla stesura del business plan fino all'individuazione dei bandi di startup e dei finanziamenti iniziali.",
      },
      {
        name: "Incentivi assunzioni giovani",
        desc: "Guida all'utilizzo degli sgravi contributivi e dei bonus occupazionali previsti per l'inserimento di giovani talenti in azienda, riducendo sensibilmente il costo del lavoro.",
      },
      {
        name: "Imprenditoria femminile",
        desc: "Agevolazioni e tassi dedicati per sostenere l'avvio, lo sviluppo e il consolidamento di imprese a conduzione o prevalenza femminile, promuovendo l'innovazione e l'inclusione nel tessuto produttivo.",
      },
      {
        name: "Artigianato, turismo, industria, commercio",
        desc: "Interventi di finanza mirati e bandi specifici per i settori chiave dell'economia, volti a modernizzare le strutture, riqualificare i servizi turistici e potenziare le attività commerciali e industriali.",
      },
    ],
  },
  {
    id: "sicurezza",
    icon: ShieldCheck,
    title: "Area Sicurezza e Ambiente",
    desc: "Corsi di formazione obbligatoria e consulenza per la sicurezza sui luoghi di lavoro.",
    items: [
      {
        name: "R.S.P.P. (Moduli A-B-C)",
        desc: "Corsi di formazione obbligatoria e aggiornamenti per Responsabili del Servizio di Prevenzione e Protezione, strutturati per fornire le competenze normative, gestionali e operative necessarie.",
      },
      {
        name: "Primo Soccorso",
        desc: "Corsi teorico-pratici per addetti alle emergenze di primo soccorso aziendale, conformi alle normative vigenti, per formare il personale a gestire tempestivamente le situazioni di criticità.",
      },
      {
        name: "Antincendio",
        desc: "Percorsi formativi specifici per addetti alla prevenzione incendi e alla gestione delle emergenze, calibrati in base al livello di rischio dell'azienda (basso, medio o alto).",
      },
      {
        name: "R.L.S.",
        desc: "Formazione e aggiornamento periodico per il Rappresentante dei Lavoratori per la Sicurezza, focalizzati sulla consultazione, sul controllo e sulla gestione dei rischi aziendali.",
      },
      {
        name: "Formazione e Informazione",
        desc: "Programmi didattici obbligatori sulla sicurezza sul lavoro rivolti a tutti i dipendenti, finalizzati a diffondere la cultura della prevenzione e la conoscenza dei rischi specifici.",
      },
      {
        name: "Ponteggi",
        desc: "Corsi abilitanti all'uso, montaggio, smontaggio e trasformazione di ponteggi (P.i.M.U.S.), garantendo la massima sicurezza nei lavori in quota e nei cantieri edili.",
      },
      {
        name: "Pacchetto Igiene (HACCP)",
        desc: "Consulenza e corsi di formazione per il settore alimentare, indispensabili per garantire il rispetto delle norme igienico-sanitarie e la corretta gestione dei punti critici di controllo.",
      },
      {
        name: "P.O.S.",
        desc: "Redazione del Piano Operativo di Sicurezza personalizzato per i cantieri edili, documento fondamentale per descrivere le misure di prevenzione da adottare nelle attività lavorative.",
      },
      {
        name: "Medico competente",
        desc: "Servizio completo di sorveglianza sanitaria aziendale, nomina del medico del lavoro, visite mediche periodiche e gestione dell'idoneità lavorativa dei dipendenti.",
      },
      {
        name: "Smaltimento rifiuti speciali (MUD)",
        desc: "Consulenza per la corretta gestione dei rifiuti aziendali, tenuta dei registri di carico/scarico e compilazione del Modello Unico di Dichiarazione Ambientale (MUD).",
      },
      {
        name: "Valutazione rischi (rumore, ecc.)",
        desc: "Misurazioni tecniche strumentali e stesura del Documento di Valutazione dei Rischi (DVR) per agenti fisici e chimici come rumore, vibrazioni e rischi ergonomici.",
      },
      {
        name: "Verifica dispositivi messa a terra",
        desc: "Assistenza tecnica e gestione delle verifiche periodiche obbligatorie sui dispositivi di messa a terra e sugli impianti elettrici nei luoghi di lavoro (D.P.R. 462/01).",
      },
    ],
  },
  {
    id: "tecnica",
    icon: Briefcase,
    title: "Area Tecnica",
    desc: "Servizi digitali e certificazioni per la conformità della tua impresa.",
    items: [
      {
        name: "Rilascio firma digitale / SPID / PEC",
        desc: "Attivazione rapida degli strumenti digitali obbligatori per professionisti e imprese, garantendo un'identità sicura, firma elettronica a valore legale e canali di comunicazione certificati.",
      },
      {
        name: "Certificazione di qualità ISO 9000-14000",
        desc: "Consulenza specialistica per l'ottenimento delle certificazioni internazionali volte a ottimizzare i processi di gestione della qualità (ISO 9001) e a garantire la sostenibilità ambientale (ISO 14001).",
      },
      {
        name: "Adeguamento Privacy (GDPR)",
        desc: "Implementazione e aggiornamento delle procedure aziendali in conformità al Regolamento Europeo sulla protezione dei dati, riducendo i rischi di sanzioni e proteggendo la privacy di clienti e dipendenti.",
      },
    ],
  },
  {
    id: "sindacali",
    icon: Scale,
    title: "Area Servizi Sindacali",
    desc: "Tutela legale e contrattuale per imprese e lavoratori.",
    items: [
      {
        name: "CCNL",
        desc: "Consulenza dedicata sull'interpretazione e sulla corretta applicazione dei Contratti Collettivi Nazionali di Lavoro, per garantire la conformità normativa e l'allineamento dei livelli retributivi.",
      },
      {
        name: "Assistenza legale",
        desc: "Tutela e consulenza legale, sia stragiudiziale che giudiziale, in ambito civile, societario e del lavoro per risolvere controversie e proteggere gli interessi della tua attività o personali.",
      },
      {
        name: "Contenziosi bancari",
        desc: "Analisi tecnica e supporto legale nella gestione delle controversie contro istituti di credito, verificando la trasparenza contrattuale, tassi usurari, anatocismo o anomalie finanziarie.",
      },
      {
        name: "Cancellazioni / riabilitazioni protesti",
        desc: "Assistenza burocratica e legale nelle procedure volte alla cancellazione del proprio nome dal registro informatico dei protesti, ripristinando la piena affidabilità e reputazione creditizia.",
      },
      {
        name: "Conciliazioni in sede sindacale per controversie di lavoro",
        desc: "Gestione e mediazione delle controversie tra datori di lavoro e dipendenti in sedi protette, finalizzate a raggiungere accordi transattivi bonari e legalmente vincolanti per entrambe le parti.",
      },
    ],
  },
];

function ServiziPage() {
  return (
    <>
      <PageHero
        eyebrow="Servizi"
        title="Cinque aree, un unico interlocutore"
        description="Tutti i servizi UAI-UTCS pensati per accompagnare la tua impresa in ogni fase: dal lavoro alla sicurezza, dalla finanza ai servizi sindacali."
      >
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80 hover:border-primary hover:text-primary transition-colors"
            >
              {a.title}
            </a>
          ))}
        </div>
      </PageHero>

      <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8 space-y-16">
        {AREAS.map((area) => (
          <section key={area.id} id={area.id} className="scroll-mt-24">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors duration-300 hover:bg-primary hover:text-primary-foreground">
                <area.icon className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold lg:text-3xl">{area.title}</h2>
                <p className="mt-2 text-muted-foreground leading-relaxed">{area.desc}</p>
              </div>
            </div>

            <Accordion type="single" collapsible className="mt-6">
              {area.items.map((it, j) => (
                <AccordionItem key={it.name} value={`${area.id}-${j}`}>
                  <AccordionTrigger className="text-left text-base font-medium text-foreground">
                    {it.name}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {it.desc}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <section className="rounded-3xl border border-border bg-surface p-10 lg:p-16 text-center">
          <h2 className="text-headline font-bold">Pronto a iniziare?</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Registrati per diventare associato o contattaci per una consulenza gratuita.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/registrati">Registrati ora</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contatti">
                Richiedi info <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
