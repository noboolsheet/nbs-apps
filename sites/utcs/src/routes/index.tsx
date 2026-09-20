import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/Reveal";
import { ContactMap } from "@/components/site/ContactMap";
import { SITE } from "@/lib/site";
import { canonical, ogUrl, ldJson, faqPageSchema } from "@/lib/seo";
import {
  ArrowRight,
  Briefcase,
  Building2,
  ShieldCheck,
  GraduationCap,
  Users,
  Scale,
  MapPin,
  Clock,
  Phone,
  Mail,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UAI-UTCS – Associazione per Turismo, Commercio e Servizi" },
      {
        name: "description",
        content:
          "UAI-UTCS è l'associazione nazionale italiana che supporta imprese, autonomi e lavoratori del turismo, commercio e servizi con servizi sindacali, CAF, Patronato, APL e formazione.",
      },
      { property: "og:title", content: "UAI-UTCS – Associazione per Turismo, Commercio e Servizi" },
      {
        property: "og:description",
        content: "Sindacato patronale e dei lavoratori al fianco delle PMI italiane.",
      },
      ogUrl("/"),
      // FAQPage: expone le domande frequenti come datos estructurados.
      ldJson(faqPageSchema(FAQS)),
    ],
    links: [canonical("/")],
  }),
  component: Index,
});

const SLIDES = [
  {
    img: "/images/hero-1.webp",
    eyebrow: "Associazione Nazionale",
    title: "Al fianco delle imprese italiane",
    subtitle:
      "Da oltre 30 anni rappresentiamo le PMI di turismo, commercio e servizi con competenza e visione.",
  },
  {
    img: "/images/hero-2.webp",
    eyebrow: "Radici nei territori",
    title: "Una rete capillare in tutta Italia",
    subtitle:
      "Dalla sede nazionale ai presìdi locali: servizi vicini al tuo business, ovunque tu sia.",
  },
  {
    img: "/images/hero-3.webp",
    eyebrow: "Il tuo successo, la nostra missione",
    title: "Servizi su misura per il tuo settore",
    subtitle:
      "CAF, Patronato, APL, formazione, consulenza creditizia: un partner completo per la tua impresa.",
  },
];

const SERVICE_AREAS = [
  {
    icon: Users,
    title: "Area Agenzia per il Lavoro",
    desc: "Ricerca e selezione del personale, incentivi alle assunzioni, tirocini e politiche attive del lavoro.",
    to: "/servizi",
  },
  {
    icon: Building2,
    title: "Finanza e Opportunità",
    desc: "Agevolazioni, contributi regionali, incentivi per giovani e imprenditoria femminile.",
    to: "/servizi",
  },
  {
    icon: ShieldCheck,
    title: "Sicurezza e Ambiente",
    desc: "Corsi RSPP, primo soccorso, antincendio, HACCP, valutazione rischi.",
    to: "/servizi",
  },
  {
    icon: Briefcase,
    title: "Area Tecnica",
    desc: "Firma digitale, SPID, PEC, certificazioni ISO e adeguamento GDPR.",
    to: "/servizi",
  },
  {
    icon: Scale,
    title: "Servizi Sindacali",
    desc: "CCNL, assistenza legale, contenziosi bancari, conciliazioni sindacali.",
    to: "/servizi",
  },
  {
    icon: GraduationCap,
    title: "Formazione",
    desc: "E-learning, formazione aziendale finanziata e corsi in FAD.",
    to: "/formazione",
  },
];

// The two areas that lead the section — rappresentanza sindacale and agenzia per il lavoro,
// the strongest reasons a PMI associates with UAI-UTCS.
const FEATURED_AREAS = new Set(["Servizi Sindacali", "Area Agenzia per il Lavoro"]);

const PARTNERS = [
  {
    name: "Workservice",
    logo: "/images/logo-workservice.png",
    desc: "La soluzione HR high-tech d'élite per paghe premium e servizi digitali ideali per aziende e commercialisti.",
    // Sito dedicato non ancora disponibile: rimanda temporaneamente alla Home.
    to: "/",
  },
  {
    name: "Fondo Conoscenza",
    logo: "/images/logo_fondo_conoscenza.png",
    desc: "Fondo interprofessionale per la formazione continua finanziata dei lavoratori.",
    href: "https://www.fondoconoscenza.it",
  },
  {
    name: "Efesto",
    logo: "/images/logo-efesto.png",
    desc: "L'ente di formazione che trasforma il potenziale in risultati: corsi rapidi, certificati e pensati per far crescere persone e aziende.",
    href: "https://example.com",
  },
];

const FAQS = [
  {
    q: "Chi può associarsi?",
    a: "Possono associarsi piccole e medie imprese, imprenditori, professionisti, lavoratori autonomi e pensionati attivi nei settori del turismo, commercio e servizi su tutto il territorio nazionale italiano. L'adesione dà accesso ai servizi sindacali, all'assistenza e alle convenzioni riservate agli associati.",
  },
  {
    q: "Chi può richiedere e utilizzare i vostri servizi?",
    a: "I servizi di CAF e Patronato sono aperti a tutti i cittadini (dipendenti, pensionati, autonomi) per pratiche fiscali e previdenziali. I servizi alle imprese — area credito, finanza agevolata, sicurezza, area tecnica e assistenza sindacale — sono pensati per aziende, professionisti e associati. Per molti servizi non è necessario essere già associati: contattaci e ti indichiamo il percorso più adatto.",
  },
  {
    q: "Che tipi di formazione offrite, quanto costa e dove è accreditata?",
    a: "Offriamo formazione in modalità e-learning, FAD e corsi in aula: sicurezza sul lavoro (RSPP, primo soccorso, antincendio, HACCP), aggiornamento professionale e percorsi aziendali su misura. Molti corsi sono finanziati — ad esempio tramite il Fondo Conoscenza e altri canali pubblici — quindi a costo ridotto o nullo per l'azienda; per i corsi a pagamento il costo varia in base alla tipologia e alla durata. La nostra formazione è erogata nell'ambito degli accreditamenti presso il Ministero del Lavoro e la Regione. (Per costi e accreditamenti specifici contattaci.)",
  },
  {
    q: "Chi può candidarsi alla formazione?",
    a: "Possono candidarsi lavoratori dipendenti, disoccupati e persone in cerca di occupazione, imprese che vogliono formare il proprio personale e privati interessati all'aggiornamento professionale. I requisiti dipendono dal singolo corso o bando: ti aiutiamo a verificare i criteri di ammissione e le eventuali coperture finanziarie.",
  },
  {
    q: "Cosa significa aprire una APL e perché potrebbe interessarmi?",
    a: "Aprire una APL significa attivare uno sportello di Agenzia per il Lavoro accreditato: un servizio che si occupa di intermediazione tra domanda e offerta di lavoro, tirocini formativi, orientamento e inserimento lavorativo. Per un imprenditore o un professionista è un'opportunità di business e un servizio concreto per il territorio. Con UAI-UTCS hai supporto, accreditamento e know-how per avviarlo; scopri come nella pagina Agenzia per il Lavoro.",
  },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function Index() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const autoplay = !interacting && !reducedMotion;

  // Track the active slide for the indicators.
  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Auto-advance — suspended under reduced-motion, manual pause, or pointer/keyboard interaction.
  useEffect(() => {
    if (!api || !autoplay) return;
    const id = setInterval(() => api.scrollNext(), 6000);
    return () => clearInterval(id);
  }, [api, autoplay]);

  return (
    <>
      {/* HERO CAROUSEL */}
      <section className="relative">
        <div
          className="relative"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setInteracting(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setInteracting(false);
          }}
          onFocusCapture={() => setInteracting(true)}
          onBlurCapture={() => setInteracting(false)}
        >
          <Carousel setApi={setApi} opts={{ loop: true, align: "start" }} className="w-full">
            <CarouselContent>
              {SLIDES.map((s, i) => {
                // Only the active slide's title is the page <h1>; the rest are
                // styled <p> so there's exactly one h1 at any time. Inactive slides
                // (no focusable content) are hidden from assistive tech.
                const active = i === current;
                const Heading = active ? "h1" : "p";
                return (
                  <CarouselItem key={i} aria-hidden={active ? undefined : true}>
                    <div className="relative h-[80vh] min-h-[560px] w-full overflow-hidden">
                      <img
                        src={s.img}
                        alt=""
                        width={1920}
                        height={1080}
                        className="absolute inset-0 h-full w-full object-cover"
                        {...(i === 0
                          ? { fetchPriority: "high" as const }
                          : { loading: "lazy" as const })}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/55 to-foreground/10" />
                      <div className="relative mx-auto flex h-full max-w-7xl items-center px-4 lg:px-8">
                        <div className="max-w-2xl text-background">
                          <div className="inline-flex items-center gap-2 rounded-full bg-background/10 backdrop-blur-md px-3 py-1 text-xs font-medium uppercase tracking-widest text-background/90 border border-background/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            {s.eyebrow}
                          </div>
                          <Heading className="mt-5 font-display text-display font-bold text-balance">
                            {s.title}
                          </Heading>
                          <p className="mt-5 text-base text-background/85 lg:text-xl max-w-xl">
                            {s.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                aria-label="Slide precedente"
                className="mr-1 flex h-9 w-9 items-center justify-center rounded-full bg-background/20 text-background backdrop-blur-md transition-colors hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => api?.scrollTo(i)}
                  aria-label={`Vai alla slide ${i + 1}`}
                  aria-current={current === i ? "true" : undefined}
                  className="group flex h-11 items-center px-1 focus-visible:outline-none"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all group-focus-visible:ring-2 group-focus-visible:ring-background/70 ${
                      current === i
                        ? "w-10 bg-background"
                        : "w-4 bg-background/40 group-hover:bg-background/60"
                    }`}
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                aria-label="Slide successiva"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-background/20 text-background backdrop-blur-md transition-colors hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </Carousel>

          {/* Static CTA overlay — does not move with the carousel */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="relative mx-auto h-full max-w-7xl px-4 lg:px-8">
              <Reveal
                as="div"
                stagger
                className="pointer-events-auto absolute bottom-24 left-4 right-4 lg:left-8 lg:right-auto flex flex-wrap gap-3"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-background text-foreground hover:bg-background/90 shadow-[var(--shadow-elegant)]"
                >
                  <Link to="/registrati">
                    Diventa associato <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-background/60 bg-background/10 backdrop-blur-md text-background hover:bg-background/20 hover:text-background"
                >
                  <Link to="/servizi">Scopri i servizi</Link>
                </Button>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* CHI SIAMO EXTRACT */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-headline font-bold text-foreground text-balance">
              Una storia di rappresentanza, dal 1990 ad oggi
            </h2>
            <p className="mt-5 text-muted-foreground lg:text-lg leading-relaxed text-pretty">
              UAI-UTCS nasce all'interno dell'ecosistema{" "}
              <strong className="text-foreground">UAI (Unione Artigiani Italiani)</strong>,
              Confederazione fondata a Roma nel 1990. Nel 2016, UAI-UTCS si consolida come la voce
              nazionale di riferimento per le imprese del turismo, del commercio e dei servizi,
              ottenendo i prestigiosi accreditamenti da parte del Ministero del Lavoro.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Accreditata Ministero del Lavoro",
                "Sede nazionale CAF e Patronato",
                "Agenzia per il Lavoro (APL) operativa",
                "Rete di partner certificati",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/chi-siamo">
                  Scopri la nostra storia <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <Reveal as="div" stagger className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
                  <div className="font-display text-4xl font-bold text-primary">1990</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    Fondazione UAI
                  </div>
                  <p className="mt-3 text-sm text-foreground/80">
                    Nasce a Roma la Confederazione matrice.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
                  <div className="font-display text-4xl font-bold text-accent">2005</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    Accreditamento
                  </div>
                  <p className="mt-3 text-sm text-foreground/80">
                    CAF, Patronato e APL diventano operativi.
                  </p>
                </div>
              </div>
              <div className="pt-12">
                <div
                  className="rounded-2xl p-6 text-background shadow-[var(--shadow-elegant)]"
                  style={{ background: "var(--gradient-italia)" }}
                >
                  <div className="font-display text-4xl font-bold">2016</div>
                  <div className="mt-1 text-xs uppercase tracking-widest opacity-90">
                    Sede Nazionale
                  </div>
                  <p className="mt-3 text-sm opacity-95">
                    Nasce UAI-UTCS, Unione per il Turismo, Commercio e Servizi.
                  </p>
                </div>
                <div className="mt-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
                  <div className="font-display text-4xl font-bold text-foreground">Oggi</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    In crescita
                  </div>
                  <p className="mt-3 text-sm text-foreground/80">
                    Una rete in continua espansione su tutto il territorio.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SERVIZI */}
      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="text-headline font-bold text-foreground text-balance">
              Un'offerta <span className="text-primary">completa</span> per la tua impresa
            </h2>
            <p className="mt-4 text-muted-foreground lg:text-lg">
              Sei aree operative integrate per accompagnarti in ogni fase del tuo percorso
              imprenditoriale.
            </p>
          </div>

          {/* Flagship areas — larger, lead the section */}
          <Reveal as="div" stagger className="mt-12 grid gap-5 md:grid-cols-2">
            {SERVICE_AREAS.filter((s) => FEATURED_AREAS.has(s.title)).map((s) => (
              <div
                key={s.title}
                className="group flex flex-col rounded-2xl border border-border bg-background p-8 transition-all duration-300 ease-out hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </Reveal>

          {/* Remaining areas — compact */}
          <Reveal as="div" stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_AREAS.filter((s) => !FEATURED_AREAS.has(s.title)).map((s) => (
              <div
                key={s.title}
                className="group flex flex-col rounded-2xl border border-border bg-background p-5 transition-all duration-300 ease-out hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </Reveal>

          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link to="/servizi">
                Scopri tutti i nostri servizi <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* PARTNER */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
        <div className="text-center">
          <h2 className="text-headline font-bold text-foreground text-balance">
            I partner ufficiali della rete UAI-UTCS
          </h2>
          <p className="mt-3 mx-auto max-w-xl text-muted-foreground">
            Collaboriamo con le più importanti realtà italiane per offrire servizi e convenzioni
            esclusive ai nostri associati.
          </p>
        </div>

        <Reveal as="div" stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {PARTNERS.map((p) => {
            const cardClass =
              "group flex flex-col rounded-2xl border border-border bg-surface p-7 transition-all duration-300 ease-out hover:border-primary/40 hover:bg-background hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
            const inner = (
              <>
                <div className="mb-5 flex h-14 items-center">
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="max-h-14 w-auto max-w-[160px] object-contain"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">{p.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                  {p.desc}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Visita il sito{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </>
            );
            return "to" in p ? (
              <Link key={p.name} to={p.to} className={cardClass}>
                {inner}
              </Link>
            ) : (
              <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className={cardClass}>
                {inner}
              </a>
            );
          })}
        </Reveal>
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link to="/convenzioni">
              Tutte le convenzioni <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* CONTATTI RAPIDI */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-headline font-bold text-balance">Vieni a trovarci</h2>
              <p className="mt-4 text-background/70 lg:text-lg">
                I nostri uffici sono aperti per accoglierti e fornirti consulenza dedicata.
              </p>
              <div className="mt-8 space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background/10">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-widest text-background/70">Sede</div>
                    <div className="font-medium">{SITE.address.full}</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background/10">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-widest text-background/70">
                      Orari
                    </div>
                    <div className="font-medium">{SITE.hoursLine}</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background/10">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-widest text-background/70">
                      Telefono
                    </div>
                    <a href={SITE.phone.href} className="font-medium hover:underline">
                      {SITE.phone.display}
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background/10">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-widest text-background/70">
                      Email
                    </div>
                    <a href={SITE.emailHref} className="font-medium hover:underline">
                      {SITE.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <ContactMap />
          </div>
        </div>
      </section>

      {/* CTA CERCHI LAVORO */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div
          className="overflow-hidden rounded-3xl p-10 lg:p-16 text-background relative"
          style={{ background: "var(--gradient-italia)" }}
        >
          <div
            className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-background/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl">
            <h2 className="text-headline font-bold">Stai cercando lavoro?</h2>
            <p className="mt-4 text-background/90 text-lg">
              Lasciaci il tuo curriculum e troveremo la posizione perfetta per te: i nostri consulenti valuteranno il tuo profilo per le opportunità della nostra rete Nazionale.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/notizie" hash="candidatura">
                Invia il tuo curriculum <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-20 lg:px-8 lg:py-28">
        <div className="text-center">
          <h2 className="text-headline font-bold text-foreground text-balance">
            Domande frequenti
          </h2>
          <p className="mt-3 text-muted-foreground">
            Le risposte ai dubbi più comuni dei nostri associati.
          </p>
        </div>
        <Accordion type="single" collapsible className="mt-12 space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border bg-background px-5 data-[state=open]:shadow-[var(--shadow-soft)]"
            >
              <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed text-pretty">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA FINALE */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-italia)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-foreground/30" aria-hidden="true" />
        <Reveal
          as="div"
          stagger
          className="relative mx-auto max-w-5xl px-4 py-20 lg:px-8 lg:py-28 text-center text-background"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur-md px-3 py-1 text-xs font-medium uppercase tracking-widest border border-background/30">
            Unisciti a noi
          </div>
          <h2 className="mt-5 font-display text-headline font-bold text-balance">
            Pronto a far parte di UAI-UTCS?
          </h2>
          <p className="mt-5 mx-auto max-w-2xl text-background/90 lg:text-lg text-pretty">
            Diventa associato per accedere a tutti i servizi sindacali, CAF, Patronato, APL,
            formazione e convenzioni esclusive. Oppure contattaci per una consulenza dedicata.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/registrati">
                Diventa associato <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background/60 bg-background/10 backdrop-blur-md text-background hover:bg-background/20 hover:text-background"
            >
              <Link to="/contatti">Contattaci</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
